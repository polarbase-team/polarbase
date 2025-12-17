import pg from '../../plugins/pg';
import { getTableList, getTableSchema } from '../utils/table';
import { DataType } from '../utils/column';

/**
 * List of table names that are forbidden to access via this REST API.
 * Configured via environment variable REST_BLACKLISTED_TABLES (comma-separated).
 */
const REST_BLACKLISTED_TABLES = (
  process.env.REST_BLACKLISTED_TABLES || ''
).split(',');

/**
 * Main REST router exposing CRUD + bulk operations for all public tables.
 */
export class TableService {
  async getAll({ schemaName = 'public' }: { schemaName?: string } = {}) {
    const allowedTables = await getTableList(
      pg,
      schemaName,
      REST_BLACKLISTED_TABLES
    );
    return allowedTables;
  }

  async getSchema({
    schemaName = 'public',
    tableName,
  }: {
    schemaName?: string;
    tableName: string;
  }) {
    const exists = await pg.schema.hasTable(tableName);
    if (!exists) throw new Error('Table not found');

    const schema = await getTableSchema(pg, schemaName, tableName);
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
      options?: string[];
      comment?: string;
    }>;
    autoAddingPrimaryKey?: boolean;
    timestamps?: boolean;
  }) {
    const fullTableName = `${schemaName}.${tableName}`;

    const exists = await pg.schema.withSchema(schemaName).hasTable(tableName);
    if (exists) {
      throw new Error(`Table ${fullTableName} already exists`);
    }

    await pg.schema.withSchema(schemaName).createTable(tableName, (table) => {
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
            if (!col.options?.length) {
              throw new Error(`options is required for column ${col.name}`);
            }
            columnBuilder = table.enum(col.name, col.options);
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
    data,
  }: {
    schemaName?: string;
    tableName: string;
    data: {
      tableName?: string;
      tableComment?: string | null;
    };
  }) {
    const { tableName: newTableName, tableComment: newTableComment } = data;
    const fullTableName = `${schemaName}.${tableName}`;

    const exists = await pg.schema.withSchema(schemaName).hasTable(tableName);
    if (!exists) {
      throw new Error(`Table ${fullTableName} not found`);
    }

    let finalTableName = tableName;
    if (newTableName && newTableName !== tableName) {
      const newExists = await pg.schema
        .withSchema(schemaName)
        .hasTable(newTableName);
      if (newExists) {
        throw new Error(`Table ${schemaName}.${newTableName} already exists`);
      }

      await pg.schema
        .withSchema(schemaName)
        .renameTable(tableName, newTableName);
      finalTableName = newTableName;
    }

    if (newTableComment !== undefined) {
      await pg.schema.withSchema(schemaName).table(finalTableName, (table) => {
        table.comment(newTableComment ?? '');
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

    const exists = await pg.schema.withSchema(schemaName).hasTable(tableName);
    if (!exists) {
      throw new Error(`Table ${fullTableName} not found`);
    }

    if (cascade) {
      await pg.raw(
        `DROP TABLE IF EXISTS "${schemaName}"."${tableName}" CASCADE;`
      );
    } else {
      await pg.schema.withSchema(schemaName).dropTable(tableName);
    }

    return { message: `Table ${fullTableName} deleted successfully` };
  }

  async addColumn({
    schemaName = 'public',
    tableName,
    name,
    type,
    nullable = true,
    unique = false,
    default: def,
    options,
    comment,
  }: {
    schemaName?: string;
    tableName: string;
    name: string;
    type: DataType;
    nullable?: boolean;
    unique?: boolean;
    default?: any;
    options?: string[];
    comment?: string;
  }) {
    const fullTableName = `${schemaName}.${tableName}`;

    const exists = await pg.schema.withSchema(schemaName).hasTable(tableName);
    if (!exists) {
      throw new Error(`Table ${fullTableName} not found`);
    }

    await pg.schema.withSchema(schemaName).table(tableName, (table) => {
      let columnBuilder;

      switch (type.toLowerCase()) {
        case DataType.Text:
          columnBuilder = table.string(name);
          break;
        case DataType.LongText:
          columnBuilder = table.text(name);
          break;
        case DataType.Integer:
          columnBuilder = table.integer(name);
          break;
        case DataType.Checkbox:
          columnBuilder = table.boolean(name);
          break;
        case DataType.Date:
          columnBuilder = table.timestamp(name);
          break;
        case DataType.Select:
          if (!options?.length) {
            throw new Error(`options is required for column ${name}`);
          }
          columnBuilder = table.enum(name, options);
          break;
        case DataType.JSON:
          columnBuilder = table.json(name);
          break;
        default:
          throw new Error(`Unsupported column type: ${type}`);
      }

      if (nullable === false) columnBuilder.notNullable();
      if (unique) columnBuilder.unique();
      if (def !== undefined) columnBuilder.defaultTo(def);
      if (comment) columnBuilder.comment(comment);
    });

    return { message: `Column ${name} added to ${fullTableName}` };
  }
}
