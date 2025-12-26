# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-beta] - 2025-12-26

### Added

#### 🏗️ Core & Infrastructure

- **Postgres-Native Engine:** Initial release with direct PostgreSQL integration for high-performance data operations.
- **Clean Schema Architecture:** Implemented metadata storage using SQLite, ensuring the main PostgreSQL database remains untouched by platform-specific data.
- **Realtime Sync:** Integrated WebSocket support for live data updates across the client and server.
- **High-Performance Stack:** Core backend built with Bun and ElysiaJS for minimal overhead.

#### 🖥️ Interface (Spreadsheet UI)

- **Spreadsheet-style Management:** Comprehensive interface for viewing, editing, and managing PostgreSQL tables as a spreadsheet.
- **Super Admin Panel:** Dedicated secure portal for initial setup and system-wide administration.
- **API Key Management:** UI for generating and revoked keys to control access to REST APIs and AI features.

#### 🤖 AI & Agentic Features

- **MCP Server Integration:** Native support for the Model Context Protocol (MCP) to streamline database administration via AI tools.
- **Intelligent Database Agent:** An AI-driven agent capable of assisting with database operations without manual SQL generation.
- **Multi-Model Support:** Built-in compatibility for Google Gemini (default) and OpenAI providers.

#### 🛠️ Developer Experience (DX)

- **Auto-generated REST API:** Instant API endpoints for all connected PostgreSQL tables.
- **Docker Support:** Provided `docker-compose` configuration for easy, one-command deployment.

---

## [Unreleased]

_See [ROADMAP.md](./ROADMAP.md) for upcoming features like Multi-view, Reference Fields, and SDKs._
