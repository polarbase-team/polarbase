import { FastMCP } from 'fastmcp';
import registerTablesResource from './resources/tables.ts';
import registerColumnsResource from './resources/columns.ts';
import registerSuggestTableStructureTool from './tools/suggest_table_structure.ts';
import registerCreateTableTool from './tools/create_table.ts';
import registerSelectFromTableTool from './tools/select_from_table.ts';
import registerInsertIntoTableTool from './tools/insert_into_table.ts';
import registerUpsertIntoTableTool from './tools/upsert_into_table.ts';
import registerUpdateFromTableTool from './tools/update_from_table.ts';
import registerDeleteFromTableTool from './tools/delete_from_table.ts';

export const mcpServer = new FastMCP({
  name: 'Database Server',
  version: '1.0.0',
  instructions: `
    This server manages a database through resources, tools, and prompts.
    To understand the database structure:
    - Use 'db://tables' to get a JSON array of existing table names.
    - Use 'db://table/{tableName}/columns' to get columns and their data types for a specific table.
    To create a table:
    - Use 'suggestTableStructure' to analyze a user prompt and generate a JSON table structure.
    - Use 'createTable' with the prompt and structure.
    - Steps for AI:
      1. Fetch 'db://tables' to ensure the table name is unique.
      2. Call 'suggestTableStructure' to infer table name and columns.
      3. Pass the structure to 'createTable'.
    To manipulate data:
    - Use 'insertIntoTable', 'upsertIntoTable', 'updateFromTable', or 'deleteFromTable'.
    - For all tools, set 'preview' to true to preview the SQL query without executing.
    - Set 'confirm' to true to execute when 'preview' is false; otherwise, an error is thrown.
    - Validate table names with 'db://tables' and column names with 'db://table/{tableName}/columns'.
  `,
});

// Register resources
registerTablesResource(mcpServer);
registerColumnsResource(mcpServer);

// Register tools
registerSuggestTableStructureTool(mcpServer);
registerCreateTableTool(mcpServer);
registerSelectFromTableTool(mcpServer);
registerInsertIntoTableTool(mcpServer);
registerUpsertIntoTableTool(mcpServer);
registerUpdateFromTableTool(mcpServer);
registerDeleteFromTableTool(mcpServer);
