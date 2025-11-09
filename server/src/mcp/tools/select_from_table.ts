import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import db from '../../database/db';

export default function register(server: FastMCP) {
  server.addTool({
    name: 'selectFromTable',
    description: `
      Selects data from a database table using Knex.js. Supports grouping, ordering, filtering, and pagination.
      Steps for AI:
      - Call 'findTables' to get a list of valid table names and use one in the 'from' parameter.
      - Call 'findColumns' with the chosen table name to validate column names for 'select', 'where', 'group', and 'order'.
    `,
    parameters: z.object({
      select: z
        .string()
        .describe(
          "Columns to select, e.g., 'column1, column2' or '*'. Call 'findColumns' to validate column names for the table."
        ),
      from: z
        .string()
        .describe(
          "Name of the table to query. Call 'findTables' to get valid table names."
        ),
      where: z
        .record(z.any(), z.any())
        .optional()
        .describe(
          "Key-value pairs for WHERE conditions, e.g., { age: 25 }. Keys must be valid column names; call 'findColumns' to validate."
        ),
      group: z
        .string()
        .optional()
        .describe(
          "Columns for GROUP BY, e.g., 'column1, column2'. Call 'findColumns' to validate column names."
        ),
      order: z
        .string()
        .optional()
        .describe(
          "Columns for ORDER BY, e.g., 'column1 ASC, column2 DESC'. Call 'findColumns' to validate column names."
        ),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of rows to return.'),
      offset: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Number of rows to skip.'),
    }),
    annotations: {
      title: 'Select Data from Table',
      readOnlyHint: true,
      openWorldHint: false,
    },
    async execute(args, { log }) {
      try {
        const { select, from, where, group, order, limit, offset } = args;

        // Validate that 'from' is not a resource URI
        if (from.startsWith('db://')) {
          throw new UserError(
            "Invalid table name: 'from' parameter cannot be a resource URI like 'db://tables'. Fetch valid table names from 'db://tables'."
          );
        }

        // Validate table name against db://tables
        const tablesResource = await server.embedded('db://tables');
        const tables = JSON.parse(tablesResource.text || '[]') as string[];
        if (!tables.includes(from)) {
          throw new UserError(
            `Table '${from}' does not exist. Fetch valid table names from 'db://tables': ${JSON.stringify(
              tables
            )}`
          );
        }

        // Build Knex query
        const columns =
          select === '*' ? '*' : select.split(',').map((col) => col.trim());
        let query = db.select(columns).from(from);

        // Apply WHERE clause
        if (where) {
          query = query.where(where);
        }

        // Apply GROUP BY clause
        if (group) {
          const groupColumns = group.split(',').map((col) => col.trim());
          query = query.groupBy(groupColumns);
        }

        // Apply ORDER BY clause
        if (order) {
          const orderClauses = order.split(',').map((clause) => {
            const [column, direction = 'ASC'] = clause.trim().split(/\s+/);
            return { column, order: direction.toUpperCase() };
          });
          query = query.orderBy(orderClauses);
        }

        // Apply LIMIT and OFFSET
        if (limit) {
          query = query.limit(limit);
        }
        if (offset) {
          query = query.offset(offset);
        }

        // Execute query
        const results = await query;

        // Log query completion
        log.info('Query completed', { rowCount: results.length });

        // Return results
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'success',
                  data: results,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const err = error as Error;
        log.error('Query error', { error: err.message });
        throw new UserError(err.message || 'Failed to execute query');
      }
    },
  });
}
