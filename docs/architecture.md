# 📐 Xona POS System Architecture

This document details the system design, network boundaries, database topology, offline resilience engine, and cloud auto-synchronization pipeline of the **Xona POS System**.

---

## 🏗️ System Overview & Network Topology

```mermaid
flowchart TD
    subgraph ClientPC ["💻 Cashier Computer (Client PC)"]
        UI["🖥️ Desktop Frontend (React + Vite + Electron)"]
        LocalDB[("💾 Client Disk Storage (JSON Files)\n(products, transactions, sync_queue)")]
        SyncEngine["🔄 Client Auto-Sync Engine\n(Online/Offline Detector & Dependency Flusher)"]
        ReceiptGen["🧾 Local Receipt Generator\n(Instant PDF / Thermal Print)"]

        UI <-->|Read Catalog / Save Checkouts| LocalDB
        UI -->|Instant Print| ReceiptGen
        SyncEngine <-->|Monitor Pending Queue| LocalDB
    end

    subgraph NetworkBoundary ["🌐 Network Connection"]
        InternetStatus{"📡 Server Connection Available?"}
    end

    subgraph ServerInfra ["☁️ Server & Backend Infrastructure"]
        Backend["🚀 Node.js / Express REST API"]
        MongoDB[("🍃 MongoDB Database\n(Persistent Collections)")]
        WS["⚡ WebSocket Broadcast Server"]

        Backend <--> MongoDB
        Backend --> WS
    end
    
    subgraph RemoteClients ["🌐 Remote Admin Clients"]
        WebAdmin["💻 Web Admin Portal (React SPA)"]
        ItemSeeder["🌱 Items Seeding Script (Node.js)"]
        
        WebAdmin <-->|Sync & Monitoring| Backend
        ItemSeeder -->|Direct DB Writes| MongoDB
    end

    SyncEngine -->|"Check Ping"| InternetStatus
    InternetStatus -->|"YES: Online"| Backend
    InternetStatus -->|"NO: Offline"| LocalDB
    WS -.->|Real-Time Inventory Broadcast| UI
    WS -.->|Real-Time Metrics| WebAdmin
```

---

## 🔄 Offline & Cloud Auto-Sync Sequence Flow

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as 👤 Cashier
    participant Desktop as 💻 Desktop Client (PC)
    participant LocalDB as 💾 Client Disk Storage (JSON)
    participant Network as 🌐 Network / REST API
    participant Server as ☁️ Backend Server (MongoDB)

    Cashier->>Desktop: Scans items & clicks Checkout
    Desktop->>LocalDB: Writes Transaction to local JSON disk file & decrements stock
    Desktop-->>Cashier: Displays Instant Receipt (0ms delay)

    alt Internet / Server Connected
        Desktop->>Network: Auto-Sync Heartbeat
        Network->>Server: POST /api/transactions
        Server-->>Desktop: 201 Created & Synced to MongoDB
        Desktop->>LocalDB: Mark transaction as synced
    else Offline Mode / Server Outage
        Network--xServer: Connection Failed
        Desktop->>LocalDB: Keep transaction in pending_sync queue
        Note over Desktop,LocalDB: POS operates 100% locally without errors
        Note over Network,Server: Server connection restored later
        Desktop->>Network: Trigger Background Flusher
        Network->>Server: POST /api/products -> /api/transactions
        Server-->>Desktop: All pending JSON records synced to MongoDB
    end
```

---

## 🧱 Component Breakdown

### 1. Client PC Desktop Application (`desktop/`)
* **Technology**: React 19, Vite, Electron, Tailwind CSS, Lucide Icons, ECharts.
* **Role**: Runs directly on the cashier's computer. Manages UI registers, catalog search, and receipt generation.
* **Offline Resilience**: Features an embedded client database store (`offlineStore.ts`) that persists products, transactions, and user credentials locally on disk using dual-layer `localStorage` and `electronDB` disk files.

### 2. Backend Server (`backend/`)
* **Technology**: Node.js, Express.js, Mongoose, WebSocket (`ws`).
* **Role**: Exposes REST endpoints for transactions, reporting, catalog management, and PDF generation. Connects directly to MongoDB for persistence.
* **Persistence**: Pure MongoDB implementation via Mongoose models (`UserModel`, `ProductModel`, `TransactionModel`, `CustomerModel`, `GraphNodeModel`, `GraphEdgeModel`).

### 3. Web Admin Portal (`webapp/`)
* **Technology**: React 19, Vite, Tailwind CSS, Lucide Icons, ECharts.
* **Role**: A cloud-connected web application intended for remote monitoring by owners and system administrators.
* **Architecture**: Fully decoupled from local hardware (no offline database, no printers). Uses the same REST APIs as the desktop client.

### 4. Items Seeding Backend (`items-backend/`)
* **Technology**: Node.js, Mongoose.
* **Role**: An isolated, lightweight utility script to batch insert or reset product catalogs directly into the MongoDB database.

### 5. Security & Device Authentication
* **Strict CORS**: The Node.js Express server restricts browser origin requests to a whitelisted array defined in `.env` (e.g. `localhost:5173`).
* **API Key Interceptor**: Requiring an `x-api-key` header on all `/api/*` endpoints.

### 6. Client Sync Engine Pipeline
* **Dependency-Ordered Flushing**:
  1. **Products First**: Syncs newly created/edited catalog items.
  2. **Transactions Second**: Syncs offline checkouts referencing valid product IDs.
