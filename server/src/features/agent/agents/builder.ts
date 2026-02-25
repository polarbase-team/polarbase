import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

import { TableService } from '../../../db/services/table.service';
import { IndexService } from '../../../db/services/index.service';
import {
  DataType,
  FormulaResultType,
  FormulaStrategy,
  ReferentialAction,
} from '../../../db/utils/column';

const tableService = new TableService();
const indexService = new IndexService();

const presentationFormatSchema = z
  .object({
    // Number and Formula (Number) fields
    numberFormat: z
      .enum(['comma', 'percentage', 'currency'])
      .optional()
      .describe('Used for Number or Formula(Number).'),

    // Date and AutoDate fields
    dateFormat: z
      .string()
      .optional()
      .describe('Standard: YYYY-MM-DD, DD/MM/YYYY, etc.'),
    showTime: z
      .boolean()
      .optional()
      .describe('Whether to include time in date display.'),

    // Reference fields
    displayColumn: z
      .string()
      .nullable()
      .optional()
      .describe(
        'The column name from the referenced table to show as the label.'
      ),
  })
  .describe('UI-specific display settings.');

export const createColumnSchema = z.object({
  name: z
    .string()
    .describe(
      'The unique technical name for the column (e.g., "first_name"). Avoid spaces.'
    ),
  dataType: z
    .enum(Object.values(DataType) as [string, ...string[]])
    .describe(
      'Must be one of: text, long-text, integer, number, date, checkbox, select, multi-select, email, url, json, geo-point, reference, attachment, auto-number, auto-date, formula.'
    ),
  nullable: z.boolean().optional().describe('Whether the column can be null.'),
  unique: z
    .boolean()
    .optional()
    .describe('Whether the column values must be unique.'),
  defaultValue: z
    .any()
    .optional()
    .describe('The default value for the column.'),
  comment: z.string().optional().describe('The comment for the column.'),
  options: z
    .array(z.string())
    .optional()
    .describe('Available options for Select or MultiSelect types.'),
  foreignKey: z
    .object({
      table: z
        .string()
        .describe('The exact name of the existing table to link to.'),
      column: z.object({
        name: z.string().describe('The referenced column name.'),
        type: z.string().describe('The referenced column type.'),
      }),
      onUpdate: z
        .enum(Object.values(ReferentialAction) as [string, ...string[]])
        .optional(),
      onDelete: z
        .enum(Object.values(ReferentialAction) as [string, ...string[]])
        .optional(),
    })
    .optional()
    .describe('Foreign key configuration for Reference type.'),
  formula: z
    .object({
      expression: z
        .string()
        .describe(
          'SQL-like string using other column names (e.g., "price * 1.1").'
        ),
      resultType: z
        .enum(Object.values(FormulaResultType) as [string, ...string[]])
        .describe('The result type of the formula.'),
      strategy: z
        .enum(Object.values(FormulaStrategy) as [string, ...string[]])
        .optional(),
    })
    .optional()
    .describe('Formula configuration for Formula type.'),
  presentation: z
    .object({
      uiName: z
        .string()
        .optional()
        .describe('The display name for the column (e.g., "First Name").'),
      format: presentationFormatSchema.optional(),
    })
    .optional(),
});

export const createTableSchema = z.object({
  name: z
    .string()
    .describe(
      'The unique technical name for the table (e.g., "users"). Avoid spaces.'
    ),
  comment: z.string().optional().describe('The comment for the table.'),
  idType: z.enum(['integer', 'biginteger', 'uuid', 'shortid']).optional(),
  timestamps: z.boolean().optional(),
  columns: z.array(createColumnSchema).optional(),
  presentation: z
    .object({
      uiName: z
        .string()
        .optional()
        .describe('The display name for the table (e.g., "Users").'),
    })
    .optional(),
});

