import { z } from 'zod';

import { log } from '../../utils/logger';
import { loadTables } from '../resources/tables';
import { loadColumns } from '../resources/columns';
import { TableRecordService } from '../../rest/services/table-record.service';

const tableRecordService = new TableRecordService();

const inputSchema = z.object({
  table: z
    .string()
    .describe(
      "Name of the table to insert into. Use 'findTables' tool to get valid table names."
    ),

  data: z
    .array(z.record(z.any(), z.any()))
    .min(1, { message: 'At least one record must be provided' })
    .max(500, { message: 'Maximum 500 records per insert request' })
    .describe(
      'Array of records to insert. Each record is an object with column names as keys and values matching column types.\n' +
        'Example: [{ name: "John", email: "john@example.com", age: 30 }, { name: "Jane", status: "active" }]\n' +
        'Use findColumns to check valid column names and data types.'
    ),
});

export const insertIntoTableTool = {
  name: 'insertIntoTable',
  description: `
    Inserts one or multiple new records into a database table.
    Supports batch insert (up to 500 records at once) with full validation.

    Safety guidelines:
    - Always validate table name with 'findTables'
    - Always check column names and expected data types with 'findColumns'
    - Do not insert into sensitive/system tables
    - Respect constraints (unique, not null, foreign keys)

    Returns the inserted records (with generated fields like id, created_at if using returning '*').
  `,
  inputSchema,

  async execute(args: z.infer<typeof inputSchema>) {
    try {
      const { table, data } = args;

      // 1. Validate table exists
      const tables = await loadTables();
      const tableExists = tables.some((t) => t.tableName === table);
      if (!tableExists) {
        throw new Error(
          `Table '${table}' does not exist. Use 'findTables' to see available tables.`
        );
      }

      // 2. Validate column names in all records
      const columns = await loadColumns(table);
      const validColumns = columns.map((col) => col.name);

      for (const [index, record] of data.entries()) {
        const invalidKeys = Object.keys(record).filter(
          (key) => !validColumns.includes(key)
        );
        if (invalidKeys.length > 0) {
          throw new Error(
            `Record at index ${index} contains invalid column(s): ${invalidKeys.join(
              ', '
            )}. ` +
              `Valid columns for table '${table}': ${validColumns.join(', ')}`
          );
        }
      }

      // 3. Execute insert using TableRecordService (supports transaction, chunking, returning)
      const result = await tableRecordService.insert({
        schemaName: 'public',
        tableName: table,
        records: data,
      });

      log.info('Insert completed', {
        table,
        insertedCount: result.insertedCount,
      });

      // Limit returned data for display
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
                insertedCount: result.insertedCount,
                message: `Successfully inserted ${result.insertedCount} record(s) into '${table}'.`,
                returnedRecordsSample:
                  result.insertedCount > MAX_DISPLAY_RECORDS
                    ? `Showing first ${MAX_DISPLAY_RECORDS} records (total: ${result.insertedCount})`
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
      log.error('Insert error', { error: err.message });
      throw new Error(`Insert failed: ${err.message}`);
    }
  },
};
