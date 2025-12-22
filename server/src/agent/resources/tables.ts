import pg from '../../plugins/pg';

export async function loadTables() {
  const result = await pg
    .select('table_name')
    .from('information_schema.tables')
    .where({ table_schema: 'public' });
  return result.map((row) => row.table_name);
}
