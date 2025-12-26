import { z } from 'zod';

import { log } from '../../utils/logger';
import { loadTables } from '../resources/tables';
import { loadColumns } from '../resources/columns';
import { ConditionSchema } from '../schema/condition.schema';
import { TableRecordService } from '../../rest/services/table-record.service';

const tableRecordService = new TableRecordService();

const inputSchema = z.object({
  table: z
    .string()
    .describe(
      "Name of the table to delete from. Use 'findTables' tool to get valid table names."
    ),

  where: ConditionSchema.describe(
    `Advanced WHERE condition using WhereFilter structure (required).
    Must not be empty. Examples:
    - Simple: { id: 5 }
    - With operator: { age: { gt: 30 } }
    - Multiple: { status: "inactive", deleted_at: { ne: null } }
    - IN: { role: { in: ["guest", "banned"] } }
    - AND: { and: [{ status: "pending" }, { created_at: { lt: "2024-01-01" } }] }
    - OR: { or: [{ email: null }, { email: "" }] }
    Call 'findColumns' to get valid column names and types.`
  ),
});

export const deleteFromTableTool = {
  name: 'deleteFromTable',
  description: `
    Permanently deletes one or more records from a database table based on advanced WHERE conditions.
    This action is irreversible and potentially dangerous — always double-check the condition.

    Requirements:
    - Table must exist (validate with 'findTables')
    - All column names in 'where' must be valid (validate with 'findColumns')
    - WHERE condition must be specific enough to avoid accidental mass deletion

    Supports full WhereFilter syntax: operators (gt, in, ilike, etc.), logical AND/OR, nesting.
  `,
  inputSchema,

  async execute(args: z.infer<typeof inputSchema>) {
    try {
      const { table, where } = args;

      // 1. Validate table exists
      const tables = await loadTables();
      if (!tables.find((t) => t.tableName === table)) {
        throw new Error(
          `Table '${table}' does not exist. Use 'findTables' to see available tables.`
        );
      }

      // 2. Validate column names in where clause
      const columns = await loadColumns(table);
      const validColumns = columns.map((col) => col.name);

      const extractColumns = (cond: any): string[] => {
        if (!cond || typeof cond !== 'object') return [];
        if (Array.isArray(cond)) {
          return cond.flatMap(extractColumns);
        }
        if ('and' in cond || 'or' in cond) {
          const sub = cond.and || cond.or || [];
          return sub.flatMap(extractColumns);
        }
        return Object.keys(cond);
      };

      const usedColumns = extractColumns(where);
      const invalidColumns = usedColumns.filter(
        (col) => !validColumns.includes(col)
      );

      if (invalidColumns.length > 0) {
        throw new Error(
          `Invalid column(s) in WHERE condition: ${invalidColumns.join(
            ', '
          )}. Valid columns: ${validColumns.join(', ')}`
        );
      }

      // 3. Execute delete using TableRecordService (supports full WhereFilter)
      const result = await tableRecordService.delete({
        schemaName: 'public',
        tableName: table,
        condition: { where },
      });

      log.info('Delete completed', {
        table,
        deletedCount: result.deletedCount,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'success',
                table,
                deletedCount: result.deletedCount,
                message:
                  result.deletedCount > 0
                    ? `Successfully deleted ${result.deletedCount} record(s) from '${table}'.`
                    : `No records matched the condition in '${table}'. Nothing was deleted.`,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const err = error as Error;
      log.error('Delete error', { error: err.message });
      throw new Error(`Delete failed: ${err.message}`);
    }
  },
};
