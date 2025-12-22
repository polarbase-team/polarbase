import pg from '../../plugins/pg';

export async function loadColumns(tableName: string) {
  try {
    const columns = await pg
      .select('column_name', 'data_type')
      .from('information_schema.columns')
      .where({ table_schema: 'public', table_name: tableName });
    if (columns.length === 0) {
      throw new Error(`Table ${tableName} not found or has no columns`);
    }
    return columns;
  } catch (error) {
    const err = error as any;
    throw new Error(
      `Failed to fetch columns for table ${tableName}: ${err.message}`
    );
  }
}
