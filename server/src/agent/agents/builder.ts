import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

import { TableService } from '../../rest/services/table.service';
import {
  DataType,
  FormulaResultType,
  FormulaStrategy,
  ReferentialAction,
} from '../../rest/utils/column';

const tableService = new TableService();

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
    execute: async (args) => {
      await tableService.deleteColumn(args);
      return {
        status: 'success',
        message: `Column ${args.columnName} deleted from ${args.tableName}.`,
      };
    },
  }),
};

export function createBuilderAgent(model: any, temperature?: number) {
  return new ToolLoopAgent({
    id: 'builder-agent',
    model,
    temperature,
    instructions: `You are a Database Schema Builder.

    IMPORTANT RULES FOR PRIMARY KEYS:
    1. Do NOT include an "id" column in the "columns" array when creating a table.
    2. Use the "idType" property (integer, biginteger, uuid, shortid) to define the primary key format.
    3. The system will automatically create the primary key "id" based on that "idType".
    
    CRITICAL SAFETY RULES:
    1. If a request involves DELETING or DROPPING (tables or columns), you MUST present the plan and explicitly ask: "Do you want me to proceed with these deletions?" 
    2. Do NOT call the delete tools until the user explicitly confirms in the next turn.
    
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
    4. Execute after confirmation.`,
    tools: builderAgentTools,
  });
}
