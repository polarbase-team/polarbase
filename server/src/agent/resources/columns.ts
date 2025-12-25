/**
 * Resource: Load detailed column information for a specific table.
 *
 * This function uses TableService.getSchema() to retrieve rich column metadata,
 * including data type (mapped to app-specific DataType), nullability, uniqueness,
 * default values, comments, validation rules (length, range, size, etc.),
 * and existing constraints.
 *
 * This provides much more accurate and useful information than querying
 * information_schema directly.
 *
 * @param tableName - Name of the table to fetch columns for
 * @returns {Promise<Array<object>>} Array of column objects with full details
 */
import { TableService } from '../../rest/services/table.service';
import { Column } from '../../rest/utils/column';

const tableService = new TableService();

export async function loadColumns(tableName: string) {
  try {
    // Retrieve full schema using TableService (respects schema logic and mapping)
    const schema = await tableService.getSchema({
      schemaName: 'public',
      tableName,
    });

    // Map to a clean, comprehensive format for tools to consume
    return schema.map(
      (col) =>
        ({
          name: col.name,
          type: col.dataType || 'unknown',
          nullable: col.nullable ?? true,
          unique: col.unique ?? false,
          defaultValue: col.defaultValue ?? undefined,
          comment: col.comment ?? undefined,
          validation: col.validation ?? undefined,
        }) as Partial<Column>
    );
  } catch (error) {
    throw new Error(
      `Failed to load columns for table "${tableName}": ${(error as Error).message}`
    );
  }
}
