import { FastMCP, UserError } from 'fastmcp';

export default function register(server: FastMCP) {
  server.addPrompt({
    name: 'suggestTableStructure',
    description: `
      Infers a valid JSON table structure suitable for use with the 'createTable' tool, based on a description of the table's purpose.
      Steps for AI:
      - Call 'listTables' to fetch the list of existing tables and ensure uniqueness of the suggested table name.
      - Derive a table name from the prompt. The table name must be alphanumeric, start with a letter or underscore, and not duplicate any existing table.
      - Infer an array of columns, each as an object with:
          - 'name': unique, valid SQL identifier for the column.
          - 'dataType': one of "text", "long-text", "integer", "number", "date", "checkbox", "select", "multi-select", "email", "url", "json", "geo-point", "reference", "attachment", "auto-number", "auto-date", "formula".
          - 'nullable': (optional) boolean.
          - 'unique': (optional) boolean.
          - 'defaultValue': (optional) string.
          - 'comment': (optional) string.
          - 'options': (required for "select" or "multi-select") array of allowed string values.
          - 'foreignKey': (optional for "reference" type) object specifying { table: "<referenced_table>", column: { name: "<referenced_column>", type: "<type>" }, onUpdate?: "...", onDelete?: "..." }.
          - 'formula': (optional for "formula" type) object specifying { resultType: "...", expression: "...", strategy?: "..." }.
      - Respond with a JSON object { name: string, comment?: string, idType?: string, timestamps?: boolean, presentation?: { uiName?: string } }.
      - Do not add example data, only the structure definition.
      - See the documentation in 'createTable' and 'createColumn' for detailed requirements.
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
        const tables = JSON.parse(tablesResource.text || '[]') as any[];
        const existingNames = tables.map((t) =>
          typeof t === 'string' ? t : t.name
        );
        return `
          You are to draft the JSON structure for a SQL table based on this prompt: "${prompt}".
          1. Fetch 'db://tables' for the list of existing tables: ${JSON.stringify(existingNames)}.
          2. Generate a table name that is not present in ${JSON.stringify(existingNames)}, uses only alphanumeric characters and underscores, and starts with a letter or underscore.
          3. Infer columns follow the structured format:
             - Each column must have a unique, valid SQL identifier as its name.
             - Each must specify a supported dataType: "text", "long-text", "integer", "number", "date", "checkbox", "select", "multi-select", "email", "url", "email", "json", "geo-point", "reference", "attachment", "auto-number", "auto-date", "formula".
             - For 'select' or 'multi-select', add a required 'options' array of allowed strings.
             - If the column is a foreign key (reference), add a 'foreignKey' object.
             - If the column is a formula, add a 'formula' object.
          4. All names and types must match the requirements for the 'createTable' and 'createColumn' tools.
          5. Output only the JSON object, no explanation or code comments.
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
