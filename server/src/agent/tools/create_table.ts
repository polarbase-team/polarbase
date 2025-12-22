import { z } from 'zod';
import type { Knex } from 'knex';

import pg from '../../plugins/pg';
import { log } from '../../utils/logger';
import { loadTables } from '../resources/tables';
import { loadColumns } from '../resources/columns';

const inputSchema = z.object({
  prompt: z
    .string()
    .describe(
      "A description of the table's purpose, used to infer the table structure."
    ),
  structure: z
    .object({
      tableName: z
        .string()
        .regex(
          /^[a-zA-Z_][a-zA-Z0-9_]*$/,
          'Table name must be alphanumeric starting with a letter or underscore'
        )
        .describe(
          "Name of the table to create. Must be unique; call 'findTables' to validate against existing tables."
        ),
      columns: z
        .array(
          z.object({
            name: z
              .string()
              .regex(
                /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                'Column name must be alphanumeric starting with a letter or underscore'
              )
              .describe('Column name, must be unique within the table.'),
            type: z
              .enum([
                'integer',
                'double',
                'string',
                'text',
                'date',
                'timestamp',
                'boolean',
                'json',
                'enum',
                'increment',
              ])
              .describe('Column data type.'),
            constraints: z
              .array(z.enum(['primary key', 'not null', 'unique']))
              .optional()
              .describe(
                "Optional constraints like 'primary key', 'not null', 'unique'."
              ),
            // For enum type, you must specify allowed values
            values: z
              .array(z.string())
              .optional()
              .describe(
                "For columns of type 'enum', specify an array of allowed string values."
              ),
            references: z
              .object({
                table: z
                  .string()
                  .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
                  .describe('Referenced table name.'),
                column: z
                  .string()
                  .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
                  .describe('Referenced column name.'),
                onDelete: z
                  .enum(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'])
                  .optional()
                  .describe('ON DELETE behavior for foreign key.'),
                onUpdate: z
                  .enum(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'])
                  .optional()
                  .describe('ON UPDATE behavior for foreign key.'),
              })
              .optional()
              .describe(
                'For foreign key columns, specify referenced table and column, and optionally onDelete/onUpdate behaviors.'
              ),
          })
        )
        .min(1, 'At least one column is required')
        .describe(
          'Array of columns with names, types, and optional constraints and foreign key references.'
        ),
    })
    .describe('The inferred table structure in JSON format.'),
});

export const createTableTool = {
  name: 'createTable',
  description: `
      Creates a new database table based on a user prompt and a JSON structure.
      Steps for AI:
      - Call 'findTables' to ensure the table name is unique.
      - Use 'suggestTableStructure' to generate the JSON structure from the prompt.
      - Pass the prompt and structure to this tool.
      Supported types: integer, double, string, text, date, timestamp, boolean, json, enum, increment.
      To define an enum, set the column's type to 'enum' and provide a 'values' array listing allowed values.
      For auto-increment columns, set the type to 'increment'. When combined with 'primary key' in constraints, this creates a standard auto-incremented primary key.
      To add uniqueness to a column, include 'unique' in its constraints array.
      Specify additional constraints such as 'primary key' or 'not null' using the 'constraints' array for each column.
      To create a foreign key, add a 'references' property to a column, e.g. { references: { table: "other_table", column: "id", onDelete: "CASCADE" } }.
    `,
  inputSchema,
  async execute(args: z.infer<typeof inputSchema>) {
    try {
      const { prompt, structure } = args;
      const { tableName, columns } = structure;

      // Log the start of table creation
      log.info('Processing table creation', {
        prompt,
        tableName,
        columns,
      });

      // Check existing tables
      const tables = await loadTables();
      if (tables.includes(tableName)) {
        throw new Error(`Table '${tableName}' already exists.`);
      }

      // Validate column names for uniqueness, enum values, and references in a single pass
      const columnNamesSet = new Set<string>();
      const refChecks: { colName: string; table: string; column: string }[] =
        [];

      for (const col of columns) {
        // Uniqueness check
        if (columnNamesSet.has(col.name)) {
          throw new Error('Column names must be unique');
        }
        columnNamesSet.add(col.name);

        // Enum values check
        if (col.type === 'enum') {
          if (
            !col.values ||
            !Array.isArray(col.values) ||
            col.values.length === 0
          ) {
            throw new Error(
              `Column '${col.name}' of type 'enum' must specify a non-empty 'values' array`
            );
          }
        }

        // References - Collect for batch checking
        if (col.references) {
          const { table: referencedTable, column: referencedColumn } =
            col.references;
          if (!referencedTable || !referencedColumn) {
            throw new Error(
              `Column '${col.name}' has invalid references: missing table or column.`
            );
          }
          if (!tables.includes(referencedTable)) {
            throw new Error(
              `Column '${col.name}' references a table '${referencedTable}' that does not exist.`
            );
          }
          refChecks.push({
            colName: col.name,
            table: referencedTable,
            column: referencedColumn,
          });
        }
      }

      // Only do network requests for references after the loop
      for (const {
        colName,
        table: referencedTable,
        column: referencedColumn,
      } of refChecks) {
        const columns = await loadColumns(referencedTable);
        const refColNames = columns.map((x) => x.name);
        if (!refColNames.includes(referencedColumn)) {
          throw new Error(
            `Column '${colName}' references column '${referencedColumn}' in table '${referencedTable}' which does not exist.`
          );
        }
      }

      await pg.schema.createTable(tableName, (table: Knex.TableBuilder) => {
        columns.forEach((col) => {
          let column: Knex.ColumnBuilder;

          switch (col.type) {
            case 'enum':
              // knex requires the native .enu method for enum types
              column = table.enu(col.name, col.values as Knex.Value[]);
              break;
            case 'json':
              // Most dialects now support .json, fallback to .jsonb for PostgreSQL-like support
              if (typeof table.json === 'function') {
                column = table.json(col.name);
              } else if (typeof table.jsonb === 'function') {
                column = table.jsonb(col.name);
              } else {
                // fallback to text if DB does not support json
                column = table.text(col.name);
              }
              break;
            case 'increment':
              column = table.increments(col.name);
              break;
            case 'integer':
              column = table.integer(col.name);
              break;
            case 'double':
              column = table.float(col.name); // knex uses float for doubles
              break;
            case 'string':
              column = table.string(col.name);
              break;
            case 'text':
              column = table.text(col.name);
              break;
            case 'date':
              column = table.date(col.name);
              break;
            case 'timestamp':
              column = table.timestamp(col.name);
              break;
            case 'boolean':
              column = table.boolean(col.name);
              break;
            default:
              throw new Error(`Unknown column type: ${col.type}`);
          }

          if (col.constraints) {
            col.constraints.forEach((constraint) => {
              switch (constraint) {
                case 'primary key':
                  column = column.primary();
                  break;
                case 'not null':
                  column = column.notNullable();
                  break;
                case 'unique':
                  column = column.unique();
                  break;
              }
            });
          }

          if (col.references) {
            let fk = table
              .foreign(col.name)
              .references(`${col.references.column}`)
              .inTable(col.references.table);
            if (col.references.onDelete)
              fk = fk.onDelete(col.references.onDelete);
            if (col.references.onUpdate)
              fk = fk.onUpdate(col.references.onUpdate);
          }
        });
      });

      // Log table creation success
      log.info('Table created successfully', { tableName, columns });

      // Return success response
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'success',
                tableName,
                columns: columns.map((col) => ({
                  name: col.name,
                  type: col.type,
                  constraints: col.constraints || [],
                  ...(col.type === 'enum' ? { values: col.values } : {}),
                  ...(col.references
                    ? {
                        references: {
                          table: col.references.table,
                          column: col.references.column,
                          ...(col.references.onDelete
                            ? { onDelete: col.references.onDelete }
                            : {}),
                          ...(col.references.onUpdate
                            ? { onUpdate: col.references.onUpdate }
                            : {}),
                        },
                      }
                    : {}),
                })),
                message: `Table '${tableName}' created successfully.`,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const err = error as Error;
      log.error('Table creation error', { error: err.message });
      throw new Error(err.message || 'Failed to create table');
    }
  },
};