export const builderAgentTools = {
  createMultipleTables: tool({
    description:
      'Create a full database schema from scratch. Use this when the user describes an entire app or system (e.g., Build an e-commerce backend).',
    inputSchema: z.object({
      tables: z.array(createTableSchema),
    }),
    inputExamples: [
      {
        input: {
          tables: [
            {
              name: 'users',
              comment: 'Application users',
              idType: 'uuid',
              timestamps: true,
              presentation: { uiName: 'Users' },
              columns: [
                {
                  name: 'email',
                  dataType: 'email',
                  nullable: false,
                  unique: true,
                  presentation: { uiName: 'Email Address' },
                },
                {
                  name: 'name',
                  dataType: 'text',
                  nullable: false,
                  presentation: { uiName: 'Full Name' },
                },
              ],
            },
            {
              name: 'posts',
              comment: 'User posts',
              idType: 'integer',
              timestamps: true,
              presentation: { uiName: 'Posts' },
              columns: [
                {
                  name: 'title',
                  dataType: 'text',
                  nullable: false,
                  presentation: { uiName: 'Title' },
                },
                {
                  name: 'user_id',
                  dataType: 'reference',
                  nullable: false,
                  foreignKey: {
                    table: 'users',
                    column: { name: 'id', type: 'uuid' },
                    onDelete: 'cascade',
                  },
                  presentation: {
                    uiName: 'Author',
                    format: { displayColumn: 'name' },
                  },
                },
              ],
            },
          ],
        },
      },
    ],
    strict: true,
    execute: async (args) => {
      const summary = {
        created: [] as string[],
        failed: [] as { name: string; error: string }[],
      };

      for (const tableDef of args.tables) {
        try {
          await tableService.createTable({
            table: {
              name: tableDef.name,
              comment: tableDef.comment,
              idType: tableDef.idType,
              timestamps: tableDef.timestamps,
              presentation: tableDef.presentation,
            },
          });

          for (const col of tableDef.columns || []) {
            await tableService.createColumn({
              tableName: tableDef.name,
              column: col as any,
            });
          }
          summary.created.push(tableDef.name);
        } catch (err: any) {
          summary.failed.push({
            name: tableDef.name,
            error: err.message || 'Unknown error',
          });
        }
      }

      return {
        status: summary.failed.length === 0 ? 'success' : 'partial_failure',
        message: `Created ${summary.created.length} tables. ${summary.failed.length} failed.`,
        details: summary,
      };
    },
  }),

  createTable: tool({
    description:
      'Create a new table along with multiple columns in a single operation.',
    inputSchema: createTableSchema,
    inputExamples: [
      {
        input: {
          name: 'products',
          comment: 'Product catalog',
          idType: 'integer',
          timestamps: true,
          presentation: { uiName: 'Products' },
          columns: [
            {
              name: 'name',
              dataType: 'text',
              nullable: false,
              presentation: { uiName: 'Product Name' },
            },
            {
              name: 'price',
              dataType: 'number',
              nullable: false,
              presentation: {
                uiName: 'Price',
                format: { numberFormat: 'currency' },
              },
            },
            {
              name: 'in_stock',
              dataType: 'checkbox',
              defaultValue: true,
              presentation: { uiName: 'In Stock' },
            },
          ],
        },
      },
    ],
    strict: true,
    execute: async (args) => {
      await tableService.createTable({
        table: {
          name: args.name,
          comment: args.comment,
          idType: args.idType,
          timestamps: args.timestamps,
          presentation: args.presentation,
        },
      });

      const filteredColumns = (args.columns || []).filter(
        (col) => col.name.toLowerCase() !== 'id'
      );

      for (const col of filteredColumns) {
        await tableService.createColumn({
          tableName: args.name,
          column: col as any,
        });
      }

      return {
        status: 'success',
        table: args.name,
        presentation: args.presentation,
        columnsCreated: filteredColumns.length,
      };
    },
  }),

  updateTable: tool({
    description:
      'Update an existing table name, comment or presentation details.',
    inputSchema: z.object({
      tableName: z
        .string()
        .describe('The current name of the table to update.'),
      table: z.object({
        name: z
          .string()
          .optional()
          .describe(
            'The new technical name for the table (e.g., "users"). Avoid spaces.'
          ),
        comment: z
          .string()
          .optional()
          .describe('The new comment for the table.'),
        presentation: z
          .object({
            uiName: z
              .string()
              .optional()
              .describe('The new display name for the table (e.g., "Users").'),
          })
          .optional(),
      }),
    }),
    inputExamples: [
      {
        input: {
          tableName: 'users',
          table: {
            presentation: { uiName: 'System Users' },
          },
        },
      },
      {
        input: {
          tableName: 'old_products',
          table: {
            name: 'products',
            comment: 'Updated product catalog',
            presentation: { uiName: 'Products' },
          },
        },
      },
    ],
    strict: true,
    execute: async (args) => {
      const result = await tableService.updateTable({
        tableName: args.tableName,
        table: args.table,
      });
      return { status: 'success', table: result };
    },
  }),

  deleteTable: tool({
    description: 'Delete a table from the database.',
    inputSchema: z.object({
      tableName: z.string().describe('The name of the table to delete.'),
      cascade: z
        .boolean()
        .optional()
        .describe('Whether to drop dependent objects (CASCADE).'),
    }),
    inputExamples: [
      { input: { tableName: 'temp_data' } },
      { input: { tableName: 'old_logs', cascade: true } },
    ],
    strict: true,
    execute: async (args) => {
      await tableService.deleteTable(args);
      return { status: 'success', message: `Table ${args.tableName} deleted.` };
    },
  }),

  createColumn: tool({
    description: 'Add a new column to an existing table.',
    inputSchema: z.object({
      tableName: z
        .string()
        .describe('The name of the table to add the column to.'),
      column: createColumnSchema,
    }),
    inputExamples: [
      {
        input: {
          tableName: 'users',
          column: {
            name: 'bio',
            dataType: 'long-text',
            nullable: true,
            presentation: { uiName: 'Biography' },
          },
        },
      },
      {
        input: {
          tableName: 'orders',
          column: {
            name: 'total_price',
            dataType: 'formula',
            formula: {
              expression: 'quantity * unit_price',
              resultType: 'number',
              strategy: 'stored',
            },
            presentation: {
              uiName: 'Total Price',
              format: { numberFormat: 'currency' },
            },
          },
        },
      },
    ],
    strict: true,
    execute: async (args) => {
      const result = await tableService.createColumn({
        tableName: args.tableName,
        column: args.column as any,
      });
      return { status: 'success', column: result };
    },
  }),

  updateColumn: tool({
    description: 'Update an existing column in a table.',
    inputSchema: z.object({
      tableName: z.string().describe('The name of the table.'),
      columnName: z
        .string()
        .describe('The current name of the column to update.'),
      column: z.object({
        name: z
          .string()
          .describe(
            'The unique technical name for the column (e.g., "first_name"). Avoid spaces.'
          ),
        dataType: z
          .enum(Object.values(DataType) as [string, ...string[]])
          .optional()
          .describe(
            'Must be one of: text, long-text, integer, number, date, checkbox, select, multi-select, email, url, json, geo-point, reference, attachment, auto-number, auto-date, formula.'
          ),
        nullable: z
          .boolean()
          .optional()
          .describe('Whether the column can be null.'),
        unique: z
          .boolean()
          .optional()
          .describe('Whether the column values must be unique.'),
        defaultValue: z
          .any()
          .optional()
          .describe('The default value for the column.'),
        comment: z.string().optional().describe('A comment for the column.'),
        options: z
          .array(z.string())
          .optional()
          .describe('Available options for Select or MultiSelect types.'),
        foreignKey: z
          .object({
            table: z
              .string()
              .describe('The exact name of the existing table to link to.'),
            column: z.object({
              name: z.string().describe('The referenced column name.'),
              type: z.string().describe('The referenced column type.'),
            }),
            onUpdate: z
              .enum(Object.values(ReferentialAction) as [string, ...string[]])
              .optional(),
            onDelete: z
              .enum(Object.values(ReferentialAction) as [string, ...string[]])
              .optional(),
          })
          .optional()
          .describe('Foreign key configuration for Reference type.'),
        formula: z
          .object({
            expression: z
              .string()
              .describe(
                'SQL-like string using other column names (e.g., "price * 1.1").'
              ),
            resultType: z
              .enum(Object.values(FormulaResultType) as [string, ...string[]])
              .describe('The result type of the formula.'),
            strategy: z
              .enum(Object.values(FormulaStrategy) as [string, ...string[]])
              .optional(),
          })
          .optional()
          .describe('Formula configuration for Formula type.'),
        presentation: z
          .object({
            uiName: z
              .string()
              .optional()
              .describe(
                'The display name for the column (e.g., "First Name").'
              ),
            format: presentationFormatSchema.optional(),
          })
          .optional(),
      }),
    }),
    inputExamples: [
      {
        input: {
          tableName: 'users',
          columnName: 'email',
          column: {
            name: 'email',
            dataType: 'email',
            nullable: false,
            unique: true,
            presentation: { uiName: 'Email Address' },
          },
        },
      },
      {
        input: {
          tableName: 'products',
          columnName: 'discount_price',
          column: {
            name: 'discount_price',
            dataType: 'formula',
            formula: {
              expression: 'price * 0.9',
              resultType: 'number',
              strategy: 'virtual',
            },
            presentation: {
              uiName: 'Discounted Price',
              format: { numberFormat: 'currency' },
            },
          },
        },
      },
    ],
    strict: true,
    execute: async (args) => {
      const result = await tableService.updateColumn({
        tableName: args.tableName,
        columnName: args.columnName,
        column: args.column as any,
      });
      return { status: 'success', column: result };
    },
  }),

  deleteColumn: tool({
    description: 'Delete a column from a table.',
    inputSchema: z.object({
      tableName: z.string().describe('The name of the table.'),
      columnName: z.string().describe('The name of the column to delete.'),
    }),
    inputExamples: [
      { input: { tableName: 'users', columnName: 'deprecated_field' } },
      { input: { tableName: 'products', columnName: 'old_price' } },
    ],
    strict: true,
    execute: async (args) => {
      await tableService.deleteColumn(args);
      return {
        status: 'success',
        message: `Column ${args.columnName} deleted from ${args.tableName}.`,
      };
    },
  }),

  createIndex: tool({
    description: 'Create a new index on a table for performance optimization.',
    inputSchema: z.object({
      name: z
        .string()
        .describe('The name of the index (e.g., "idx_users_email").'),
      tableName: z.string().describe('The name of the table to index.'),
      columnNames: z
        .array(z.string())
        .describe('List of column names to include in the index.'),
      unique: z
        .boolean()
        .optional()
        .describe('Whether the index should be unique.'),
      type: z
        .enum(['btree', 'hash', 'gist', 'gin', 'brin', 'spgist'])
        .optional()
        .describe('The type of index to create.'),
    }),
    inputExamples: [
      {
        input: {
          name: 'idx_users_email',
          tableName: 'users',
          columnNames: ['email'],
          unique: true,
        },
      },
      {
        input: {
          name: 'idx_products_category',
          tableName: 'products',
          columnNames: ['category_id'],
        },
      },
    ],
    strict: true,
    execute: async (args) => {
      const result = await indexService.createIndex({ index: args });
      return { status: 'success', index: result };
    },
  }),

  deleteIndex: tool({
    description: 'Delete an existing index.',
    inputSchema: z.object({
      indexName: z.string().describe('The name of the index to delete.'),
    }),
    inputExamples: [{ input: { indexName: 'idx_users_email' } }],
    strict: true,
    execute: async (args) => {
      await indexService.deleteIndex(args);
      return { status: 'success', message: `Index ${args.indexName} deleted.` };
    },
  }),
};

