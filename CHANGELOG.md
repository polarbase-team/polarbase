# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0-beta] - 2026-02-06

### Added

- **Formula Field**: Support for computed fields using PostgreSQL generated columns (stored and virtual). Features a robust formula editor with autocompletion, validation, and type-specific formatting (number, currency).
- **Loading Progress**: Integrated a global HTTP interceptor and progress indicator to provide visual feedback during background API operations.
- **JSON Editor**: Added `ngModel` support to the JSON editor for improved integration with Angular forms.

### Changed

- **Map View**: Standardized coordinate order to (latitude, longitude) and implemented persistence for map zoom levels.
- **UI/UX**: Enhanced column editor with required field validation and clearer error messaging.

## [0.7.0-beta] - 2026-02-04

### Added

- **Index Management**: Create and manage indexes for faster data retrieval.
- **Relation Diagram**: Visual ERD representation of table relationships using flow-based visualization.
- **API Key Schemas**: Added support for `schemaName` in API keys to scope access.
- **Nested Routing**: Implemented nested routing for better feature modularity.

### Changed

- **Refactoring**: Extracted studio-related logic to `BaseStudioComponent`.
- **Refactoring**: Relocated API key management to base details.
- **Performance**: Enhanced calendar responsiveness with `ResizeObserver`.
- **UI/UX**: Updated table editor ID type selection for better clarity.

## [0.6.4-beta] - 2026-02-01

### Added

- **Side Bar**: Support for caching side bar state.

### Changed

- **Refactoring**: Add `<ng-template #content></ng-template>` to `PrimeNG Popover/Dialog` components to lazy load content.

### Fixed

- **Table Record Manipulation**: Fixed issue by passing wrong table name to backend.

## [0.6.3-beta] - 2026-01-31

### Added

- **Drag-and-Drop Reordering**: Support for reordering table list and open tabs, with persistence.
- **Local Storage Layout Persistence**: View layout configurations (mode, column visibility, etc.) are now persisted locally for a better user experience.
- **UI Metadata Integration**: Enhanced table and column metadata handling with UI-friendly names.

### Changed

- **Component Refactoring**: Migrated multiple components to use centralized services like `ViewLayoutService` and `SearchBoxComponent`.
- **Filtering & Logic**: Consolidated record handling and formatting logic for better consistency.
- **Styling**: Unified confirm dialog styles and improved input focus behavior.

## [0.6.2-beta] - 2026-01-27

### Added

- **Display Column Selection**: Users can now select which column to display for reference fields.
- **Number Formatting**: Added options for currency and number formatting in the column editor.
- **Date Formatting**: Introduced selection of date formats and time display options.

### Changed

- **Schema & Validation**: Renamed table properties (`tableName` -> `name`) and enhanced validation patterns for range operators.
- **UI/UX Refinement**: Improved table editor layout and accessibility (label `for` attributes).
- **Type Safety**: Updated `DECIMAL` columns to `DOUBLE PRECISION` for improved precision.

## [0.6.1-beta] - 2026-01-24

### Added

- **Real-time Synchronization**: Integrated `TableRealtimeService` for live data updates across views.
- **Table Removal**: New functionality to remove tables directly from the UI.
- **Map View Enhancements**: Added marker click events and split toolbar templates.
- **Enhanced Data Validation**: Introduced custom PostgreSQL domains for email, URL, and attachment fields to ensure data integrity.

### Fixed

- **Leaflet Assets**: Corrected marker image loading issues in various environments.
- **Performance**: Improved initial load times with preconnect and preload links.

## [0.6.0-beta] - 2026-01-23

### Added

- **Calendar View**: New view mode to visualize records with date fields on a calendar.
- **Map View**: New view mode to visualize records with GeoPoint fields on a map.

### Fixed

- **GeoPoint Field**: Fixed issues with GeoPoint field data handling and display.

## [0.5.1-beta] - 2026-01-20

### Added

- **Dynamic Row Management**: Integrated spreadsheet component for dynamic row operations.

### Changed

- **Filtering**: Enhanced filter component and service functionality.
- **Sorting**: Simplified group and row sorting logic in table service.

## [0.5.0-beta] - 2026-01-18

### Added

- **Server-Sent Events (SSE)**: Implemented SSE and WebSocket support for real-time table updates.
- **Advanced Filtering**: Added 'Not Contains' operator and long text support to filter groups.
- **Spreadsheet Filtering**: Added filtering capabilities directly to the spreadsheet component.

### Changed

- **Field Components**: Updated Email and Website fields (refactored).
- **UI/UX**: Streamlined toolbar layout and HTML structure in table details.
- **Form Components**: Enhanced form components with improved selection options.

## [0.4.2-beta] - 2026-01-16

### Fixed

- **Table Loading**: Fixed issue by resetting columns and rows in `loadTable` method.

## [0.4.1-beta] - 2026-01-15

### Added

- **Confirmation Dialogs**: Added confirmation dialogs for unsaved changes in map picker and other editors.
- **Deletion Safety**: Enhanced confirmation dialog for deletion actions.

### Fixed

- **UI Styling**: Improved layout and styling in table detail and spreadsheet components.

## [0.4.0-beta] - 2026-01-14

### Added

- **Attachment Field Type**: Support for direct file uploads within records with centralized storage integration.
- **AutoNumber Field Type**: Automatic generation of unique, sequential integers for new records.
- **AutoDate Field Type**: Automatic timestamping (creation date/time) for new records.
- **Read-Only Integrity**: System-managed fields (AutoNumber/AutoDate) are automatically set to read-only in the UI.

### Changed

- **Schema Evolution**: Updated table designer to support system-managed field types.
- **Payload Handling**: Optimized backend to handle `multipart/form-data` for attachments.

### Fixed

- Fixed metadata sync issues occurring after table schema changes.
- Corrected CSS alignment for specialized icons in field selection dropdowns.

## [0.3.1-beta] - 2026-01-11

### Fixed

- General stability fixes and environment configuration updates.

## [0.3.0-beta] - 2026-01-11

### Added

- **Relational Data Support**: Implementation of **Reference** field types (Foreign Keys) to link records across tables.
- **Referential Actions**: Configurable `onUpdate` and `onDelete` actions (Cascade, Set Null) in the column editor.
- **Enhanced Column Editor**: Added validation patterns and character limits for table/column names.

### Changed

- **Breaking Change**: Migrated `Select` and `Multi-Select` fields from legacy `Enum` types to `Text`/`Text[]` with **Check Constraints** for better flexibility and backend compatibility.
- **Refactored Architecture**: Unified drawer components into a base `DrawerComponent` for better maintainability.

### Fixed

- Improved API error messaging and validation feedback for REST routes.

## [0.2.1-beta] - 2026-01-07

### Fixed

- UI performance improvements and minor bug fixes in the spreadsheet view.

## [0.2.0-beta] - 2026-01-07

### Added

- **Advanced Field Types**: Added support for **GeoPoint**, **Multi-Select**, **Email**, and **URL** fields with validation.
- **Smart Table Editor**: Added field descriptions and "Required" indicators.

### Changed

- **Standardized API**: Replaced legacy interfaces with a unified `ApiResponse` model.
- **Responsive Layout**: Migrated spreadsheet and table details to a more fluid, responsive UI.

### Fixed

- Resolved REST communication layer bugs.
- Fixed Enum column retrieval and default value handling in schemas.

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
