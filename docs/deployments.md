# 🚀 Xona POS Production Deployment Guide

This guide outlines the steps to build and deploy the Xona POS system components for a production environment. 

The system consists of three main components that need to be deployed or distributed:
1. **Cloud Backend** (Node.js/Express)
2. **Web Admin Portal** (React/Vite SPA)
3. **Desktop Cashier Client** (Electron/React Desktop App)

---

## 🛠️ 1. Prerequisites

Before starting, ensure you have the following:
* **Node.js** (v18+ recommended)
* **MongoDB Cluster** (a remote cluster or a self-hosted instance)
* **API Key** generated for system-to-system authentication.

---

## ☁️ 2. Deploying the Cloud Backend (`backend/`)

The backend is a Node.js REST API and WebSocket server that should be deployed to a cloud hosting provider.

1. **Navigate to the directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `backend` directory based on `.env.example`:
   ```env
   PORT=5000
   MONGODB_URI=<YOUR_MONGODB_URI>
   X_API_KEY=<YOUR_SECURE_API_KEY>
   CORS_ORIGIN=<YOUR_CORS_ORIGIN>
   JWT_SECRET=<YOUR_JWT_SECRET>
   ```

4. **Build the TypeScript source**:
   ```bash
   npm run build
   ```

5. **Start the Production Server**:
   ```bash
   npm start
   ```
   *Tip: For production, it's highly recommended to run the compiled `dist/server.js` using a background process manager or via a containerized environment.*

---

## 🌐 3. Deploying the Web Admin Portal (`webapp/`)

The Web Admin Portal is a static Single Page Application (SPA). It can be hosted on any static file server or CDN.

1. **Navigate to the directory**:
   ```bash
   cd webapp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file containing the production URLs and keys:
   ```env
   VITE_API_BASE_URL=<YOUR_API_BASE_URL>
   VITE_API_KEY=<YOUR_SECURE_API_KEY>
   VITE_WS_URL=<YOUR_WS_URL>
   ```

4. **Build for Production**:
   ```bash
   npm run build
   ```
   This command compiles the React application into optimized static files inside the `webapp/dist` folder.

5. **Deploy**:
   Upload the contents of the `dist/` folder to your static hosting provider. Ensure you configure **URL Rewrite rules** to redirect all 404s to `index.html` since this is a client-side routed SPA.

---

## 💻 4. Distributing the Desktop Cashier Client (`desktop/`)

The Desktop client runs locally on the cashier's hardware and relies on Electron to package the application into a standalone executable (`.exe`, `.dmg`, `.deb`).

1. **Navigate to the directory**:
   ```bash
   cd desktop
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file with the production backend connection details:
   ```env
   VITE_API_BASE_URL=<YOUR_API_BASE_URL>
   VITE_API_KEY=<YOUR_SECURE_API_KEY>
   VITE_WS_URL=<YOUR_WS_URL>
   ```

4. **Build & Package the Executable**:
   Use Electron Forge to package the app for your current operating system:
   ```bash
   npm run make
   ```
   * This process will create a `.exe` installer (on Windows), a `.dmg` (on macOS), or `.deb`/`.rpm` (on Linux) inside the `out/` directory.

5. **Distribute**:
   Copy the generated installer from the `out/make/` folder to the target cashier PCs and install it.

---

## 🌱 5. Database Initial Seeding (Optional)

If this is a fresh installation and you need to bulk-import initial product catalogs or categories into MongoDB:

1. Update the `.env` inside `items-backend/` with your `MONGODB_URI`.
2. From the root directory, run the seeder script:
   ```cmd
   run-items-seeder.cmd
   ```
   *(Or manually `cd items-backend`, `npm install`, and `npm start`)*


---

# Configuration & Quick Start

## ⚙️ Main System Configuration & Quick Start

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

## 🚀 Backend Quick Start

```bash
cd backend
npm install
npm run dev
```

---

## 🚀 Desktop Quick Start

```bash
cd desktop
npm install
npm run dev
```

---

