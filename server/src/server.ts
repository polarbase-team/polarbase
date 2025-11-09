import express, {
  type Application,
  type Request,
  type Response,
} from 'express';
import { mcpServer } from './mcp/server';

// Start the MCP server
mcpServer
  .start({
    transportType: 'httpStream',
    httpStream: {
      port: 8080,
    },
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
  });

// Start the main app
const app: Application = express();
const PORT: number = 3000;

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from Express with TypeScript!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
