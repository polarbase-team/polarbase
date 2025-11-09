import { FastMCP, UserError } from 'fastmcp';
import type { Knex } from 'knex';
import { z } from 'zod';
import db from '../../database/db.ts';

export default function register(server: FastMCP) {
  server.addTool({
    name: 'createTable',
    description: `
      Creates a new database table based on a user prompt and a JSON structure.
      Steps for AI:
      - Call 'findTables' to ensure the table name is unique.
      - Use 'suggestTableStructure' to generate the JSON structure from the prompt.
      - Pass the prompt and structure to this tool.
      Supports types: integer, double, string, text, date, timestamp, boolean, json, and enum.
      To use 'enum', specify a 'values' array in the column definition.
    `,
    parameters: z.object({
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
                    'enum'
                  ])
                  .describe('Column data type.'),
                constraints: z
                  .array(
                    z.enum([
                      'primary key',
                      'not null',
                      'generated always as identity',
                    ])
                  )
                  .optional()
                  .describe(
                    "Optional constraints like 'primary key', 'not null', or 'generated always as identity'."
                  ),
                // For enum type, you must specify allowed values
                values: z.array(z.string()).optional().describe(
                  "For columns of type 'enum', specify an array of allowed string values."
                ),
              })
            )
            .min(1, 'At least one column is required')
            .describe(
              'Array of columns with names, types, and optional constraints.'
            ),
        })
        .describe('The inferred table structure in JSON format.'),
    }),
    annotations: {
      title: 'Create Database Table',
      readOnlyHint: false,
      destructiveHint: true,
    },
    async execute(args, { log }) {
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
        const tablesResource = await server.embedded('db://tables');
        const tables = JSON.parse(tablesResource.text || '[]') as string[];
        if (tables.includes(tableName)) {
          throw new UserError(
            `Table '${tableName}' already exists. Check 'db://tables' for existing tables: ${JSON.stringify(tables)}`
          );
        }

        // Validate column names for uniqueness
        const columnNames = columns.map((col) => col.name);
        if (new Set(columnNames).size !== columnNames.length) {
          throw new UserError('Column names must be unique');
        }

        // Validate 'enum' types have values
        columns.forEach((col) => {
          if (col.type === 'enum') {
            if (!col.values || !Array.isArray(col.values) || col.values.length === 0) {
              throw new UserError(
                `Column '${col.name}' of type 'enum' must specify a non-empty 'values' array`
              );
            }
          }
        });

        // Create the table using Knex
        await db.schema.createTable(tableName, (table) => {
          columns.forEach((col) => {
            let column;

            if (col.type === 'enum') {
              // knex requires the native .enu method for enum types
              // @ts-ignore
              column = (table.enu as any)(col.name, col.values);
            } else if (col.type === 'json') {
              // Most dialects now support .json, fallback to .jsonb for PostgreSQL-like support
              if (typeof table.json === 'function') {
                column = table.json(col.name);
              } else if (typeof table.jsonb === 'function') {
                column = (table as any).jsonb(col.name);
              } else {
                // fallback to text if DB does not support json
                column = table.text(col.name);
              }
            } else {
              // @ts-ignore
              column = table[col.type as keyof Knex.TableBuilder](col.name);
            }

            if (col.constraints) {
              col.constraints.forEach((constraint) => {
                if (constraint === 'primary key') {
                  column = column.primary();
                } else if (constraint === 'generated always as identity') {
                  if (typeof column.generatedAlwaysAsIdentity === 'function') {
                    column = column.generatedAlwaysAsIdentity();
                  }
                } else if (constraint === 'not null') {
                  column = column.notNullable();
                }
              });
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
                  })),
                  message: `Table '${tableName}' created successfully. Check 'db://table/${tableName}/columns' for details.`,
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
        throw new UserError(err.message || 'Failed to create table');
      }
    },
  });
}
