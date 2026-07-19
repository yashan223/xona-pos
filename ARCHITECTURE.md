# 📐 Xona POS System Architecture

This document details the system design, network boundaries, database topology, offline resilience engine, and cloud auto-synchronization pipeline of the **Xona POS System**.

---

## 🏗️ System Overview & Network Topology

```mermaid
flowchart TD
    subgraph ClientPC ["💻 Cashier Computer (Client PC)"]
        UI["🖥️ Desktop Frontend (React + Vite + Electron)"]
        LocalDB[("💾 Frontend Local DB Engine\n(products, customers, transactions, sync_queue)")]
        SyncEngine["🔄 Frontend Auto-Sync Engine\n(Online/Offline Detector & Dependency Flusher)"]
        ReceiptGen["🧾 Local Receipt Generator\n(Instant PDF / Thermal Print)"]

        UI <-->|Read Catalog / Save Checkouts| LocalDB
        UI -->|Instant Print| ReceiptGen
        SyncEngine <-->|Monitor Pending Queue| LocalDB
    end

    subgraph NetworkBoundary ["🌐 Network Connection"]
        InternetStatus{"📡 Internet Available?"}
    end

    subgraph CloudInfra ["☁️ Cloud Server & Remote Infrastructure"]
        CloudBackend["🚀 Node.js / Express REST API"]
        MongoDB[("🍃 Cloud MongoDB Cluster\n(Persistent Database)")]
        WS["⚡ WebSocket Broadcast Server"]

        CloudBackend <--> MongoDB
        CloudBackend --> WS
    end
    
    subgraph RemoteClients ["🌐 Remote Admin Clients"]
        WebAdmin["💻 Web Admin Portal (React SPA)"]
        ItemSeeder["🌱 Items Seeding Script (Node.js)"]
        
        WebAdmin <-->|Cloud Sync & Monitoring| CloudBackend
        ItemSeeder -->|Direct DB Writes| MongoDB
    end

    SyncEngine -->|"Check Ping"| InternetStatus
    InternetStatus -->|"YES: Online"| CloudBackend
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
    participant LocalDB as 💾 Local Client DB
    participant Network as 🌐 Internet Connection
    participant Cloud as ☁️ Cloud MongoDB Backend

    Cashier->>Desktop: Scans items & clicks Checkout
    Desktop->>LocalDB: Writes Transaction to local_transactions & decrements stock
    Desktop-->>Cashier: Displays Instant Receipt (0ms delay)

    alt Internet Connected
        Desktop->>Network: Auto-Sync Heartbeat
        Network->>Cloud: POST /api/transactions
        Cloud-->>Desktop: 201 Created & Synced
        Desktop->>LocalDB: Mark transaction as synced
    else Offline Mode / Network Outage
        Network--xCloud: Connection Failed
        Desktop->>LocalDB: Keep transaction in pending_sync queue
        Note over Desktop,LocalDB: POS operates 100% locally without errors
        Note over Network,Cloud: Internet connection restored later
        Desktop->>Network: Trigger Background Flusher
        Network->>Cloud: POST /api/customers -> /api/products -> /api/transactions
        Cloud-->>Desktop: All pending records synced to Cloud MongoDB
    end
```

---

## 🧱 Component Breakdown

### 1. Client PC Desktop Application (`desktop/`)
* **Technology**: React 19, Vite, Electron, Tailwind CSS, Lucide Icons, ECharts.
* **Role**: Runs directly on the cashier's computer. Manages UI registers, catalog search, receipt generation, and customer management.
* **Offline Resilience**: Features an embedded client database store (`offlineStore.ts`) that persists products, customers, transactions, and user credentials locally on disk.

### 2. Remote Cloud Infrastructure (`backend/`)
* **Technology**: Node.js, Express.js, Mongoose, WebSocket (`ws`).
* **Role**: Hosted on cloud infrastructure (e.g. AWS, Render, Heroku). Exposes REST endpoints for transactions, reporting, catalog management, and PDF generation.
* **Persistence**: Connects to a Cloud MongoDB cluster for permanent storage.

### 3. Web Admin Portal (`webapp/`)
* **Technology**: React 19, Vite, Tailwind CSS, Lucide Icons, ECharts.
* **Role**: A purely cloud-connected web application intended for remote monitoring by owners and system administrators.
* **Architecture**: Fully decoupled from local hardware (no offline database, no printers). Uses the same REST APIs as the desktop client but restricts mutations (like checkouts) to enforce a read-heavy monitoring workflow.

### 4. Items Seeding Backend (`items-backend/`)
* **Technology**: Node.js, Mongoose.
* **Role**: An isolated, lightweight utility script to batch insert or reset product catalogs directly into the MongoDB cluster.
* **Architecture**: Operates entirely independently of the Express API. Connects directly to the DB, runs the seed payload, and safely shuts down upon completion.

### 5. Sync Engine Pipeline
* **Dependency-Ordered Flushing**:
  1. **Customers First**: Syncs new customer profiles to generate valid Cloud IDs.
  2. **Products Second**: Syncs newly created/edited catalog items.
  3. **Transactions Third**: Syncs offline checkouts referencing valid customer and product IDs.
