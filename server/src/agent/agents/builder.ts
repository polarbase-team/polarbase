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

export const builderAgentTools = {
  createTable: tool({
    description:
      'Create a new table with a primary key column (id) and optional timestamps.',
    inputSchema: z.object({
      name: z.string().describe('The name of the table to create.'),
      comment: z
        .string()
        .optional()
        .describe('A comment or description for the table.'),
      idType: z
        .enum(['integer', 'biginteger', 'uuid', 'shortid'])
        .optional()
        .describe('The type of the primary key column.'),
      timestamps: z
        .boolean()
        .optional()
        .describe('Whether to include created_at and updated_at columns.'),
      presentation: z
        .object({
          uiName: z
            .string()
            .optional()
            .describe('The display name for the table in the UI.'),
        })
        .optional(),
    }),
    execute: async (args) => {
      const result = await tableService.createTable({
        table: args,
      });
      return { status: 'success', table: result };
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
        name: z.string().optional().describe('The new name for the table.'),
        comment: z
          .string()
          .optional()
          .describe('The new comment for the table.'),
        presentation: z
          .object({
            uiName: z
              .string()
              .optional()
              .describe('The new display name for the table.'),
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

  listTables: tool({
    description: 'List all tables in the database.',
    inputSchema: z.object({}),
    execute: async () => {
      const tables = await tableService.getAll({ includeSchema: true });
      const blacklist = (process.env.AGENT_BLACKLISTED_TABLES || '').split(',');
      return {
        tables: tables.filter((t) => !blacklist.includes(t.name)),
      };
    },
  }),

  findColumns: tool({
    description: 'Get detailed column information for a specific table.',
    inputSchema: z.object({
      tableName: z
        .string()
        .describe('The name of the table to get columns for.'),
    }),
    execute: async ({ tableName }) => {
      const tables = await tableService.getAll({ includeSchema: true });
      const table = tables.find((t) => t.name === tableName);
      if (!table) {
        throw new Error(`Table ${tableName} not found.`);
      }
      return {
        tableName: table.name,
        columns: table.schema,
      };
    },
  }),

  createColumn: tool({
    description: 'Add a new column to an existing table.',
    inputSchema: z.object({
      tableName: z
        .string()
        .describe('The name of the table to add the column to.'),
      column: z.object({
        name: z.string().describe('The name of the column.'),
        dataType: z
          .enum(Object.values(DataType) as [string, ...string[]])
          .describe('The data type of the column.'),
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
            table: z.string().describe('The referenced table name.'),
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
              .describe('The SQL-like expression for the formula.'),
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
            uiName: z.string().optional(),
            format: z.string().optional(),
          })
          .optional(),
      }),
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
        name: z.string().describe('The new name for the column.'),
        dataType: z
          .enum(Object.values(DataType) as [string, ...string[]])
          .optional()
          .describe('The data type of the column.'),
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
            uiName: z.string().optional(),
            format: z.string().optional(),
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
    toolChoice: 'required',
    instructions: `You are a Database Schema Builder. 
    You can create new tables, add columns to existing tables, and manage the database structure (including updating and deleting tables or columns).
    
    CRITICAL: ALWAYS follow these steps for every request:
    1. ANALYZE the user's request and the current database schema using listTables if necessary.
    2. FORMULATE a detailed plan describing exactly which tables and columns you will create, update, or delete.
    3. SHOW the plan to the user clearly (e.g., using a list or markdown table).
    4. EXECUTE the plan by calling the appropriate tools.
    
    When a user asks for a complex schema or a specific solution, design a comprehensive set of tables with appropriate columns and relationships, and explain your design choices in the plan.
    Use the provided tools to implement the schema only after stating your plan.`,
    tools: builderAgentTools,
  });
}
