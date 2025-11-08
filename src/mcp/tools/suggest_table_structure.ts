import { FastMCP, UserError } from 'fastmcp';

export default function register(server: FastMCP) {
  server.addPrompt({
    name: 'suggestTableStructure',
    description: `
      Suggests a JSON table structure based on a user prompt describing the table's purpose.
      Steps for AI:
      - Call 'findTables' to ensure the suggested table name is unique.
      - Derive a table name from the prompt, converting it to a valid SQL identifier (alphanumeric, starting with a letter or underscore).
      - Infer columns based on the prompt's intent, using types: integer, numeric, varchar, text, date, timestamp, boolean.
      - Include an 'id' column with 'primary key' and 'generated always as identity' unless inappropriate.
      - Ensure column names are unique and follow SQL naming conventions.
      - Return a JSON object with 'tableName' and 'columns' fields.
    `,
    arguments: [
      {
        name: 'prompt',
        description:
          "Description of the table's purpose, used to infer the table structure.",
        required: true,
      },
    ],
    async load({ prompt }) {
      try {
        const tablesResource = await server.embedded('db://tables');
        const tables = JSON.parse(tablesResource.text || '[]') as string[];
        return `
          Analyze the prompt "${prompt}" to suggest a JSON table structure.
          - Fetch 'db://tables' to check existing tables: ${JSON.stringify(tables)}.
          - Derive a valid SQL table name from the prompt (alphanumeric, starting with a letter or underscore).
          - Ensure the table name is unique (not in ${JSON.stringify(tables)}).
          - Infer columns based on the prompt's intent, using types: integer, numeric, varchar, text, date, timestamp, boolean.
          - Include an 'id' column with 'primary key' and 'generated always as identity' unless the prompt suggests otherwise.
          - Ensure column names are unique and valid SQL identifiers.
          - Return a JSON object with 'tableName' and 'columns' fields, where each column has 'name', 'type', and optional 'constraints' array.
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
