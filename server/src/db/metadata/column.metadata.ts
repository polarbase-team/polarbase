import db from './metadata.db';

export interface ColumnMetadata {
  schemaName: string;
  tableName: string;
  columnName: string;
  uiName: string;
  format: any;
  createdAt?: string;
  updatedAt?: string;
}

// Create column_metadata table if it does not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS column_metadata (
    schema_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    column_name TEXT NOT NULL,
    ui_name TEXT,
    format TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (schema_name, table_name, column_name)
  );
`);

// Create index on 'key' column for quick lookups
db.exec(
  `CREATE INDEX IF NOT EXISTS idx_column_metadata ON column_metadata(schema_name, table_name, column_name)`
);

const SELECT_COLS = `
  schema_name AS schemaName, 
  table_name AS tableName, 
  column_name AS columnName, 
  ui_name AS uiName, 
  format AS format,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export function getAllColumnMetadata(schemaName: string, tableName: string) {
  const rows = db
    .query<
      ColumnMetadata,
      [string, string]
    >(`SELECT ${SELECT_COLS} FROM column_metadata WHERE schema_name = ? AND table_name = ?`)
    .all(schemaName, tableName);

  return rows.map((row) => ({
    ...row,
    format: row.format ? JSON.parse(row.format) : null,
  }));
}

export function getMultiColumnMetadata(
  schemaName: string,
  tableNames: string[]
) {
  if (tableNames.length === 0) return [];

  const placeholders = tableNames.map(() => '?').join(', ');
  const rows = db
    .query<
      ColumnMetadata,
      any[]
    >(`SELECT ${SELECT_COLS} FROM column_metadata WHERE schema_name = ? AND table_name IN (${placeholders})`)
    .all(schemaName, ...tableNames);

  return rows.map((row) => ({
    ...row,
    format: row.format ? JSON.parse(row.format) : null,
  }));
}

export function getColumnMetadata(
  schemaName: string,
  tableName: string,
  columnName: string
) {
  const row = db
    .query<
      ColumnMetadata,
      [string, string, string]
    >(`SELECT ${SELECT_COLS} FROM column_metadata WHERE schema_name = ? AND table_name = ? AND column_name = ?`)
    .get(schemaName, tableName, columnName);

  return row
    ? {
        ...row,
        format: row.format ? JSON.parse(row.format) : null,
      }
    : null;
}

export function setColumnMetadata(
  schemaName: string,
  tableName: string,
  columnName: string,
  metadata: {
    uiName?: string | null;
    format?: any | null;
  }
) {
  const insertCols: string[] = ['schema_name', 'table_name', 'column_name'];
  const insertVals: any[] = [schemaName, tableName, columnName];
  const updateSets: string[] = [];

  // Dynamically add only the fields provided in metadata
  if (metadata.uiName !== undefined) {
    insertCols.push('ui_name');
    insertVals.push(metadata.uiName);
    updateSets.push('ui_name = excluded.ui_name');
  }

  if (metadata.format !== undefined) {
    insertCols.push('format');
    const jsonFormat = metadata.format ? JSON.stringify(metadata.format) : null;
    insertVals.push(jsonFormat);
    updateSets.push('format = excluded.format');
  }

  // Update updatedAt
  updateSets.push('updated_at = CURRENT_TIMESTAMP');

  // If no metadata fields are provided, just do nothing or a simple insert
  if (updateSets.length === 1) {
    const sql = `INSERT OR IGNORE INTO column_metadata (schema_name, table_name, column_name) VALUES (?, ?, ?)`;
    return db.query(sql).run(schemaName, tableName, columnName);
  }

  const sql = `
    INSERT INTO column_metadata (${insertCols.join(', ')})
    VALUES (${insertCols.map(() => '?').join(', ')})
    ON CONFLICT(schema_name, table_name, column_name) 
    DO UPDATE SET ${updateSets.join(', ')};
  `;

  return db.query(sql).run(...insertVals);
}

export function deleteColumnMetadata(
  schemaName: string,
  tableName: string,
  columnName: string
) {
  return db
    .query(
      `DELETE FROM column_metadata WHERE schema_name = ? AND table_name = ? AND column_name = ?`
    )
    .run(schemaName, tableName, columnName);
}
