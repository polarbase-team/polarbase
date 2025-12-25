import { z } from 'zod';

import { log } from '../../utils/logger';
import { loadTables } from '../resources/tables';
import { loadColumns } from '../resources/columns';
import { ConditionSchema } from '../schema/condition.schema';
import { TableRecordService } from '../../rest/services/table-record.service';

const tableRecordService = new TableRecordService();

const UpdateOperationSchema = z.object({
  data: z
    .any()
    .refine(
      (obj) => obj && typeof obj === 'object' && Object.keys(obj).length > 0,
      {
        message: 'Update data must contain at least one column to update',
      }
    )
    .describe(
      'A dictionary object where keys are column names and values are the new data to be updated. ' +
        'Example: { status: "active", age: 25 }. ' +
        'Check valid columns using findColumns before calling this.'
    ),

  where: ConditionSchema.describe(
    'Advanced WHERE condition to select records to update (required and must be specific).'
  ),
});

const inputSchema = z.object({
  table: z
    .string()
    .describe(
      "Name of the table to update. Use 'findTables' tool to get valid table names."
    ),

  updates: z
    .array(UpdateOperationSchema)
    .min(1, { message: 'At least one update operation is required' })
    .max(50, { message: 'Maximum 50 update operations per request' })
    .describe(
      'Array of update operations. Each operation specifies what to update (data) and which records to target (where).\n' +
        'Supports multiple independent updates in one call (e.g., update different records with different values).'
    ),
});

export const updateFromTableTool = {
  name: 'updateFromTable',
  description: `
    Updates one or more records in a database table using advanced WHERE conditions.
    Supports batch updates (multiple independent updates in one call) with full WhereFilter syntax.

    This is a dangerous operation — always ensure WHERE conditions are specific enough to avoid updating unintended records.

    Features:
    - Full WhereFilter support: operators (gt, in, ilike, etc.), AND/OR logic, nesting
    - Multiple updates in one request
    - Returns updated records
    - Runs in a transaction for safety

    Usage guidelines:
    - Always validate table with 'findTables'
    - Always check column names and types with 'findColumns'
    - Never use weak conditions like { status: "active" } on large tables
    - Prefer primary key conditions when possible (e.g., { id: 123 })
  `,
  inputSchema,

  async execute(args: z.infer<typeof inputSchema>) {
    try {
      const { table, updates } = args;

      // 1. Validate table exists
      const tables = await loadTables();
      if (!tables.some((t) => t.tableName === table)) {
        throw new Error(
          `Table '${table}' does not exist. Use 'findTables' to see available tables.`
        );
      }

      // 2. Validate all column names (in data and where clauses)
      const columns = await loadColumns(table);
      const validColumns = columns.map((col) => col.name);

      const extractColumnsFromCondition = (cond: any): string[] => {
        if (!cond || typeof cond !== 'object') return [];
        if (Array.isArray(cond))
          return cond.flatMap(extractColumnsFromCondition);
        if ('and' in cond || 'or' in cond) {
          const sub = cond.and || cond.or || [];
          return sub.flatMap(extractColumnsFromCondition);
        }
        return Object.keys(cond);
      };

      for (const [idx, op] of updates.entries()) {
        // Validate columns in 'data'
        const invalidDataCols = Object.keys(op.data).filter(
          (col) => !validColumns.includes(col)
        );
        if (invalidDataCols.length > 0) {
          throw new Error(
            `Update #${idx + 1}: Invalid column(s) in data: ${invalidDataCols.join(', ')}. ` +
              `Valid columns: ${validColumns.join(', ')}`
          );
        }

        // Validate columns in 'where'
        const whereColumns = extractColumnsFromCondition(op.where);
        const invalidWhereCols = whereColumns.filter(
          (col) => !validColumns.includes(col)
        );
        if (invalidWhereCols.length > 0) {
          throw new Error(
            `Update #${idx + 1}: Invalid column(s) in WHERE: ${invalidWhereCols.join(', ')}. ` +
              `Valid columns: ${validColumns.join(', ')}`
          );
        }
      }

      // 3. Execute update using TableRecordService (supports full WhereFilter + batch)
      const result = await tableRecordService.update({
        schemaName: 'public',
        tableName: table,
        updates: updates.map(({ data, where }) => ({ data, where })),
      });

      log.info('Update completed', {
        table,
        updatedCount: result.updatedCount,
      });

      // Limit displayed returned records
      const MAX_DISPLAY_RECORDS = 10;
      const displayedReturning = result.returning.slice(0, MAX_DISPLAY_RECORDS);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'success',
                table,
                updatedCount: result.updatedCount,
                message:
                  result.updatedCount > 0
                    ? `Successfully updated ${result.updatedCount} record(s) in '${table}'.`
                    : `No records matched the conditions in '${table}'. Nothing was updated.`,
                returnedRecordsSample:
                  result.updatedCount > MAX_DISPLAY_RECORDS
                    ? `Showing first ${MAX_DISPLAY_RECORDS} updated records (total: ${result.updatedCount})`
                    : undefined,
                returning: displayedReturning,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const err = error as Error;
      log.error('Update error', { error: err.message });
      throw new Error(`Update failed: ${err.message}`);
    }
  },
};
