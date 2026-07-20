# 🌱 Items Seeding Backend

This directory contains a lightweight, isolated Node.js script specifically designed for **seeding product items** into the Cloud MongoDB database.

It is completely decoupled from the main Xona POS API Backend, ensuring that you have a safe and automated way to initialize or reset the product catalog without exposing administrative routes on the production web server.

## 🚀 Behavior
When executed, this script will:
1. Connect directly to the MongoDB cluster.
2. Initialize or wipe existing products (if configured to do so).
3. Insert a batch of predefined sample products into the `Product` collection.
4. **Automatically exit (shutdown)** when the seeding process is successfully completed.

## ⚙️ Configuration
Create a `.env` file in this directory based on the `.env.example`:

```env
MONGO_URI=mongodb://username:password@your-remote-host:27017/xona-possSW?authSource=admin
```

## 🛠️ Usage

To run the seeding script, use the helper command in the root of the project:
```powershell
..\run-items-seeder.cmd
```

Or run it manually inside this directory:
```bash
npm install
npm run seed
```
 
* [Production Deployment Guide](./deployments.md) 
