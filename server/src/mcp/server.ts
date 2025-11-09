import { FastMCP } from 'fastmcp';
import registerTablesResource from './resources/tables';
import registerColumnsResource from './resources/columns';
import registerSuggestTableStructureTool from './tools/suggest_table_structure';
import registerFindTablesTool from './tools/find_tables';
import registerFindColumnsTool from './tools/find_coumns';
import registerCreateTableTool from './tools/create_table';
import registerSelectFromTableTool from './tools/select_from_table';
import registerInsertIntoTableTool from './tools/insert_into_table';
import registerUpsertIntoTableTool from './tools/upsert_into_table';
import registerUpdateFromTableTool from './tools/update_from_table';
import registerDeleteFromTableTool from './tools/delete_from_table';

export const mcpServer = new FastMCP({
  name: 'Database Server',
  version: '1.0.0',
  instructions: `
    I am an AI assistant for managing a database through tools and prompts.
    To understand the database structure:
    - Use the 'findTables' tool to get a JSON array of existing table names.
    - Use the 'findColumns' tool with a valid table name from 'findTables' to get columns and their data types.
    To create a table:
    - Call 'findTables' to ensure the table name is unique.
    - Use 'suggestTableStructure' to generate a JSON structure based on the user prompt.
    - Use 'createTable' with the prompt and structure.
    To manipulate data:
    - Call 'findTables' to validate table names for 'table' or 'from' parameters.
    - Call 'findColumns' to validate column names for 'select', 'data', 'where', 'conflictTarget', or 'updateColumns'.
    - Use 'selectFromTable', 'insertIntoTable', 'upsertIntoTable', 'updateTable', or 'deleteFromTable'.
  `,
});

// Register resources
registerTablesResource(mcpServer);
registerColumnsResource(mcpServer);

// Register tools
registerFindTablesTool(mcpServer);
registerFindColumnsTool(mcpServer);
registerCreateTableTool(mcpServer);
registerSuggestTableStructureTool(mcpServer);
registerSelectFromTableTool(mcpServer);
registerInsertIntoTableTool(mcpServer);
registerUpsertIntoTableTool(mcpServer);
registerUpdateFromTableTool(mcpServer);
registerDeleteFromTableTool(mcpServer);
