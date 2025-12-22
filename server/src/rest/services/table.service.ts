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
  addDateRangeCheck,
  removeDateRangeCheck,
} from '../utils/column';

/**
 * Main REST router exposing CRUD + bulk operations for all public tables.
 */
export class TableService {
  private blacklistedTables: string[] = [];

  constructor(blacklistedTables?: string[]) {
    if (blacklistedTables) {
      this.blacklistedTables = blacklistedTables;
    }
  }

  async getAll({ schemaName = 'public' }: { schemaName?: string } = {}) {
    const allowedTables = await getTableList(
      pg,
      schemaName,
      this.blacklistedTables
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
    timestamps = true,
  }: {
    schemaName?: string;
    tableName: string;
    tableComment?: string;
    timestamps?: boolean;
  }) {
    const fullTableName = `${schemaName}.${tableName}`;
    const schemaBuilder = pg.schema.withSchema(schemaName);

    const exists = await schemaBuilder.hasTable(tableName);
    if (exists) {
      throw new Error(`Table ${fullTableName} already exists`);
    }

    await schemaBuilder.createTable(tableName, (table) => {
      table.uuid('id').primary().defaultTo(pg.raw('gen_random_uuid()'));

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
        minValue?: number | null;
        maxValue?: number | null;
        minDate?: string | null;
        maxDate?: string | null;
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
    const {
      minLength,
      maxLength,
      minValue,
      maxValue,
      minDate,
      maxDate,
      maxSize,
    } = validation || {};

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
        addDateRangeCheck(tableBuilder, tableName, name, minDate!, maxDate!);
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
        minValue?: number | null;
        maxValue?: number | null;
        minDate?: string | null;
        maxDate?: string | null;
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
    const {
      minLength,
      maxLength,
      minValue,
      maxValue,
      minDate,
      maxDate,
      maxSize,
    } = validation || {};

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
          dataType: dataType || oldSchema.dataType,
          options,
        } as any).alter();

        if (newName !== oldSchema.name) {
          tableBuilder.renameColumn(columnName, newName);
          recreateConstraints = true;
        }

        if (nullable !== oldSchema.nullable) {
          if (nullable === true) columnBuilder.nullable();
          else if (nullable === false) columnBuilder.notNullable();
        }

        if (unique !== oldSchema.unique) {
          if (unique === true) columnBuilder.unique();
          else if (unique === false) tableBuilder.dropUnique([columnName]);
        }

        if (defaultValue !== oldSchema.defaultValue) {
          columnBuilder.defaultTo(defaultValue);
        }

        if (comment !== oldSchema.comment) {
          columnBuilder.comment(comment || '');
        }

        if (
          recreateConstraints ||
          minLength !== oldSchema.validation?.minLength ||
          maxLength !== oldSchema.validation?.maxLength
        ) {
          if (!recreateConstraints) {
            const constraintName = getConstraintName(
              tableName,
              columnName,
              'range'
            );
            if (
              oldSchema.metadata.constraints?.find(
                (c: any) => c.constraint_name === constraintName
              )
            ) {
              removeLengthCheck(tableBuilder, tableName, columnName);
            }
          }

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
          minValue !== oldSchema.validation?.minValue ||
          maxValue !== oldSchema.validation?.maxValue
        ) {
          if (!recreateConstraints) {
            const constraintName = getConstraintName(
              tableName,
              columnName,
              'range'
            );
            if (
              oldSchema.metadata.constraints.find(
                (c: any) => c.constraint_name === constraintName
              )
            ) {
              removeRangeCheck(tableBuilder, tableName, columnName);
            }
          }

          addRangeCheck(tableBuilder, tableName, newName, minValue!, maxValue!);
        }

        if (
          recreateConstraints ||
          minDate !== oldSchema.validation?.minDate ||
          maxDate !== oldSchema.validation?.maxDate
        ) {
          if (!recreateConstraints) {
            const constraintName = getConstraintName(
              tableName,
              columnName,
              'range'
            );
            if (
              oldSchema.metadata.constraints.find(
                (c: any) => c.constraint_name === constraintName
              )
            ) {
              removeDateRangeCheck(tableBuilder, tableName, columnName);
            }
          }

          addDateRangeCheck(
            tableBuilder,
            tableName,
            newName,
            minDate!,
            maxDate!
          );
        }

        if (recreateConstraints || maxSize !== oldSchema.validation?.maxSize) {
          if (!recreateConstraints) {
            const constraintName = getConstraintName(
              tableName,
              columnName,
              'size'
            );
            if (
              oldSchema.metadata.constraints?.find(
                (c: any) => c.constraint_name === constraintName
              )
            ) {
              removeSizeCheck(tableBuilder, tableName, columnName);
            }
          }

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
              'date-range'
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

  async deleteColumn({
    schemaName = 'public',
    tableName,
    columnName,
  }: {
    schemaName?: string;
    tableName: string;
    columnName: string;
  }) {
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

    await pg.schema
      .withSchema(schemaName)
      .alterTable(tableName, (tableBuilder) => {
        tableBuilder.dropColumn(columnName);
      });
  }
}
