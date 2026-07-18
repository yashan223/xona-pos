# Xona POS System

Xona POS is a modern, high-performance Point of Sale (POS) system built for retail management, checkout registers, inventory control, customer CRM, and analytical business reports. It utilizes **MongoDB** as its primary persistent database and provides a sleek desktop interface built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**.

---

## 📂 Repository Structure

* [backend/](./backend) — Node.js & Express.js REST API server powered by Mongoose for data persistence, PDF reporting, and graph relationship traversals.
* [desktop/](./desktop) — React + Vite desktop client featuring interactive POS registers, product management, analytics, and data visualization.

---

## ⚡ Key Features

* **🛒 POS Checkout Register:** Fast product lookup, customer association, instant discount calculations, tax handling, multi-payment methods (Cash, Card, Mobile), and real-time inventory updates.
* **📦 Catalog Management:** Full inventory CRUD controls, SKU management, stock tracking, price/cost adjustments, and product image uploads.
* **👥 Customer CRM:** Customer profile management and transaction association.
* **🕸️ Product Co-Occurrence Net:** Graph relationship visualization (powered by ECharts) highlighting items frequently purchased together using BFS & DFS graph algorithms.
* **🧾 Transaction & Audit Logs:** Detailed transaction history, line-item audit views, and instant refund processing with inventory reversal.
* **📊 Analytics & PDF Reports:** Comprehensive sales charts, payment method distribution, top-selling product metrics, downloadable PDF sales reports, and database backup/restore capabilities.

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
* **Reports & Backups:** Detailed sales distribution charts, PDF invoice exports, and JSON database backup/restore tools.