export function createBuilderAgent(
  model: any,
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  }
) {
  return new ToolLoopAgent({
    id: 'builder-agent',
    model,
    temperature: generationConfig?.temperature,
    topK: generationConfig?.topK,
    topP: generationConfig?.topP,
    maxOutputTokens: generationConfig?.maxOutputTokens,
    instructions: `You are a Database Schema Builder.

    IMPORTANT RULES FOR PRIMARY KEYS:
    1. Do NOT include an "id" column in the "columns" array when creating a table.
    2. Use the "idType" property (integer, biginteger, uuid, shortid) to define the primary key format.
    3. The system will automatically create the primary key "id" based on that "idType".
    
    CRITICAL SAFETY RULES:
    1. If a request involves DELETING or DROPPING (tables, columns, or indexes), you MUST present the plan and explicitly ask: "Do you want me to proceed with these deletions?" 
    2. Do NOT call the delete tools until the user explicitly confirms in a separate turn. 
    3. Once the user confirms (e.g., says "Yes" or "Proceed"), you MUST call the appropriate delete tool immediately. NEVER claim success unless the tool has been executed and returned success.
    
    ### DATA TYPE RULES:
    - Use 'text' for short strings and 'long-text' for descriptions.
    - Use 'number' for decimals and 'integer' for whole numbers.
    - Use 'checkbox' instead of 'boolean'.
    - For relationships, use 'reference'.
    - For primary keys (if not using idType), use 'auto-number'.
    - For timestamps, use 'auto-date'.

    ### PRESENTATION FORMAT RULES:
    Apply the "presentation.format" object based on the "dataType":
    1. **Number / Formula (Number)**: 
      - Set "numberFormat" to 'comma', 'percentage', or 'currency'.
    2. **Date / AutoDate / Formula (Date)**: 
      - Set "dateFormat" (e.g., 'YYYY-MM-DD').
      - Set "showTime" (true/false).
    3. **Reference**: 
      - Set "displayColumn" to the name of the column in the target table you want the user to see (e.g., "name" or "title").
    4. **Formula**:
      - Check the "formula.resultType" first. If it's 'number', use numberFormat. If it's 'date', use dateFormat.

    ### WORKFLOW:
    1. Analyze the requirement.
    2. Select the correct system DataType from the allowed list.
    3. Propose the schema to the user.
    4. Call the appropriate tool(s) ONLY after the user has confirmed.
    5. ONLY report success after the tool execution is complete.`,
    tools: builderAgentTools,
  });
}
