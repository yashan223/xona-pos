# Xona POS System

Xona POS is a feature-rich, high-performance Point of Sale (POS) system designed for retail transactions, checkout registers, inventory control, and analytical reports. It utilizes **MongoDB** as its primary persistent database and implements custom **in-memory data structures** (AVL Tree, Max Heap, Graph) for sub-millisecond prefix searches, popularity rankings, and co-occurrence product recommendations.

---

## 📂 Repository Structure

* [backend/](./backend) — Express.js API server configured with Mongoose models, data loading pipelines, and seeding scripts.
* [recall-desktop/](./recall-desktop) — Electron desktop client built with React, Vite, and custom analytical interfaces.

---

## ⚡ Core Features & Data Structures

For a comprehensive explanation of our custom algorithm implementations and complexity analyses, refer to the [DATA_STRUCTURES.md](./DATA_STRUCTURES.md) documentation.

* **AVL Tree:** Indexes the product catalog alphabetically by name to power $O(\log N)$ real-time prefix-matching search queries during product scanning.
* **Max Heap:** Priority queue ranking products dynamically based on unit sales count (`salesCount`), listing best-selling items instantly.
* **Graph:** Captures relations between item categories (`BELONGS_TO`) and tracks items frequently purchased in the same carts (`BOUGHT_WITH` co-occurrence edges) to supply real-time cashier recommendation panels.

---

## ⚙️ Configuration & Quick Start

Ensure you have **Node.js** and **MongoDB** installed on your system.

### 1. Configure Environment Variables
Inside the `backend/` folder, create a `.env` file (a default one has been pre-configured for you):
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/xona-pos
```
*Modify `MONGO_URI` to connect to your hosted MongoDB instance or database cluster.*

### 2. Launch the Backend
Execute the helper script in the project root:
```powershell
.\run-backend.cmd
```
*Or manually: `cd backend && npm install && npm run dev`*
*To seed the database with mock catalog items, CRM loyalty customers, and 30-day sales history, run: `cd backend && npm run seed`*

### 3. Launch the Desktop Client
Execute the helper script in the project root:
```powershell
.\run-frontend.cmd
```
*Or manually: `cd recall-desktop && npm install && npm start`*

---

## 🖥️ Screen Layouts
* **Dashboard Page:** Metrics showing gross sales revenues, best-selling product charts, and cashier checkout logs.
* **Checkout Register:** Cashier grid layout supporting loyalty customer selection, discount rates, receipt printing simulation, and bought-together recommendation side panels.
* **Catalog Manager:** Inventory catalog editor supporting real-time addition, stock adjustments, pricing controls, and metadata setup.
* **Transactions Log:** Receipt lists for searching past invoices, processing refunds, and auditing details.
* **Recommendation Net:** Interactive node canvas (rendered via ECharts) mapping out item-bought co-occurrences.
* **Analytics Reports:** Category breakdowns, cash vs card payment ratios, and revenue timelines.
