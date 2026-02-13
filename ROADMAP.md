# 🗺️ PolarBase Roadmap

Our mission is to build the most extensible open-source backend engine for PostgreSQL. This roadmap outlines our progress and the features we are building to empower developers.

---

## ✅ Completed (Available Now)

### 🏗️ Core Infrastructure & Backend

- **PostgreSQL Native Engine:** Direct harness of Postgres power for optimal performance.
- **REST API for DB:** Secure and efficient API endpoints to interact directly with your database.
- **Realtime for DB:** Dynamic data handling with real-time updates via WebSocket.
- **Clean Architecture:** Metadata stored in SQLite to ensure **Zero Vendor Lock-in** for your main PostgreSQL database.
- **Performance-First Runtime:** Built with **Bun**, **ElysiaJS**, and **PostgreSQL**.
- **Relational Engine**: Support for Reference fields and Foreign Keys.
- **Advanced Field Types**: GeoPoint, Email, URL, Multi-Select.
- **System Fields**: AutoNumber, AutoDate.
- **File Management**: Attachment field type with storage integration.
- **Multi-View Foundation:** Building the core architecture to support switching between different data lenses (Spreadsheet, Calendar, Map,...).
- **Advanced Filtering:** Support for single and group conditions for complex datasets.

### 🖥️ Interface & Experience

- **Spreadsheet-UI:** A user-friendly, Excel-like interface for intuitive data visualization and manipulation.
- **Calendar View:** Visualize records with date fields on a calendar.
- **Map View:** Visualize records with GeoPoint fields on a map.
- **API Key Management:** Generate and manage keys for controlled access to REST API or AI features.
- **Super Admin Control:** Secure administrative access via a dedicated Super Admin Key.
- **Layout Configuration Persistence:** View configurations (column widths, filters, view states) are persisted via **LocalStorage** for a seamless client-side experience.

### 🤖 AI & Integration

- **MCP Server for DB:** Native Model Context Protocol server for streamlined database administration.
- **AI Agent for DB:** Intelligent agent to assist with database operations without manual SQL generation.
- **Multi-Provider Support:** Integration with Google Gemini (default) and OpenAI.
- **Natural Language Schema:** Describe requirements and the Agent will update the DB schema.
- **Local AI Support:** Integration with local inference servers like **LM Studio**.
- **Agent Orchestration**: Specialized sub-agents (Builder, Query, Lookup, Editor) for improved task accuracy.
- **Agent Call Approval:** Human-in-the-loop security for high-risk operations (Delete/Drop).
- **Document Analysis:** Upload files to the Agent for data extraction and analysis.

### ⚙️ Data & Schema Management

- **Index Management:** Create and manage indexes for faster data retrieval.
- **Relation Diagram:** Visual ERD representation of table relationships.
- **Formula Fields:** Support for stored and virtual generated columns with a robust formula engine.

---

## 🏗️ In Development (Upcoming)

### 🗄️ Multi-Schema Management

- **Isolated Schema Support:** Ability to create, manage, and toggle between multiple PostgreSQL schemas within a single database instance.
- **Schema-Scoped Operations:** Dedicated API endpoints and UI contexts that respect schema boundaries.

### 🤖 Agentic Backend (AI & MCP)

- **AI Query View:** Dedicated UI to view full result sets from AI queries.

### ⚙️ Data & Schema Management

- **Copy Table Schema:** Quickly duplicate table structures.
- **Import/Export:** Support for Database Schema and Table Data (CSV/JSON).

### 🖼️ Advanced Views & UI

- **Query View:** Visual SQL builder for complex PostgreSQL queries.
- **S3 Storage:** Integrate S3 storage.

### 🔗 Extensibility & Integration

- **Webhooks Engine:** Trigger HTTP POST requests on data events.
- **API Playground:** Built-in Swagger/OpenAPI interface for instant testing.
- **SDKs:** Official client libraries for **JavaScript** and **Dart**.

---

## 🔍 Researching (Future)

### 🗄️ Multi-Schema Management

- **Schema Migrations:** Visual tools to track and manage versioning for individual schemas.

### 🖼️ Advanced Views & UI

- **Form Builder:** Specialized views for data entry.
- **Dashboard Builder:** Custom widgets and charts for real-time insights.
- **Dark Mode:** System-wide dark theme support.

### 🔗 Extensibility & Integration

- **Cron Jobs:** Scheduled tasks runner for periodic data operations.

### 🛡️ Enterprise & DevOps

- **Open Auth:** Built-in authentication system (OAuth, OTP) stored on-platform.
- **Database Snapshots:** Backup and restore database schemas and data.
- **CLI Tool:** Command-line interface for deployments and environment configs.
- **Audit Logs:** Detailed tracking of every change for compliance.
- **Pglite Integration:** Enabling "One-click Installation" capabilities.

### 🗄️ Database Ecosystem

- **CockroachDB Integration:** Researching compatibility with CockroachDB for distributed SQL and global scaling capabilities.

---

## 📈 Long-term Vision

Polarbase aims to be the go-to engine for developers building custom enterprise solutions. We focus on **extensibility**—ensuring that every part of the system can be customized or replaced to fit your business logic.

---

> **Note:** This roadmap is a living document. We prioritize features based on community feedback. If you have any suggestions, please [open an issue](https://github.com/polarbase-team/polarbase/issues)!
