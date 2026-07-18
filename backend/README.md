# ⚙️ Xona POS Backend API Server

The Xona POS backend is a high-performance Express REST API server built with TypeScript, Node.js, `better-sqlite3`, and Mongoose.

---

## ⚡ Core Responsibilities

* **Cloud MongoDB Database**: Connects to remote Cloud MongoDB for long-term transaction and catalog persistence.
* **Local SQLite Fallback (`pos_local.db`)**: Maintains a WAL-enabled local SQLite database file at `backend/data/pos_local.db` for instant offline queries.
* **Background Sync Engine (`syncEngine.ts`)**: Monitors cloud connectivity and automatically syncs unsynced local SQLite records up to Cloud MongoDB.
* **PDF Sales Report Generator**: Generates formatted PDF sales summaries and invoices.
* **WebSocket Server (`ws`)**: Broadcasts real-time inventory updates across connected desktop registers.

---

## 🚀 Quick Start

```bash
cd backend
npm install
npm run dev
```

---

## 🔗 Related Documentation

* [Main Project README](../README.md)
* [System Architecture Guide](../ARCHITECTURE.md)
* [Database Schema Guide](../database/README.md)
