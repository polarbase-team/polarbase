/**
 * Resource: Load list of accessible tables in the 'public' schema.
 *
 * @returns {Promise<Array<object>>} Array of table objects with full details
 */
import { TableService } from '../../rest/services/table.service';

/**
 * List of table names that are forbidden to access via this REST API.
 * Configured via environment variable AGENT_BLACKLISTED_TABLES (comma-separated).
 */
const AGENT_BLACKLISTED_TABLES = (
  process.env.AGENT_BLACKLISTED_TABLES || ''
).split(',');

const tableService = new TableService();

export async function loadTables() {
  const tables = await tableService.getAll({ schemaName: 'public' });
  return tables.filter((t) => !AGENT_BLACKLISTED_TABLES.includes(t.tableName));
}
