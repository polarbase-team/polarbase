import knex from '../../plugins/db';

/**
 * List of table names that are forbidden to access via this REST API.
 * Configured via environment variable REST_BLACKLISTED_TABLES (comma-separated).
 */
const REST_BLACKLISTED_TABLES = (
  process.env.REST_BLACKLISTED_TABLES || ''
).split(',');

/**
 * Retrieves the list of tables in the public schema (excluding blacklisted ones)
 * along with their comments.
 */
const getTableList = (schemaName = 'pubic') => {
  return knex('pg_class as c')
    .select({
      tableName: 'c.relname',
      tableComment: 'descr.description',
      tableColumnPk: knex.raw(`
        (
          SELECT a.attname
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = c.oid AND i.indisprimary
          LIMIT 1
        )
      `),
    })
    .leftJoin('pg_namespace as ns', 'c.relnamespace', 'ns.oid')
    .leftJoin('pg_description as descr', function () {
      this.on('descr.objoid', 'c.oid').andOn(knex.raw('descr.objsubid = 0'));
    })
    .where({
      'ns.nspname': schemaName,
      'c.relkind': 'r', // r = ordinary table
    })
    .modify((qb) => {
      if (REST_BLACKLISTED_TABLES.length > 0) {
        qb.whereNotIn('c.relname', REST_BLACKLISTED_TABLES);
      }
    })
    .orderBy('c.relname');
};

/**
 * Builds a detailed schema for a given table:
 * - column info
 * - primary key flags
 * - column comments
 * - enum values for enum types
 */
const getTableSchema = async (tableName: string, schemaName = 'public') => {
  // 1. Basic column information
  const columns = await knex('information_schema.columns')
    .select(
      'column_name',
      'data_type',
      'udt_name as raw_type',
      'is_nullable',
      'character_maximum_length as max_length',
      'column_default as default_value',
      'ordinal_position'
    )
    .where({ table_schema: 'public', table_name: tableName })
    .orderBy('ordinal_position');

  // 2. Column comments from pg_description
  const comments = await knex('pg_description')
    .select(
      'pg_description.objsubid as ordinal_position',
      'pg_description.description',
      'information_schema.columns.column_name'
    )
    .join('pg_class', 'pg_description.objoid', 'pg_class.oid')
    .join('pg_namespace', 'pg_class.relnamespace', 'pg_namespace.oid')
    .leftJoin('information_schema.columns', function () {
      this.on('information_schema.columns.table_name', '=', 'pg_class.relname')
        .andOn(
          'information_schema.columns.table_schema',
          '=',
          'pg_namespace.nspname'
        )
        .andOn(
          'information_schema.columns.ordinal_position',
          '=',
          'pg_description.objsubid'
        );
    })
    .where({
      'pg_namespace.nspname': schemaName,
      'pg_class.relname': tableName,
    });

  const commentMap = Object.fromEntries(
    comments
      .map((c: any) => [c.column_name, c.description])
      .filter(([_, desc]) => desc != null)
  );

  // 3. Primary key columns
  const primaryKeys = await knex('information_schema.key_column_usage')
    .select('column_name')
    .join('information_schema.table_constraints', function () {
      this.on(
        'table_constraints.constraint_name',
        '=',
        'key_column_usage.constraint_name'
      )
        .andOn(
          'table_constraints.table_schema',
          '=',
          'key_column_usage.table_schema'
        )
        .andOn(
          'table_constraints.table_name',
          '=',
          'key_column_usage.table_name'
        );
    })
    .where({
      'key_column_usage.table_schema': 'public',
      'key_column_usage.table_name': tableName,
      'table_constraints.constraint_type': 'PRIMARY KEY',
    });

  const primaryKeySet = new Set(primaryKeys.map((pk: any) => pk.column_name));

  // 4. Enum type values
  const enumColumns = await knex('information_schema.columns')
    .select('column_name', 'udt_name')
    .where({ table_schema: 'public', table_name: tableName })
    .whereRaw(`udt_name IN (SELECT typname FROM pg_type WHERE typtype = 'e')`);

  const enumMap: Record<string, string> = {};

  for (const col of enumColumns) {
    const result = await knex('pg_enum')
      .select(
        knex.raw("string_agg(enumlabel, ', ' ORDER BY enumsortorder) as labels")
      )
      .whereRaw(`enumtypid = (SELECT oid FROM pg_type WHERE typname = ?)`, [
        col.udt_name,
      ])
      .first();

    if (result?.labels) {
      enumMap[col.column_name] = result.labels;
    }
  }

  // 5. Fetch foreign key information
  const foreignKeys = await knex('information_schema.key_column_usage as kcu')
    .select(
      'kcu.column_name',
      'tc.table_name as referenced_table_name',
      'ccu.column_name as referenced_column_name'
    )
    .join('information_schema.table_constraints as tc', function () {
      this.on('tc.constraint_name', '=', 'kcu.constraint_name')
        .andOn('tc.table_schema', '=', 'kcu.table_schema')
        .andOn('tc.table_name', '=', 'kcu.table_name');
    })
    .join('information_schema.constraint_column_usage as ccu', function () {
      this.on('ccu.constraint_name', '=', 'tc.constraint_name').andOn(
        'ccu.table_schema',
        '=',
        'tc.table_schema'
      );
    })
    .where({
      'kcu.table_schema': 'public',
      'kcu.table_name': tableName,
      'tc.constraint_type': 'FOREIGN KEY',
    });

  const foreignKeyMap = Object.fromEntries(
    foreignKeys.map((fk: any) => [
      fk.column_name,
      {
        table: fk.referenced_table_name,
        column: fk.referenced_column_name || 'id',
      },
    ])
  );

  // 6. Combine everything into a clean schema object
  return columns.map((col) => ({
    columnName: col.column_name,
    dataType: col.data_type,
    rawType: col.raw_type,
    isPrimary: primaryKeySet.has(col.column_name),
    isNullable: col.is_nullable === 'YES',
    maxLength: col.max_length,
    defaultValue: col.default_value,
    comment: commentMap[col.column_name] ?? null,
    enumValues: enumMap[col.column_name] ?? null,
    foreignKey: foreignKeyMap[col.column_name] || null,
  }));
};

