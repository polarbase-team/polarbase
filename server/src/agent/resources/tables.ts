import db from '../../plugins/db';

export async function loadTables() {
  const result = await db
    .select('table_name')
    .from('information_schema.tables')
    .where({ table_schema: 'public' });
  const tables = result.map((row) => row.table_name);
  return {
    text: JSON.stringify(tables, null, 2),
  };
}
