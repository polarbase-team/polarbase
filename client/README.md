<div align="center">
   <img src="../assets/logo.png" width="120" height="120" alt="PolarBase">
   <br>
   <b>PolarBase Client</b>
   <div align="center">✨ ✨ ✨</div>
   <span>Modern Multi-view UI for Your Data</span> <br>
   <br>
</div>

---

## 1. Overview

The **PolarBase Client** is the frontend application of the PolarBase ecosystem. Built with **Angular**, it provides an intuitive, high-performance interface for managing PostgreSQL databases through multiple specialized views.

This client is designed to bridge the gap between complex database operations and user-friendly workflows, offering a spreadsheet-like experience with additional power-user features.

## 2. Key Features

- **Multi-View Interface**:
  - 📊 **Spreadsheet View**: Rapid data editing and filtering.
  - 📅 **Calendar View**: Manage time-based data effectively.
  - 🗺️ **Map View**: Visualize geospatial data via Leaflet integration.
- **AI-Powered Workflows**: Integrated interface for interacting with the PolarBase AI Agent.
- **Dynamic Theming**: Modern, responsive design powered by PrimeNG and Tailwind CSS.
- **Real-time Synchronization**: Instant updates reflecting backend changes.

## 3. Tech Stack

- **Framework**: Angular (>= 17.0)
- **UI Components**: [PrimeNG](https://primeng.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Maps**: [Leaflet](https://leafletjs.com/)
- **Calendar**: [FullCalendar](https://fullcalendar.io/)
- **Icons**: Lucide Angular
- **Runtime/Package Manager**: Bun

## 4. Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed on your machine.
- A running [PolarBase Server](../server/README.md).

### Installation

1. Navigate to the client directory:

   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

### Development

Start the development server:

```bash
bun start
```

The application will be available at `http://localhost:4200`.

### Build

To create a production build:

```bash
bun run build
```

The artifacts will be stored in the `dist/` directory.

## 5. Architecture

The client follows a modular Angular architecture:

- `src/app/core`: Core services (Authentication, API clients, Guards).
- `src/app/shared`: Reusable components, pipes, and directives.
- `src/app/features`: Main application feature modules (Base, Workspace, Settings).

## 6. Related

- [PolarBase Main README](../README.md)
- [PolarBase Server](../server/README.md)

---

Made with ❤️ by the **polarbase-team**.
