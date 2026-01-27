import sqlite from '../../plugins/sqlite';

export interface TableMetadata {
  schemaName: string;
  tableName: string;
  uiName: string;
}
export const db = sqlite;

// Create table_metadata table if it does not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS table_metadata (
    schemaName TEXT NOT NULL,
    tableName TEXT NOT NULL,
    uiName TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (schemaName, tableName)
  );
`);

// Create index on 'key' column for quick lookups
db.exec(
  `CREATE INDEX IF NOT EXISTS idx_table_metadata ON table_metadata(schemaName, tableName)`
);

export function getAllTableMetadata(schemaName: string) {
  return db
    .query<
      TableMetadata,
      [string]
    >(`SELECT * FROM table_metadata WHERE schemaName = ?`)
    .all(schemaName);
}

export function getTableMetadata(schemaName: string, tableName: string) {
  return db
    .query<
      TableMetadata,
      [string, string]
    >(`SELECT * FROM table_metadata WHERE schemaName = ? AND tableName = ?`)
    .get(schemaName, tableName);
}

export function setTableMetadata(
  schemaName: string,
  tableName: string,
  metadata: {
    uiName?: string | null;
  }
) {
  const insertCols: string[] = ['schemaName', 'tableName'];
  const insertVals: any[] = [schemaName, tableName];
  const updateSets: string[] = [];

  // Dynamically add only the fields provided in metadata
  if (metadata.uiName !== undefined) {
    insertCols.push('uiName');
    insertVals.push(metadata.uiName);
    updateSets.push('uiName = excluded.uiName');
  }

  // If no metadata fields are provided, just do nothing or a simple insert
  if (updateSets.length === 0) {
    const sql = `INSERT OR IGNORE INTO table_metadata (schemaName, tableName) VALUES (?, ?)`;
    return db.query(sql).run(schemaName, tableName);
  }

  const sql = `
    INSERT INTO table_metadata (${insertCols.join(', ')})
    VALUES (${insertCols.map(() => '?').join(', ')})
    ON CONFLICT(schemaName, tableName) 
    DO UPDATE SET ${updateSets.join(', ')};
  `;

  return db.query(sql).run(...insertVals);
}

export function deleteTableMetadata(schemaName: string, tableName: string) {
  return db
    .query(`DELETE FROM table_metadata WHERE schemaName = ? AND tableName = ?`)
    .run(schemaName, tableName);
}
