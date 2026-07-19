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