/**
 * Main REST router exposing CRUD + bulk operations for all public tables.
 */
export class TableService {
  async getAll({ schemaName = 'public' }: { schemaName?: string } = {}) {
    const allowedTables = await getTableList(schemaName);
    return allowedTables;
  }

  async getSchema({
    schemaName = 'public',
    tableName,
  }: {
    schemaName?: string;
    tableName: string;
  }) {
    const exists = await knex.schema.hasTable(tableName);
    if (!exists) throw new Error('Table not found');

    const schema = await getTableSchema(tableName, schemaName);
    return schema;
  }

  async createTable({
    schemaName = 'public',
    tableName,
    tableComment,
    columns,
    autoAddingPrimaryKey = true,
    timestamps = true,
  }: {
    schemaName?: string;
    tableName: string;
    tableComment?: string;
    columns?: Array<{
      name: string;
      type: string;
      nullable?: boolean;
      primary?: boolean;
      unique?: boolean;
      default?: any;
      enumValues?: string[];
      comment?: string;
    }>;
    autoAddingPrimaryKey?: boolean;
    timestamps?: boolean;
  }) {
    const fullTableName = `${schemaName}.${tableName}`;

    const exists = await knex.schema.withSchema(schemaName).hasTable(tableName);
    if (exists) {
      throw new Error(`Table ${fullTableName} already exists`);
    }

    await knex.schema.withSchema(schemaName).createTable(tableName, (table) => {
      if (autoAddingPrimaryKey) table.increments('id').primary();

      columns?.forEach((col) => {
        let columnBuilder;

        switch (col.type.toLowerCase()) {
          case 'string':
          case 'varchar':
            columnBuilder = table.string(col.name);
            break;
          case 'text':
            columnBuilder = table.text(col.name);
            break;
          case 'integer':
            columnBuilder = table.integer(col.name);
            break;
          case 'boolean':
            columnBuilder = table.boolean(col.name);
            break;
          case 'timestamp':
            columnBuilder = table.timestamp(col.name);
            break;
          case 'enum':
            if (!col.enumValues?.length) {
              throw new Error(`enumValues is required for column ${col.name}`);
            }
            columnBuilder = table.enum(col.name, col.enumValues);
            break;
          default:
            throw new Error(`Unsupported column type: ${col.type}`);
        }

        if (col.nullable === false) columnBuilder.notNullable();
        if (col.unique) columnBuilder.unique();
        if (col.default !== undefined) columnBuilder.defaultTo(col.default);
        if (col.primary) columnBuilder.primary();
        if (col.comment) columnBuilder.comment(col.comment);
      });

      if (timestamps) {
        table.timestamps();
      }

      if (tableComment) {
        table.comment(tableComment);
      }
    });

    return { message: `Table ${fullTableName} created successfully` };
  }

