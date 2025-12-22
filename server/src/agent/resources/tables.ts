/**
 * Resource: Load list of accessible tables in the 'public' schema.
 *
 * @returns {Promise<Array<object>>} Array of table objects with full details
 */
import { TableService } from '../../rest/services/table.service';

const tableService = new TableService();

export async function loadTables() {
  const allowedTables = await tableService.getAll({ schemaName: 'public' });
  return allowedTables;
}
