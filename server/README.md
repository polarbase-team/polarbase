<div align="center">
   <img src="../assets/logo.png" width="120" height="120" alt="PolarBase">
   <br>
   <b>PolarBase Server</b>
   <div align="center">✨ ✨ ✨</div>
   <span>The Core Engine for Extensible Backends</span> <br>
   <br>
</div>

---

## 1. Overview

The **PolarBase Server** is a high-performance, extensible backend built on **Bun** and **ElysiaJS**. It acts as the orchestration layer between your PostgreSQL database and the world, providing secure REST endpoints, real-time capabilities, and native AI integration.

It is designed to be **Postgres-native**, using SQLite only for metadata to ensure your main database remains clean and portable.

## 2. Key Features

- **Dynamic REST API**: Automatically generates secure API endpoints for your PostgreSQL schema.
- **AI Agent Orchestration**: Native integration with Google Gemini and OpenAI for data reasoning and automated operations.
- **MCP Server**: Built-in Model Context Protocol server for seamless integration with AI IDEs and agents.
- **Real-time Engine**: WebSocket/SSE support for live data updates.
- **Secure by Default**: API key management and Super Admin controls.
- **SQLite Metadata**: Zero lock-in architecture—metadata is stored separately from your core data.

## 3. Tech Stack

- **Runtime**: [Bun](https://bun.sh) (>= 1.0)
- **Framework**: [ElysiaJS](https://elysiajs.com/)
- **Database Layer**: [Knex.js](https://knexjs.org/) & [PostgreSQL](https://www.postgresql.org/)
- **AI Integration**: [Vercel AI SDK](https://sdk.vercel.ai/)
- **MCP Protocol**: [FastMCP](https://github.com/punkpeye/fastmcp)
- **Validation**: TypeBox

## 4. Getting Started

### Prerequisites

- [Bun](https://bun.sh) (Recommended) or Node.js.
- [PostgreSQL](https://www.postgresql.org/) (>= 14.0).

### Installation

1. Navigate to the server directory:

   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

### Configuration

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   - `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, etc.: Your PostgreSQL connection details.
   - `GEMINI_API_KEY`: Required for AI Agent features.
   - `SUPER_ADMIN_API_KEY`: Your master key for initial setup.

### Development

Start the server in development mode:

```bash
bun run dev
```

The server will be available at `http://localhost:3000`.

### Database Migrations

PolarBase manages its own core schema. For custom migrations, you can use:

```bash
# Example knex commands if applicable
bun run knex migrate:latest
```

## 5. Directory Structure

- `src/rest`: Core REST API logic and dynamic routing.
- `src/agent`: AI Agent orchestration and logic.
- `src/mcp`: Model Context Protocol implementation.
- `src/plugins`: Core plugins for PostgreSQL and system initialization.
- `src/realtime`: WebSocket and SSE handlers for live updates.
- `src/api-keys`: API key management and validation.
- `src/auth`: Authentication and session handling.
- `src/utils`: Shared utilities and helper functions.

## 6. Related

- [PolarBase Main README](../README.md)
- [PolarBase Client](../client/README.md)

---

Made with ❤️ by the **polarbase-team**.
