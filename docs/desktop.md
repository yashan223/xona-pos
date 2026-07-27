# 💻 Xona POS Desktop Client

The Xona POS Desktop Client is a modern, offline-first cashier application built with React, Vite, TypeScript, Electron, Tailwind CSS, and Lucide Icons.

---

## ⚡ Core Features

* **Offline-First Storage Engine (`offlineStore.ts`)**: Runs 100% locally on the cashier PC. Saves catalog items, CRM profiles, and transactions directly in client storage.
* **Printer & Setting Persistence (`xona_config.json`)**: Printer choices (Network IPs, Serial ports, System spoolers) and application settings save permanently to disk via native IPC (`electronConfig`).
* **🔒 Exit Confirmation & Auto-Save**: Intercepts window closing with a native question dialog (`"Are you sure you want to exit Xona POS?"`) and automatically flushes and saves all state to disk before exiting.
* **📦 Custom NSIS Setup Installer (`Xona-POS-Desktop-Setup-v1.0.0.exe`)**: Built with electron-builder, featuring:
  - 📜 EULA License Agreement screen (`assets/license.txt`).
  - 📁 Custom Folder Selection dialog.
  - 👤 User Installation Scope selection (Current User vs All Users).
  - 🖥️ Desktop and Start Menu shortcut creation.
  - 🚀 Post-install application auto-launch option.
  - 🛡️ Automatic Administrator (UAC) privilege elevation prompt.
* **Auto-Cloud Sync Flusher**: Automatically uploads pending checkouts and catalog additions up to the Cloud API whenever network connection is restored.
* **Sinhala Typography (`Noto Sans Sinhala`)**: Complete localization with proper Sinhala font shaping across all views, receipts, and navigation.
* **Always Offline Mode**: Toggle setting that silences error toasts and keeps the app running strictly locally on the client PC.
* **Interactive Co-Occurrence Net**: ECharts graph visualization highlighting products frequently bought together.
* **Bulk Stock Presets**: Manage batch restock templates to quickly update inventory levels.

---

## 📦 Building the Desktop Installer

To generate the standalone Windows setup installer:

```cmd
cd desktop
npm run build:installer
```
The compiled installer will be saved to:
`desktop/dist/Xona-POS-Desktop-Setup-v1.0.0.exe`

---

## 🔒 Environment Configuration

To successfully connect to the cloud backend, configure your `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_DEVICE_API_KEY=xona_secure_device_key_123
```

- **VITE_DEVICE_API_KEY**: Required for authenticating the client with the remote backend. Without it, all cloud sync attempts will return a 401 Unauthorized error and force the app into fallback offline mode.

---

## 🔗 Related Documentation

* [Main Project README](../README.md)
* [System Architecture Guide](./architecture.md)
* [Database Schema Guide](./database.md)
* [Production Deployment Guide](./deployments.md)
