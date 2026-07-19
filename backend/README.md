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

## 🔒 Security Configuration

The backend is protected via strict CORS and API Key authentication.
You must configure the `.env` file before launching:

```env
PORT=3000
MONGO_URI=mongodb://...
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password

# Security
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
DEVICE_API_KEY=xona_secure_device_key_123
```

- **ALLOWED_ORIGINS**: Comma-separated list of permitted frontend domains to prevent CORS spoofing.
- **DEVICE_API_KEY**: A secret key required in the `x-api-key` header of every API request. Unauthenticated requests will receive a 401 Unauthorized error.

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
 
* [Production Deployment Guide](../DEPLOYMENT.md) 
