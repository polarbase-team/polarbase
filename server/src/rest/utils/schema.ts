import { Knex } from 'knex';

export interface EnumType {
  schemaName: string;
  enumName: string;
  enumValues: string[];
}

export const getEnumTypes = async (pg: Knex, schemaName = 'public') => {
  const result = await pg.raw<{ rows: EnumType[] }>(
    `
    SELECT 
      n.nspname AS "schemaName",
      t.typname AS "enumName",
      array_agg(e.enumlabel ORDER BY e.enumsortorder)::text[] AS "enumValues"
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typtype = 'e'
      AND n.nspname = ?
    GROUP BY n.nspname, t.typname
    ORDER BY n.nspname, t.typname;
    `,
    [schemaName]
  );
  return result.rows;
};
