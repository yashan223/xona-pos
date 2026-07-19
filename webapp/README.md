# 🌐 Xona POS Web Admin Portal

This directory contains the **Web Admin Portal** for the Xona POS system. 

Unlike the desktop application, this web portal is a **Cloud-Only** React Single Page Application (SPA). It directly connects to the remote backend API and does not maintain any local SQLite offline storage or hardware integrations (such as receipt printers).

## 🔒 Role-Based Access
This portal is strictly designed for **remote monitoring** and administration. 
- Only **Admin** and **Owner** roles can log into this application.
- Cashiers and standard users are blocked.
- Features like "Checkout Register" have been completely removed to prevent accidental sales mutations from a remote web terminal.

## 🚀 Key Features
- **Remote Dashboard:** Live analytics and metrics straight from the cloud.
- **Inventory Monitoring:** View and manage the product catalog (Products Page).
- **Sales Reports:** Generate PDF sales reports and view historical data remotely.
- **Transactions Log:** Review historical transactions processed by physical POS terminals.

## ⚙️ Development Setup

Ensure you have your `.env` configured:
```env
VITE_API_BASE_URL=http://your-remote-backend:3000
```

Start the development server:
```bash
npm install
npm run dev
```

## 🏗️ Production Build

To build the web portal for production deployment (e.g., on Vercel, Netlify, or Nginx):
```bash
npm run build
```
The compiled static files will be located in the `dist/` directory.
