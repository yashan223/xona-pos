# Recall App

Recall is a desktop debugging journal and knowledge base designed to help developers catalog errors, trace connections, and rank successful solutions. It combines the reliability of a SQLite database with high-performance, custom in-memory data structures.

---

## Repository Structure

* [backend/](./backend) — Express API server storing records in SQLite and building in-memory structures.
* [recall-desktop/](./recall-desktop) — Electron desktop client built with React, TailwindCSS, and visual dashboards.

---

## Core Features & Data Structures

For a comprehensive explanation of our algorithm implementations and complexity analyses, refer to the [DATA_STRUCTURES.md](./DATA_STRUCTURES.md) documentation.

* **AVL Tree:** Organizes error messages alphabetically for $O(\log N)$ search lookups and prefix queries during autocomplete.
* **Max Heap:** Priority queue ranking solutions based on success rates, rating, and usage metrics to suggest the best solution first.
* **Graph:** Tracks bidirectional relationships between errors, solutions, stack technologies, and projects, feeding the interactive graph explorer.

---

## Quick Start

Ensure you have **Node.js** installed on your system.

### 1. Launch the Backend
Execute the helper script in the project root:
```powershell
.\run-backend.cmd
```
*Or manually: `cd backend && npm install && npm run dev`*

### 2. Launch the Desktop Client
Execute the helper script in the project root:
```powershell
.\run-frontend.cmd
```
*Or manually: `cd recall-desktop && npm install && npm start`*
