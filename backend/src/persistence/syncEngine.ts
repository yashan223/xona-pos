import mongoose from 'mongoose';
import db from './sqliteDb.js';
import { ProductModel, TransactionModel, CustomerModel, GraphNodeModel, GraphEdgeModel } from './database.js';
import { broadcast } from '../lib/websocket.js';

let isSyncing = false;
let lastSyncTime: string | null = null;

export function isCloudOnline(): boolean {
  return mongoose.connection.readyState === 1;
}

export function getPendingCount(): number {
  try {
    const products = (db.prepare('SELECT COUNT(*) as count FROM local_products WHERE synced = 0').get() as any)?.count || 0;
    const transactions = (db.prepare('SELECT COUNT(*) as count FROM local_transactions WHERE synced = 0').get() as any)?.count || 0;
    const customers = (db.prepare('SELECT COUNT(*) as count FROM local_customers WHERE synced = 0').get() as any)?.count || 0;
    const nodes = (db.prepare('SELECT COUNT(*) as count FROM local_graph_nodes WHERE synced = 0').get() as any)?.count || 0;
    const edges = (db.prepare('SELECT COUNT(*) as count FROM local_graph_edges WHERE synced = 0').get() as any)?.count || 0;
    return products + transactions + customers + nodes + edges;
  } catch (err) {
    console.error('[SyncEngine] Error counting pending items:', err);
    return 0;
  }
}

export function getSyncStatus() {
  return {
    isOnline: isCloudOnline(),
    pendingCount: getPendingCount(),
    isSyncing,
    lastSyncTime,
  };
}

export async function syncPendingToCloud(): Promise<boolean> {
  if (!isCloudOnline() || isSyncing) return false;

  isSyncing = true;
  let syncedAny = false;

  try {
    // 1. Sync pending Products
    const unsyncedProducts = db.prepare('SELECT * FROM local_products WHERE synced = 0').all() as any[];
    for (const p of unsyncedProducts) {
      await ProductModel.findOneAndUpdate(
        { _id: p.id },
        {
          $set: {
            name: p.name,
            sku: p.sku,
            category: p.category,
            price: p.price,
            cost: p.cost,
            stock: p.stock,
            description: p.description || '',
            imageUrl: p.imageUrl || '',
            salesCount: p.salesCount || 0,
            updatedAt: p.updatedAt || new Date().toISOString(),
          },
          $setOnInsert: { _id: p.id, createdAt: p.createdAt || new Date().toISOString() },
        },
        { upsert: true }
      );
      db.prepare('UPDATE local_products SET synced = 1 WHERE id = ?').run(p.id);
      syncedAny = true;
    }

    // 2. Sync pending Customers
    const unsyncedCustomers = db.prepare('SELECT * FROM local_customers WHERE synced = 0').all() as any[];
    for (const c of unsyncedCustomers) {
      await CustomerModel.findOneAndUpdate(
        { _id: c.id },
        {
          $set: { name: c.name, phone: c.phone || '', email: c.email || '' },
          $setOnInsert: { _id: c.id, createdAt: c.createdAt },
        },
        { upsert: true }
      );
      db.prepare('UPDATE local_customers SET synced = 1 WHERE id = ?').run(c.id);
      syncedAny = true;
    }

    // 3. Sync pending Transactions
    const unsyncedTx = db.prepare('SELECT * FROM local_transactions WHERE synced = 0').all() as any[];
    for (const tx of unsyncedTx) {
      const items = JSON.parse(tx.itemsJson || '[]');
      await TransactionModel.findOneAndUpdate(
        { _id: tx.id },
        {
          $set: {
            cashierId: tx.cashierId,
            customerId: tx.customerId || null,
            items,
            subtotal: tx.subtotal,
            discount: tx.discount,
            tax: tx.tax,
            totalAmount: tx.totalAmount,
            paymentMethod: tx.paymentMethod || 'cash',
            paymentStatus: tx.paymentStatus || 'paid',
          },
          $setOnInsert: { _id: tx.id, createdAt: tx.createdAt },
        },
        { upsert: true }
      );
      db.prepare('UPDATE local_transactions SET synced = 1 WHERE id = ?').run(tx.id);
      syncedAny = true;
    }

    // 4. Sync pending Graph Nodes & Edges
    const unsyncedNodes = db.prepare('SELECT * FROM local_graph_nodes WHERE synced = 0').all() as any[];
    for (const n of unsyncedNodes) {
      const metadata = n.metadataJson ? JSON.parse(n.metadataJson) : {};
      await GraphNodeModel.findOneAndUpdate(
        { _id: n.id },
        { type: n.type, label: n.label, metadata },
        { upsert: true }
      );
      db.prepare('UPDATE local_graph_nodes SET synced = 1 WHERE id = ?').run(n.id);
      syncedAny = true;
    }

    const unsyncedEdges = db.prepare('SELECT * FROM local_graph_edges WHERE synced = 0').all() as any[];
    for (const e of unsyncedEdges) {
      const metadata = e.metadataJson ? JSON.parse(e.metadataJson) : {};
      await GraphEdgeModel.findOneAndUpdate(
        { source: e.source, target: e.target, type: e.type },
        { metadata },
        { upsert: true }
      );
      db.prepare('UPDATE local_graph_edges SET synced = 1 WHERE id = ?').run(e.id);
      syncedAny = true;
    }

    if (syncedAny) {
      lastSyncTime = new Date().toISOString();
      console.log('[SyncEngine] Cloud sync completed successfully. All pending local changes uploaded.');
      broadcast('SYNC_COMPLETED', getSyncStatus());
      broadcast('PRODUCTS_UPDATED');
      broadcast('TRANSACTIONS_UPDATED');
    }

    return true;
  } catch (err) {
    console.error('[SyncEngine] Error during cloud sync:', err);
    return false;
  } finally {
    isSyncing = false;
  }
}

