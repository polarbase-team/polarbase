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
