# 🛒 Xona POS System

Xona POS is a modern, high-performance, **offline-first Point of Sale (POS) system** built for retail management, fast checkout registers, inventory control, and analytical business reports.

It is designed with a **dual-layer architecture**: the Desktop Client runs **100% locally on the Cashier PC** with an embedded local database (`offlineStore.ts`) that guarantees 0-latency checkouts even when completely disconnected from the internet, while automatically synchronizing queued transactions and catalog updates to a **Cloud MongoDB** cluster whenever online connectivity is active.

---

## 📚 Documentation Index (Central Navigation Hub)

* [📐 System Architecture Guide](./ARCHITECTURE.md) — Network topology diagrams, component breakdown, and offline auto-sync sequence flow.
* [🗄️ Database Documentation](./database/README.md) — Comprehensive schema specifications for Cloud MongoDB collections and local SQLite tables (`pos_local.db`).
* [⚙️ Backend API Server Documentation](./backend/README.md) — Node.js & Express REST API server, WAL SQLite engine, and background sync flusher.
* [💻 Desktop Client Documentation](./desktop/README.md) — React + Vite + Electron desktop application, client database engine, and Sinhala font integration.
* [🌐 Web Admin Portal Documentation](./webapp/README.md) — Cloud-only React SPA for remote owners/admins to monitor reports and inventory.
* [🚀 Production Deployment Guide](./DEPLOYMENT.md) — Instructions for configuring, building, and deploying the backend, web portal, and desktop app to production environments.
* [🌱 Items Seeding Backend Documentation](./items-backend/README.md) — Lightweight, isolated Node.js script for seeding the product catalog directly to MongoDB.

> **Note:** A utility script `generate-api-key.cmd` is included in the root directory to help you generate secure 256-bit API keys for device authentication.

---

## ⚡ Key Features

* **🛒 Offline-First POS Register:** Fast product lookup, cash payment handling, instant discount calculations, tax handling, and instant receipt printing. Operates 100% offline without requiring a local backend server.
* **🔄 Automatic Cloud Synchronization:** Background flusher that queues offline products and transactions locally, then uploads pending records to Cloud MongoDB in strict dependency order (Products $\rightarrow$ Transactions).
* **🔒 Seamless Offline Login:** Offline user credentials caching allows cashiers and admins to log in and operate the app even when disconnected from the internet.
* **⚡ Always Offline Mode Toggle:** Setting switch that forces the app to run strictly from local disk storage without issuing remote cloud network requests or error notifications.
* **📦 Catalog Management:** Full inventory CRUD controls, SKU management, stock tracking, price/cost adjustments, and product image uploads.

* **🕸️ Product Co-Occurrence Net:** Graph relationship visualization (powered by ECharts) highlighting items frequently purchased together using BFS & DFS graph algorithms.
* **🇱🇰 Multi-Language & Sinhala Typography:** Integrated Google Font `Noto Sans Sinhala` for proper Sinhala text shaping across all views, menus, and receipts.
* **🧾 Transaction & Audit Logs:** Detailed transaction history, line-item audit views, and instant refund processing with inventory reversal.
* **📊 Analytics & PDF Reports:** Comprehensive sales charts, top-selling product metrics, downloadable PDF sales reports, and complete database backup/restore capabilities.

---

## ⚙️ Configuration & Quick Start

Ensure you have **Node.js** (v18+) and **MongoDB** installed.

### 1. Backend Environment Setup
Inside the `backend/` directory, configure your `.env` file:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/xona-pos
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
DEVICE_API_KEY=xona_secure_device_key_123
```

> **Security Note:** The backend enforces strict device authentication. Ensure you copy the `DEVICE_API_KEY` into your `desktop/.env` and `webapp/.env` files as `VITE_DEVICE_API_KEY`.
> You can generate a new cryptographically secure key by double-clicking the **`generate-api-key.cmd`** utility in the root directory.

### 2. Launch the Backend
Run the root helper command:
```powershell
.\run-backend.cmd
```
*Or manually:*
```bash
cd backend
npm install
npm run dev
```

### 3. Launch the Desktop Client
Run the root helper command:
```powershell
.\run-frontend.cmd
```

### 4. Launch the Web Admin Portal (Optional)
```powershell
.\run-webapp.cmd
```

### 5. Run the Items Seeder (Optional)
```powershell
.\run-items-seeder.cmd
```

---

## 🖥️ Application Modules

* **Dashboard:** Real-time revenue metrics, transaction counts, Average Order Value (AOV), and top-selling product lists.
* **Checkout Register:** Cashier terminal with category filtering, instant cart calculations, and product co-occurrence recommendation panel.
* **Products Catalog:** Inventory catalog manager supporting live search, price/stock updates, and image asset uploads.
* **Transactions:** Complete history log with search filters, transaction status badges, and one-click refund capabilities.
* **Co-Occurrence Net:** Interactive visual graph mapping connections between categories and items commonly purchased in single checkouts.
* **System Settings:** VAT tax rate configuration, Always Offline Mode toggle, Cloud Sync connection indicator, and English / Sinhala language switcher.
* **DB Maintenance:** Local Storage & Cloud MongoDB engine health monitors, local JSON backup export, and full database restore tools.
