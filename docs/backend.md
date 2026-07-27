# ⚙️ Xona POS Backend API Server

The Xona POS backend is a high-performance Express REST API server built with TypeScript, Node.js, Mongoose, and MongoDB.

---

## ⚡ Core Responsibilities

* **MongoDB Database Persistence**: Connects directly to MongoDB (via Mongoose) for long-term transaction, catalog, customer, user, and graph network persistence.
* **REST API Endpoints**: Handles authentication, catalog management, checkout transactions, refunds, and live metrics.
* **Client Sync Receiver**: Processes incoming JSON sync batches uploaded by offline Desktop clients (`POST /api/sync` and `POST /api/transactions`).
* **PDF Sales Report Generator**: Generates formatted PDF sales summaries and invoices.
* **Bulk Stock Presets API**: Handles creation, deletion, and execution of batch stock update templates.
* **WebSocket Server (`ws`)**: Broadcasts real-time inventory and transaction updates across connected desktop registers and admin clients.

---

## 🔒 Security Configuration

The backend is protected via strict CORS and API Key authentication.
You must configure the `.env` file before launching:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/xona-pos
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password

# Security
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
DEVICE_API_KEY=xona_secure_device_key_123
```

- **ALLOWED_ORIGINS**: Comma-separated list of permitted frontend domains to prevent CORS spoofing.
- **DEVICE_API_KEY**: A secret key required in the `x-api-key` header of every API request. Unauthenticated requests will receive a 401 Unauthorized error.

---

## 🔗 Related Documentation

* [Main Project README](../README.md)
* [System Architecture Guide](./architecture.md)
* [Database Schema Guide](./database.md)
* [Production Deployment Guide](./deployments.md)
