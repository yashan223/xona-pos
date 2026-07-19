# 💻 Xona POS Desktop Client

The Xona POS Desktop Client is a modern, offline-first cashier application built with React, Vite, TypeScript, Electron, Tailwind CSS, and Lucide Icons.

---

## ⚡ Core Features

* **Offline-First Storage Engine (`offlineStore.ts`)**: Runs 100% locally on the cashier PC. Saves catalog items, CRM profiles, and transactions directly in client storage.
* **Auto-Cloud Sync Flusher**: Automatically uploads pending checkouts and catalog additions up to the Cloud API whenever network connection is restored.
* **Sinhala Typography (`Noto Sans Sinhala`)**: Complete localization with proper Sinhala font shaping across all views, receipts, and navigation.
* **Always Offline Mode**: Toggle setting that silences error toasts and keeps the app running strictly locally on the client PC.
* **Interactive Co-Occurrence Net**: ECharts graph visualization highlighting products frequently bought together.

---

## 🔒 Environment Configuration

To successfully connect to the cloud backend, you must configure your `.env` file with the correct device API key to bypass the backend's strict security filters:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_DEVICE_API_KEY=xona_secure_device_key_123
```

- **VITE_DEVICE_API_KEY**: Required for authenticating the client with the remote backend. Without it, all cloud sync attempts will return a 401 Unauthorized error and force the app into fallback offline mode.

---

## 🚀 Quick Start

```bash
cd desktop
npm install
npm run dev
```

---

## 🔗 Related Documentation

* [Main Project README](../README.md)
* [System Architecture Guide](../ARCHITECTURE.md)
* [Database Schema Guide](../database/README.md)
