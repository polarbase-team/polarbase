import sqlite from '../../plugins/sqlite';

export interface ColumnMetadata {
  schemaName: string;
  tableName: string;
  columnName: string;
  uiName: string;
  format: any;
}

export const db = sqlite;

// Create column_metadata table if it does not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS column_metadata (
    schemaName TEXT NOT NULL,
    tableName TEXT NOT NULL,
    columnName TEXT NOT NULL,
    uiName TEXT,
    format TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (schemaName, tableName, columnName)
  );
`);

// Create index on 'key' column for quick lookups
db.exec(
  `CREATE INDEX IF NOT EXISTS idx_column_metadata ON column_metadata(schemaName, tableName, columnName)`
);

export function getAllColumnMetadata(schemaName: string, tableName: string) {
  const rows = db
    .query<
      ColumnMetadata,
      [string, string]
    >(`SELECT * FROM column_metadata WHERE schemaName = ? AND tableName = ?`)
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
    >(`SELECT * FROM column_metadata WHERE schemaName = ? AND tableName IN (${placeholders})`)
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
    >(`SELECT * FROM column_metadata WHERE schemaName = ? AND tableName = ? AND columnName = ?`)
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
  const insertCols: string[] = ['schemaName', 'tableName', 'columnName'];
  const insertVals: any[] = [schemaName, tableName, columnName];
  const updateSets: string[] = [];

  // Dynamically add only the fields provided in metadata
  if (metadata.uiName !== undefined) {
    insertCols.push('uiName');
    insertVals.push(metadata.uiName);
    updateSets.push('uiName = excluded.uiName');
  }

  if (metadata.format !== undefined) {
    insertCols.push('format');
    const jsonFormat = metadata.format ? JSON.stringify(metadata.format) : null;
    insertVals.push(jsonFormat);
    updateSets.push('format = excluded.format');
  }

  // If no metadata fields are provided, just do nothing or a simple insert
  if (updateSets.length === 0) {
    const sql = `INSERT OR IGNORE INTO column_metadata (schemaName, tableName, columnName) VALUES (?, ?, ?)`;
    return db.query(sql).run(schemaName, tableName, columnName);
  }

  const sql = `
    INSERT INTO column_metadata (${insertCols.join(', ')})
    VALUES (${insertCols.map(() => '?').join(', ')})
    ON CONFLICT(schemaName, tableName, columnName) 
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
      `DELETE FROM column_metadata WHERE schemaName = ? AND tableName = ? AND columnName = ?`
    )
    .run(schemaName, tableName, columnName);
}