  async updateTable({
    schemaName = 'public',
    tableName,
    newTableName,
    newTableComment,
  }: {
    schemaName?: string;
    tableName: string;
    newTableName?: string;
    newTableComment?: string;
  }) {
    const fullTableName = `${schemaName}.${tableName}`;

    const exists = await knex.schema.withSchema(schemaName).hasTable(tableName);
    if (!exists) {
      throw new Error(`Table ${fullTableName} not found`);
    }

    let finalTableName = tableName;
    if (newTableName && newTableName !== tableName) {
      const newExists = await knex.schema
        .withSchema(schemaName)
        .hasTable(newTableName);
      if (newExists) {
        throw new Error(`Table ${schemaName}.${newTableName} already exists`);
      }

      await knex.schema
        .withSchema(schemaName)
        .renameTable(tableName, newTableName);
      finalTableName = newTableName;
    }

    if (newTableComment !== undefined) {
      await knex.schema
        .withSchema(schemaName)
        .table(finalTableName, (table) => {
          table.comment(newTableComment);
        });
    }

    return { message: `Table ${fullTableName} updated successfully` };
  }

  async deleteTable({
    schemaName = 'public',
    tableName,
    cascade = false,
  }: {
    schemaName?: string;
    tableName: string;
    cascade?: boolean;
  }) {
    const fullTableName = `${schemaName}.${tableName}`;

    const exists = await knex.schema.withSchema(schemaName).hasTable(tableName);
    if (!exists) {
      throw new Error(`Table ${fullTableName} not found`);
    }

    if (cascade) {
      await knex.raw(
        `DROP TABLE IF EXISTS "${schemaName}"."${tableName}" CASCADE;`
      );
    } else {
      await knex.schema.withSchema(schemaName).dropTable(tableName);
    }

    return { message: `Table ${fullTableName} deleted successfully` };
  }

  async addColumn({
    schemaName = 'public',
    tableName,
    columnName,
    type,
    nullable = true,
    unique = false,
    default: def,
    enumValues,
    comment,
  }: {
    schemaName?: string;
    tableName: string;
    columnName: string;
    type: string;
    nullable?: boolean;
    unique?: boolean;
    default?: any;
    enumValues?: string[];
    comment?: string;
  }) {
    const fullTableName = `${schemaName}.${tableName}`;

    const exists = await knex.schema.withSchema(schemaName).hasTable(tableName);
    if (!exists) {
      throw new Error(`Table ${fullTableName} not found`);
    }

    await knex.schema.withSchema(schemaName).table(tableName, (table) => {
      let columnBuilder;

      switch (type.toLowerCase()) {
        case 'string':
        case 'varchar':
          columnBuilder = table.string(columnName);
          break;
        case 'text':
          columnBuilder = table.text(columnName);
          break;
        case 'integer':
          columnBuilder = table.integer(columnName);
          break;
        case 'boolean':
          columnBuilder = table.boolean(columnName);
          break;
        case 'timestamp':
          columnBuilder = table.timestamp(columnName);
          break;
        case 'enum':
          if (!enumValues?.length) {
            throw new Error(`enumValues is required for column ${columnName}`);
          }
          columnBuilder = table.enum(columnName, enumValues);
          break;
        default:
          throw new Error(`Unsupported column type: ${type}`);
      }

      if (nullable === false) columnBuilder.notNullable();
      if (unique) columnBuilder.unique();
      if (def !== undefined) columnBuilder.defaultTo(def);
      if (comment) columnBuilder.comment(comment);
    });

    return { message: `Column ${columnName} added to ${fullTableName}` };
  }
}
