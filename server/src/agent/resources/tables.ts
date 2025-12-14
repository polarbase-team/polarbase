import pg from '../../plugins/pg';

export async function loadTables() {
  const result = await pg
    .select('table_name')
    .from('information_schema.tables')
    .where({ table_schema: 'public' });
  const tables = result.map((row) => row.table_name);
  return {
    text: JSON.stringify(tables, null, 2),
  };
}
