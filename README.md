# Xona POS System

Xona POS is a modern, high-performance, offline-first Point of Sale (POS) system built for retail management, checkout registers, inventory control, customer CRM, and analytical business reports. It features **dual-tier local storage** (Client IndexedDB/localStorage + Backend SQLite) with **automatic Cloud MongoDB synchronization**, ensuring 100% checkout availability even during complete network outages.

---

## 📂 Repository Structure

* [backend/](./backend) — Node.js & Express.js REST API server powered by Mongoose for Cloud MongoDB persistence, local SQLite (`better-sqlite3`), auto-sync engine, PDF reporting, and graph relationship traversals.
* [desktop/](./desktop) — React + Vite desktop client featuring offline-first local checkout queues, Sinhala typography support (`Noto Sans Sinhala`), real-time sync status badges, and interactive POS registers.
* [database/](./database) — Comprehensive database schema documentation for users, products, customers, transactions, and co-occurrence graph relationships.

---

## ⚡ Key Features

* **🛒 Offline-First POS Register:** Zero-latency cashier checkout terminal with category filtering, customer selection, cash payment processing, real-time inventory updates, and instant receipt printing. Works 100% offline.
* **🔄 Automatic Cloud Synchronization:** Seamless background sync engine that queues offline products, customers, and transactions locally, then auto-uploads pending items to Cloud MongoDB as soon as internet connection is restored.
* **⚡ Always Offline Mode:** Toggle setting to run the system strictly using local disk storage without making external cloud network requests.
* **📦 Catalog Management:** Full inventory CRUD controls, SKU management, stock tracking, price/cost adjustments, and product image uploads.
* **👥 Customer CRM:** Customer profile management and transaction association.
* **🕸️ Product Co-Occurrence Net:** Graph relationship visualization (powered by ECharts) highlighting items frequently purchased together using BFS & DFS graph algorithms.
* **🇱🇰 Multi-Language & Sinhala Typography:** Embedded Google Font `Noto Sans Sinhala` for proper Sinhala character shaping across all views, navigation, and receipts.
* **🧾 Transaction & Audit Logs:** Detailed transaction history, line-item audit views, and instant refund processing with inventory reversal.
* **📊 Analytics & PDF Reports:** Comprehensive sales charts, top-selling product metrics, downloadable PDF sales reports, and database backup/restore capabilities.

---

## ⚙️ Configuration & Quick Start

Ensure you have **Node.js** (v18+) and **MongoDB** installed and running on your system.

### 1. Backend Environment Setup
Inside the `backend/` directory, configure your `.env` file (or use the pre-configured default):

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/xona-pos
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

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
*Or manually:*
```bash
cd desktop
npm install
npm run dev
```

---

## 🖥️ Application Modules

* **Dashboard:** Real-time revenue metrics, transaction counts, graph connection metrics, and top-selling product lists.
* **Checkout Register:** Cashier terminal with category filtering, instant cart calculations, customer selector, and product co-occurrence recommendation panel.
* **Products Catalog:** Inventory catalog manager supporting live search, price/stock updates, and image asset uploads.
* **Transactions:** Complete history log with search filters, transaction status badges, and one-click refund capabilities.
* **Co-Occurrence Net:** Interactive visual graph mapping connections between categories and items commonly purchased in single checkouts.
* **System Settings:** VAT tax rate configuration, Always Offline Mode toggle, Cloud Sync connection indicator, and English / Sinhala language switcher.
* **DB Maintenance:** Local SQLite & Cloud MongoDB engine health monitors, local JSON backup export, and full database restore tools.
