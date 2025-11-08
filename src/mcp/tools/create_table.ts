import { FastMCP, UserError } from 'fastmcp';
import type { Knex } from 'knex';
import { z } from 'zod';
import db from '../../database/db.ts';

export default function register(server: FastMCP) {
  server.addTool({
    name: 'createTable',
    description: `
    Creates a new database table based on a user prompt and a JSON structure.
    The AI must use 'suggestTableStructure' to generate the structure.
    Set 'preview' to true to return the SQL query without executing.
    Set 'confirm' to true to execute when 'preview' is false; otherwise, an error is thrown.
    Steps for AI:
    1. Fetch 'db://tables' to ensure the table name is unique.
    2. Call 'suggestTableStructure' to get the JSON structure.
    3. Pass the prompt and structure to this tool.
    4. After creation, verify the table in 'db://tables' and its columns in 'db://table/{tableName}/columns'.
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
            ),
          columns: z
            .array(
              z.object({
                name: z
                  .string()
                  .regex(
                    /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                    'Column name must be alphanumeric starting with a letter or underscore'
                  ),
                type: z.enum([
                  'integer',
                  'numeric',
                  'varchar',
                  'text',
                  'date',
                  'timestamp',
                  'boolean',
                ]),
                constraints: z
                  .array(
                    z.enum([
                      'primary key',
                      'not null',
                      'generated always as identity',
                    ])
                  )
                  .optional(),
              })
            )
            .min(1, 'At least one column is required'),
        })
        .describe(
          'The inferred table structure in JSON format, including table name and columns with their types and optional constraints.'
        ),
      preview: z
        .boolean()
        .default(false)
        .describe(
          "If true, return the SQL query without executing. If false, execute only if 'confirm' is true."
        ),
      confirm: z
        .boolean()
        .optional()
        .describe(
          "Required when 'preview' is false. Set to true to execute the query; otherwise, an error is thrown."
        ),
    }),
    annotations: {
      title: 'Create Database Table',
      readOnlyHint: false,
      destructiveHint: true,
    },
    async execute(args, { log }) {
      try {
        const { prompt, structure, preview, confirm } = args;
        const { tableName, columns } = structure;

        // Log the start of table creation
        log.info('Processing table creation', {
          prompt,
          tableName,
          columns,
          preview,
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

        // Build SQL query for preview
        let sql = `CREATE TABLE ${tableName} (`;
        const columnDefs = columns.map((col) => {
          let def = `${col.name} ${col.type.toUpperCase()}`;
          if (col.constraints) {
            if (col.constraints.includes('primary key')) def += ' PRIMARY KEY';
            if (col.constraints.includes('not null')) def += ' NOT NULL';
            if (col.constraints.includes('generated always as identity'))
              def += ' GENERATED ALWAYS AS IDENTITY';
          }
          return def;
        });
        sql += columnDefs.join(', ') + ');';

        // Preview mode
        if (preview) {
          log.info('Returning SQL preview', { sql });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ status: 'preview', sql }, null, 2),
              },
            ],
          };
        }

        // Check confirmation
        if (!confirm) {
          throw new UserError(
            "Confirmation required: set 'confirm' to true to execute the query."
          );
        }

        // Create the table using Knex
        await db.schema.createTable(tableName, (table) => {
          columns.forEach((col) => {
            // @ts-ignore
            let column = table[col.type as keyof Knex.TableBuilder](col.name);
            if (col.constraints) {
              col.constraints.forEach((constraint) => {
                if (constraint === 'primary key') {
                  column = column.primary();
                } else if (constraint === 'generated always as identity') {
                  column = column.generatedAlwaysAsIdentity();
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
