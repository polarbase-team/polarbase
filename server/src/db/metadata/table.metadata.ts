import db from './metadata.db';

export interface TableMetadata {
  schemaName: string;
  tableName: string;
  uiName: string;
  createdAt?: string;
  updatedAt?: string;
}

// Create table_metadata table if it does not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS table_metadata (
    schema_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    ui_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (schema_name, table_name)
  );
`);

// Create index on 'key' column for quick lookups
db.exec(
  `CREATE INDEX IF NOT EXISTS idx_table_metadata ON table_metadata(schema_name, table_name)`
);

const SELECT_COLS = `
  schema_name AS schemaName, 
  table_name AS tableName, 
  ui_name AS uiName, 
  created_at AS createdAt, 
  updated_at AS updatedAt
`;

export function getAllTableMetadata(schemaName: string) {
  return db
    .query<
      TableMetadata,
      [string]
    >(`SELECT ${SELECT_COLS} FROM table_metadata WHERE schema_name = ?`)
    .all(schemaName);
}

export function getTableMetadata(schemaName: string, tableName: string) {
  return db
    .query<
      TableMetadata,
      [string, string]
    >(`SELECT ${SELECT_COLS} FROM table_metadata WHERE schema_name = ? AND table_name = ?`)
    .get(schemaName, tableName);
}

export function setTableMetadata(
  schemaName: string,
  tableName: string,
  metadata: {
    uiName?: string | null;
  }
) {
  const insertCols: string[] = ['schema_name', 'table_name'];
  const insertVals: any[] = [schemaName, tableName];
  const updateSets: string[] = [];

  // Dynamically add only the fields provided in metadata
  if (metadata.uiName !== undefined) {
    insertCols.push('ui_name');
    insertVals.push(metadata.uiName);
    updateSets.push('ui_name = excluded.ui_name');
  }

  // Update updatedAt
  updateSets.push('updated_at = CURRENT_TIMESTAMP');

  // If no metadata fields are provided, just do nothing or a simple insert
  if (updateSets.length === 1) {
    const sql = `INSERT OR IGNORE INTO table_metadata (schema_name, table_name) VALUES (?, ?)`;
    return db.query(sql).run(schemaName, tableName);
  }

  const sql = `
    INSERT INTO table_metadata (${insertCols.join(', ')})
    VALUES (${insertCols.map(() => '?').join(', ')})
    ON CONFLICT(schema_name, table_name) 
    DO UPDATE SET ${updateSets.join(', ')};
  `;

  return db.query(sql).run(...insertVals);
}

export function deleteTableMetadata(schemaName: string, tableName: string) {
  return db
    .query(
      `DELETE FROM table_metadata WHERE schema_name = ? AND table_name = ?`
    )
    .run(schemaName, tableName);
}
