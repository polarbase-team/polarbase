import { FastMCP, UserError } from 'fastmcp';

export default function register(server: FastMCP) {
  server.addPrompt({
    name: 'suggestTableStructure',
    description: `
      Infers a valid JSON table structure suitable for use with the 'createTable' tool, based on a description of the table's purpose.
      Steps for AI:
      - Call 'findTables' to fetch the list of existing tables and ensure uniqueness of the suggested table name.
      - Derive a table name from the prompt. The table name must be alphanumeric, start with a letter or underscore, and not duplicate any existing table.
      - Infer an array of columns, each as an object with:
          - 'name': unique, valid SQL identifier for the column.
          - 'type': one of "integer", "double", "string", "text", "date", "timestamp", "boolean", "json", "enum", or "increment".
          - 'constraints': (optional) array of constraints such as 'primary key', 'not null', 'unique' for each column.
          - 'values': (required for 'enum' type) array of allowed string values.
          - 'references': (optional for foreign keys) object specifying { table: "<referenced_table>", column: "<referenced_column>", onDelete?: "...", onUpdate?: "..." }.
      - For an auto-increment primary key, set the column's type to 'increment' and include 'primary key' in constraints.
      - Avoid duplicate column names. All column/type/constraint combinations must follow standard SQL/knex naming and structure conventions.
      - Respond with a JSON object { tableName: string, columns: [ { name, type, constraints?, values?, references? } ] }.
      - Do not add example data or comments, only the structure definition.
      - See the documentation in 'createTable' for detailed requirements.
    `,
    arguments: [
      {
        name: 'prompt',
        description:
          "A description of the table's purpose. Use this to infer a suitable table name and columns.",
        required: true,
      },
    ],
    async load({ prompt }) {
      try {
        const tablesResource = await server.embedded('db://tables');
        const tables = JSON.parse(tablesResource.text || '[]') as string[];
        return `
          You are to draft the JSON structure for a SQL table based on this prompt: "${prompt}".
          1. Fetch 'db://tables' for the list of existing tables: ${JSON.stringify(tables)}.
          2. Generate a table name that is not present in ${JSON.stringify(tables)}, uses only alphanumeric characters and underscores, and starts with a letter or underscore.
          3. Infer columns as:
             - Each column must have a unique, valid SQL identifier as its name.
             - Each must specify a supported type: "integer", "double", "string", "text", "date", "timestamp", "boolean", "json", "enum", or "increment".
             - Include a 'constraints' array per column as needed, e.g. [ "primary key", "not null", "unique" ].
             - For 'enum', add a required 'values' array of allowed strings.
             - If the column is a foreign key, add a 'references' object specifying { table: "<referenced_table>", column: "<referenced_column>" }, and optionally 'onDelete' or 'onUpdate' with one of: "CASCADE", "SET NULL", "RESTRICT", "NO ACTION".
             - If an auto-increment primary key is needed, add a single column of type 'increment', constraints including 'primary key'.
          4. All names and types must match the requirements for the 'createTable' tool.
          5. Output only the JSON object in the following schema, no explanation or code comments:
          {
            "tableName": "<string>",
            "columns": [
              { 
                "name": "<string>", 
                "type": "<string>", 
                "constraints": ["primary key", ...], 
                "values": ["value1", ...], 
                "references": { 
                  "table": "<referenced_table>", 
                  "column": "<referenced_column>", 
                  "onDelete": "<CASCADE|SET NULL|RESTRICT|NO ACTION>", 
                  "onUpdate": "<CASCADE|SET NULL|RESTRICT|NO ACTION>" 
                } 
              }
              // Additional column objects...
            ]
          }
        `;
      } catch (error) {
        const err = error as any;
        throw new UserError(
          `Failed to fetch tables for structure suggestion: ${err.message}`
        );
      }
    },
  });
}