export async function pullCloudToLocal(): Promise<void> {
  if (!isCloudOnline()) return;

  try {
    // Populate/refresh local SQLite from MongoDB
    const cloudProducts = await ProductModel.find().lean();
    const insertProduct = db.prepare(`
      INSERT INTO local_products (id, name, sku, category, price, cost, stock, description, imageUrl, salesCount, synced, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        sku=excluded.sku,
        category=excluded.category,
        price=excluded.price,
        cost=excluded.cost,
        stock=excluded.stock,
        description=excluded.description,
        imageUrl=excluded.imageUrl,
        salesCount=excluded.salesCount,
        synced=1,
        updatedAt=excluded.updatedAt
    `);

    for (const p of cloudProducts as any[]) {
      insertProduct.run(
        p._id,
        p.name,
        p.sku,
        p.category,
        p.price,
        p.cost || 0,
        p.stock || 0,
        p.description || '',
        p.imageUrl || '',
        p.salesCount || 0,
        p.createdAt || new Date().toISOString(),
        p.updatedAt || new Date().toISOString()
      );
    }

    const cloudCustomers = await CustomerModel.find().lean();
    const insertCustomer = db.prepare(`
      INSERT INTO local_customers (id, name, phone, email, synced, createdAt)
      VALUES (?, ?, ?, ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        phone=excluded.phone,
        email=excluded.email,
        synced=1
    `);

    for (const c of cloudCustomers as any[]) {
      insertCustomer.run(c._id, c.name, c.phone || '', c.email || '', c.createdAt || new Date().toISOString());
    }

    const cloudTransactions = await TransactionModel.find().lean();
    const insertTx = db.prepare(`
      INSERT INTO local_transactions (id, cashierId, customerId, itemsJson, subtotal, discount, tax, totalAmount, paymentMethod, paymentStatus, synced, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        paymentStatus=excluded.paymentStatus,
        synced=1
    `);

    for (const tx of cloudTransactions as any[]) {
      insertTx.run(
        tx._id,
        tx.cashierId,
        tx.customerId || null,
        JSON.stringify(tx.items || []),
        tx.subtotal,
        tx.discount || 0,
        tx.tax || 0,
        tx.totalAmount,
        tx.paymentMethod || 'cash',
        tx.paymentStatus || 'paid',
        tx.createdAt || new Date().toISOString()
      );
    }

    console.log('[SyncEngine] Pulled latest cloud data to local SQLite database.');
  } catch (err) {
    console.error('[SyncEngine] Error pulling cloud data to local:', err);
  }
}

export function startAutoSync(): void {
  // Try sync every 10 seconds
  setInterval(async () => {
    if (isCloudOnline()) {
      await syncPendingToCloud();
    }
  }, 10000);

  // Also sync on MongoDB connection open
  mongoose.connection.on('open', async () => {
    console.log('[SyncEngine] MongoDB reconnected. Triggering cloud sync...');
    await syncPendingToCloud();
    await pullCloudToLocal();
  });
}
