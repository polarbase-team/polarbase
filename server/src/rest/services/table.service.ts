import pg from '../../plugins/pg';
import { getTableList, getTableSchema } from '../utils/table';
import {
  addLengthCheck,
  addSizeCheck,
  addRangeCheck,
  specificType,
  DataType,
  Column,
  removeLengthCheck,
  removeRangeCheck,
  removeSizeCheck,
  getConstraintName,
} from '../utils/column';

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
    autoAddingPrimaryKey = true,
    timestamps = true,
  }: {
    schemaName?: string;
    tableName: string;
    tableComment?: string;
    autoAddingPrimaryKey?: boolean;
    timestamps?: boolean;
  }) {
    const fullTableName = `${schemaName}.${tableName}`;
    const schemaBuilder = pg.schema.withSchema(schemaName);

    const exists = await schemaBuilder.hasTable(tableName);
    if (exists) {
      throw new Error(`Table ${fullTableName} already exists`);
    }

    await schemaBuilder.createTable(tableName, (table) => {
      if (autoAddingPrimaryKey) table.increments('id').primary();

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
    const schemaBuilder = pg.schema.withSchema(schemaName);

    const exists = await schemaBuilder.hasTable(tableName);
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
      await pg.schema
        .withSchema(schemaName)
        .alterTable(finalTableName, (table) => {
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
    const schemaBuilder = pg.schema.withSchema(schemaName);

    const exists = await schemaBuilder.hasTable(tableName);
    if (!exists) {
      throw new Error(`Table ${fullTableName} not found`);
    }

    if (cascade) {
      await pg.raw(
        `DROP TABLE IF EXISTS "${schemaName}"."${tableName}" CASCADE;`
      );
    } else {
      await schemaBuilder.dropTable(tableName);
    }

    return { message: `Table ${fullTableName} deleted successfully` };
  }

  async createColumn({
    schemaName = 'public',
    tableName,
    column,
  }: {
    schemaName?: string;
    tableName: string;
    column: {
      name: string;
      dataType: DataType;
      nullable?: boolean | null;
      unique?: boolean | null;
      defaultValue?: any | null;
      comment?: string | null;
      options?: string[] | null;
      validation?: {
        minLength?: number | null;
        maxLength?: number | null;
        minValue?: number | string | null;
        maxValue?: number | string | null;
        maxSize?: number | null;
      } | null;
    };
  }) {
    const {
      name,
      dataType,
      nullable,
      unique,
      defaultValue,
      comment,
      options,
      validation,
    } = column;
    const { minLength, maxLength, minValue, maxValue, maxSize } =
      validation || {};

    const fullTableName = `"${schemaName}"."${tableName}"`;
    const schemaBuilder = pg.schema.withSchema(schemaName);

    const tableExists = await pg.schema
      .withSchema(schemaName)
      .hasTable(tableName);
    if (!tableExists) throw new Error(`Table ${fullTableName} not found`);

    const columnExists = await pg.schema
      .withSchema(schemaName)
      .hasColumn(tableName, name);
    if (columnExists)
      throw new Error(`Column "${name}" already exists in ${fullTableName}`);

    try {
      await schemaBuilder.alterTable(tableName, (tableBuilder) => {
        const columnBuilder = specificType(tableBuilder, {
          name,
          dataType,
          options,
        });

        if (nullable) columnBuilder.nullable();
        if (unique) columnBuilder.unique();
        if (defaultValue !== undefined && defaultValue !== null)
          columnBuilder.defaultTo(defaultValue);
        if (comment) columnBuilder.comment(comment);

        addLengthCheck(tableBuilder, tableName, name, minLength!, maxLength!);
        addRangeCheck(tableBuilder, tableName, name, minValue!, maxValue!);
        addSizeCheck(tableBuilder, tableName, name, maxSize!);
      });
    } catch (error) {
      // Drop column
      await pg.raw(`ALTER TABLE ?? DROP COLUMN IF EXISTS ??`, [
        tableName,
        name,
      ]);

      throw error;
    }

    return (await getTableSchema(pg, schemaName, tableName, name))[0];
  }

  async updateColumn({
    schemaName = 'public',
    tableName,
    columnName,
    column,
  }: {
    schemaName?: string;
    tableName: string;
    columnName: string;
    column: {
      name: string;
      dataType: DataType;
      nullable: boolean | null;
      unique: boolean | null;
      defaultValue: any | null;
      comment: string | null;
      options: string[] | null;
      validation: {
        minLength?: number | null;
        maxLength?: number | null;
        minValue?: number | string | null;
        maxValue?: number | string | null;
        maxSize?: number | null;
      } | null;
    };
  }) {
    const {
      name: newName,
      dataType,
      nullable,
      unique,
      defaultValue,
      comment,
      options,
      validation,
    } = column;
    const { minLength, maxLength, minValue, maxValue, maxSize } =
      validation || {};

    const fullTableName = `"${schemaName}"."${tableName}"`;

    const tableExists = await pg.schema
      .withSchema(schemaName)
      .hasTable(tableName);
    if (!tableExists) throw new Error(`Table ${fullTableName} not found`);

    const columnExists = await pg.schema
      .withSchema(schemaName)
      .hasColumn(tableName, columnName);
    if (!columnExists)
      throw new Error(`Column "${columnName}" not found in ${fullTableName}`);

    const [oldSchema] = (await getTableSchema(
      pg,
      schemaName,
      tableName,
      columnName
    )) as Column[];

    let recreateConstraints = false;

    await pg.schema
      .withSchema(schemaName)
      .alterTable(tableName, (tableBuilder) => {
        const columnBuilder = specificType(tableBuilder, {
          name: columnName,
          dataType: dataType || oldSchema!.dataType,
          options,
        } as any).alter();

        if (newName !== oldSchema!.name) {
          tableBuilder.renameColumn(columnName, newName);
          recreateConstraints = true;
        }

        if (nullable !== oldSchema!.nullable) {
          if (nullable === true) columnBuilder.nullable();
          else if (nullable === false) columnBuilder.notNullable();
        }

        if (unique !== oldSchema!.unique) {
          if (unique === true) columnBuilder.unique();
          else if (unique === false) tableBuilder.dropUnique([columnName]);
        }

        if (defaultValue !== oldSchema!.defaultValue) {
          columnBuilder.defaultTo(defaultValue);
        }

        if (comment !== oldSchema!.comment) {
          columnBuilder.comment(comment || '');
        }

        if (
          recreateConstraints ||
          minLength !== oldSchema!.validation!.minLength ||
          maxLength !== oldSchema!.validation!.maxLength
        ) {
          if (!recreateConstraints)
            removeLengthCheck(tableBuilder, tableName, columnName);

          addLengthCheck(
            tableBuilder,
            tableName,
            newName,
            minLength!,
            maxLength!
          );
        }

        if (
          recreateConstraints ||
          minValue !== oldSchema!.validation!.minValue ||
          maxValue !== oldSchema!.validation!.maxValue
        ) {
          if (!recreateConstraints)
            removeRangeCheck(tableBuilder, tableName, columnName);

          addRangeCheck(tableBuilder, tableName, newName, minValue!, maxValue!);
        }

        if (recreateConstraints || maxSize !== oldSchema!.validation!.maxSize) {
          if (!recreateConstraints)
            removeSizeCheck(tableBuilder, tableName, columnName);

          addSizeCheck(tableBuilder, tableName, newName, maxSize!);
        }
      })
      .then(() => {
        if (recreateConstraints) {
          return pg.raw(
            `
            ALTER TABLE public."${tableName}"
            DROP CONSTRAINT IF EXISTS "${getConstraintName(
              tableName,
              columnName,
              'length'
            )}",
            DROP CONSTRAINT IF EXISTS "${getConstraintName(
              tableName,
              columnName,
              'range'
            )}",
            DROP CONSTRAINT IF EXISTS "${getConstraintName(
              tableName,
              columnName,
              'size'
            )}"
          `
          );
        }
      });

    return (await getTableSchema(pg, schemaName, tableName, newName))[0];
  }
}
