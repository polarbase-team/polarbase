import pg from '../../plugins/pg';

export interface Index {
  name: string;
  tableName: string;
  columnNames: string[];
  unique?: boolean;
  type?: 'btree' | 'hash' | 'gist' | 'gin' | 'brin' | 'spgist';
}

export class IndexService {
  /**
   * List indexes for a specific table or all tables in a schema.
   */
  async getAll({
    schemaName = 'public',
    tableName,
  }: {
    schemaName?: string;
    tableName?: string;
  } = {}) {
    const query = pg.raw(
      `
      SELECT
        ix.relname AS index_name,
        t.relname AS table_name,
        i.indisunique AS is_unique,
        am.amname AS index_type,
        JSON_AGG(a.attname ORDER BY array_position(i.indkey, a.attnum)) AS column_names
      FROM
        pg_class t
        JOIN pg_index i ON t.oid = i.indrelid
        JOIN pg_class ix ON ix.oid = i.indexrelid
        JOIN pg_am am ON ix.relam = am.oid
        JOIN pg_attribute a ON t.oid = a.attrelid AND a.attnum = ANY(i.indkey)
        JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE
        n.nspname = ?
        ${tableName ? 'AND t.relname = ?' : ''}
        AND t.relkind = 'r'
      GROUP BY
        t.relname,
        ix.relname,
        i.indisunique,
        am.amname;
      `,
      [schemaName, ...(tableName ? [tableName] : [])]
    );

    const result = await query;
    return result.rows.map((row: any) => ({
      name: row.index_name,
      tableName: row.table_name,
      columnNames: row.column_names || [],
      unique: row.is_unique,
      type: row.index_type,
    }));
  }

  /**
   * Create a new index.
   */
  async createIndex({
    schemaName = 'public',
    index,
  }: {
    schemaName?: string;
    index: Index;
  }) {
    const { name, tableName, columnNames, unique, type } = index;
    const columns = columnNames.map((c) => `"${c}"`).join(', ');

    const uniqueStr = unique ? 'UNIQUE' : '';
    const typeStr = type ? `USING ${type}` : '';

    await pg.raw(
      `CREATE ${uniqueStr} INDEX "${name}" ON "${schemaName}"."${tableName}" ${typeStr} (${columns})`
    );

    return index;
  }

  /**
   * Delete an index.
   */
  async deleteIndex({
    schemaName = 'public',
    indexName,
  }: {
    schemaName?: string;
    indexName: string;
  }) {
    // In Postgres, indexes are dropped by name within the schema
    await pg.raw(`DROP INDEX IF EXISTS "${schemaName}"."${indexName}"`);
  }
}
