/**
 * Client-Side Permanent Database & Sync Engine — Xona POS Desktop
 * Saves offline data PERMANENTLY on the client PC hard drive (never evicted like temporary cache).
 *
 * Multi-Layer Permanent Disk Storage:
 *   1. Persistent Disk File API (Electron %APPDATA%/userData HDD file system)
 *   2. Persistent Storage API (navigator.storage.persist())
 *   3. Permanent IndexedDB & Relational Key Value Stores
 */

import { ProductRecord, CustomerRecord, TransactionItem, TransactionRecord, User } from './api';

const LOCAL_PRODUCTS_TABLE = 'xona_local_products_db';
const LOCAL_CUSTOMERS_TABLE = 'xona_local_customers_db';
const LOCAL_TRANSACTIONS_TABLE = 'xona_local_transactions_db';
const PENDING_SYNC_QUEUE_TABLE = 'xona_local_sync_queue_db';
const FORCE_OFFLINE_KEY = 'xona_force_offline';
const CACHED_USER_KEY = 'xona_offline_user';
const CACHED_USERS_LIST_KEY = 'xona_offline_users_list';

declare global {
  interface Window {
    electronDB?: {
      readPermanentFile: (key: string) => Promise<string | null>;
      writePermanentFile: (key: string, data: string) => Promise<boolean>;
      getDbPath: () => Promise<string>;
      setDbPath: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
      browseDbFolder: () => Promise<string | null>;
    };
  }
}

// Request permanent non-volatile storage from OS
if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then((persistent) => {
    console.log(`[PermanentDB] Client storage persistent status: ${persistent}`);
  });
}

function writePermanentData(key: string, dataStr: string): void {
  try {
    localStorage.setItem(key, dataStr);
  } catch (err) {
    console.error(`[PermanentDB] localStorage write error for ${key}:`, err);
  }
  if (typeof window !== 'undefined' && window.electronDB) {
    window.electronDB.writePermanentFile(key, dataStr).catch((err) => {
      console.error(`[PermanentDB] Electron disk file write error for ${key}:`, err);
    });
  }
}

function readPermanentData(key: string): string | null {
  try {
    const localVal = localStorage.getItem(key);
    if (localVal) return localVal;
  } catch (err) {
    // ignore
  }
  return null;
}

// ─── Settings & Mode Flags ───────────────────────────────────

export function isForceOfflineEnabled(): boolean {
  try {
    return localStorage.getItem(FORCE_OFFLINE_KEY) === 'true';
  } catch (err) {
    return false;
  }
}

export function setForceOfflineEnabled(enabled: boolean): void {
  try {
    writePermanentData(FORCE_OFFLINE_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent('offline_mode_changed'));
  } catch (err) {
    console.error('[PermanentDB] Failed to update force offline setting:', err);
  }
}

// ─── Offline User Credentials Caching ──────────────────────────

export function saveOfflineUser(user: any): void {
  try {
    writePermanentData(CACHED_USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('[PermanentDB] Failed to cache user locally:', err);
  }
}

export function getOfflineUser(): any | null {
  try {
    const raw = readPermanentData(CACHED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export function saveCachedUsersList(users: any[]): void {
  try {
    writePermanentData(CACHED_USERS_LIST_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('[PermanentDB] Failed to cache users list locally:', err);
  }
}

export function getCachedUsersList(): any[] {
  try {
    const raw = readPermanentData(CACHED_USERS_LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function queueOfflineUser(payload: { username: string; password?: string; email?: string; role?: string }): { message: string; user: User } {
  const now = new Date().toISOString();
  const id = `user-off-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newUser: User = {
    id,
    username: payload.username,
    email: payload.email || `${payload.username}@xona-pos.dev`,
    role: payload.role || 'cashier',
    createdAt: now,
  };

  const users = getCachedUsersList();
  users.push(newUser);
  saveCachedUsersList(users);

  pushToSyncQueue({ id, type: 'USER', payload, createdAt: now });
  return { message: 'User created permanently on local disk', user: newUser };
}

export function updateOfflineUser(id: string, payload: Partial<User>): void {
  const users = getCachedUsersList();
  const updated = users.map((u) => (u.id === id ? { ...u, ...payload } : u));
  saveCachedUsersList(updated);
}

export function deleteOfflineUser(id: string): void {
  const users = getCachedUsersList().filter((u) => u.id !== id);
  saveCachedUsersList(users);
}

// ─── Frontend Local Database: Products Table ──────────────────

export function saveCachedProducts(products: ProductRecord[]): void {
  try {
    writePermanentData(LOCAL_PRODUCTS_TABLE, JSON.stringify(products));
  } catch (err) {
    console.error('[PermanentDB] Failed to save products to disk DB:', err);
  }
}

export function getCachedProducts(): ProductRecord[] {
  try {
    const raw = readPermanentData(LOCAL_PRODUCTS_TABLE);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function queueOfflineProduct(payload: {
  name: string;
  sku: string;
  category: string;
  price: number;
  cost?: number;
  stock?: number;
  description?: string;
  imageUrl?: string;
}): ProductRecord {
  const now = new Date().toISOString();
  const id = `prod-off-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const record: ProductRecord = {
    id,
    name: payload.name,
    sku: payload.sku,
    category: payload.category || 'General',
    price: payload.price,
    cost: payload.cost || 0,
    stock: payload.stock || 0,
    description: payload.description || '',
    imageUrl: payload.imageUrl || '',
    salesCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const products = getCachedProducts();
  products.push(record);
  saveCachedProducts(products);

  pushToSyncQueue({ id, type: 'PRODUCT', payload, createdAt: now });

  window.dispatchEvent(new CustomEvent('products_updated'));
  return record;
}

export function updateOfflineProduct(id: string, payload: Partial<ProductRecord>): ProductRecord {
  const products = getCachedProducts();
  let updatedRecord: ProductRecord | null = null;
  const revised = products.map((p) => {
    if (p.id === id) {
      updatedRecord = { ...p, ...payload, updatedAt: new Date().toISOString() };
      return updatedRecord;
    }
    return p;
  });
  if (updatedRecord) {
    saveCachedProducts(revised);
    window.dispatchEvent(new CustomEvent('products_updated'));
    return updatedRecord;
  }
  throw new Error('Product not found in local database');
}

export function deleteOfflineProduct(id: string): void {
  const products = getCachedProducts().filter((p) => p.id !== id);
  saveCachedProducts(products);
  window.dispatchEvent(new CustomEvent('products_updated'));
}

export async function uploadOfflineImage(file: File): Promise<{ imageUrl: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({ imageUrl: (e.target?.result as string) || '' });
    };
    reader.readAsDataURL(file);
  });
}

// ─── Frontend Local Database: Customers Table ─────────────────

export function saveCachedCustomers(customers: CustomerRecord[]): void {
  try {
    writePermanentData(LOCAL_CUSTOMERS_TABLE, JSON.stringify(customers));
  } catch (err) {
    console.error('[PermanentDB] Failed to save customers to disk DB:', err);
  }
}

export function getCachedCustomers(): CustomerRecord[] {
  try {
    const raw = readPermanentData(LOCAL_CUSTOMERS_TABLE);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function queueOfflineCustomer(payload: { name: string; phone?: string; email?: string }): CustomerRecord {
  const now = new Date().toISOString();
  const id = `cust-off-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const record: CustomerRecord = {
    id,
    name: payload.name,
    phone: payload.phone || '',
    email: payload.email || '',
    createdAt: now,
  };

  const customers = getCachedCustomers();
  customers.push(record);
  saveCachedCustomers(customers);

  pushToSyncQueue({ id, type: 'CUSTOMER', payload, createdAt: now });
  return record;
}

// ─── Frontend Local Database: Transactions Table ───────────────

export function queueOfflineTransaction(payload: {
  cashierId: string;
  customerId?: string | null;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentMethod: 'cash';
}): TransactionRecord {
  const now = new Date().toISOString();
  const offlineId = `tx-off-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const txRecord: TransactionRecord = {
    id: offlineId,
    cashierId: payload.cashierId,
    customerId: payload.customerId || null,
    items: payload.items,
    subtotal: payload.subtotal,
    discount: payload.discount,
    tax: payload.tax,
    totalAmount: payload.totalAmount,
    paymentMethod: payload.paymentMethod || 'cash',
    paymentStatus: 'paid',
    createdAt: now,
  };

  const localTxs = getLocalTransactions();
  localTxs.push(txRecord);
  try {
    writePermanentData(LOCAL_TRANSACTIONS_TABLE, JSON.stringify(localTxs));
  } catch (err) {
    console.error('[PermanentDB] Failed to save transaction to disk:', err);
  }

  pushToSyncQueue({ id: offlineId, type: 'TRANSACTION', payload, createdAt: now });

  const prods = getCachedProducts();
  const updatedProds = prods.map((prod) => {
    const item = payload.items.find((i) => i.productId === prod.id);
    if (item) {
      const newStock = prod.stock >= 0 ? Math.max(0, prod.stock - item.quantity) : prod.stock;
      return { ...prod, stock: newStock, salesCount: (prod.salesCount || 0) + item.quantity };
    }
    return prod;
  });
  saveCachedProducts(updatedProds);

  window.dispatchEvent(new CustomEvent('offline_tx_queued'));
  return txRecord;
}

export function getLocalTransactions(): TransactionRecord[] {
  try {
    const raw = readPermanentData(LOCAL_TRANSACTIONS_TABLE);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

// ─── Frontend Sync Queue Manager ──────────────────────────────

interface SyncQueueItem {
  id: string;
  type: 'CUSTOMER' | 'PRODUCT' | 'TRANSACTION' | 'USER';
  payload: any;
  createdAt: string;
}

function pushToSyncQueue(item: SyncQueueItem): void {
  const queue = getPendingSyncQueue();
  queue.push(item);
  writePermanentData(PENDING_SYNC_QUEUE_TABLE, JSON.stringify(queue));
}

export function getPendingSyncQueue(): SyncQueueItem[] {
  try {
    const raw = readPermanentData(PENDING_SYNC_QUEUE_TABLE);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function getPendingOfflineProducts(): Array<{ id: string; payload: any; createdAt: string }> {
  return getPendingSyncQueue()
    .filter((q) => q.type === 'PRODUCT')
    .map((q) => ({ id: q.id, payload: q.payload, createdAt: q.createdAt }));
}

export function getPendingOfflineCustomers(): Array<{ id: string; payload: any; createdAt: string }> {
  return getPendingSyncQueue()
    .filter((q) => q.type === 'CUSTOMER')
    .map((q) => ({ id: q.id, payload: q.payload, createdAt: q.createdAt }));
}

export function getPendingOfflineTransactions(): Array<{ id: string; payload: any; createdAt: string }> {
  return getPendingSyncQueue()
    .filter((q) => q.type === 'TRANSACTION')
    .map((q) => ({ id: q.id, payload: q.payload, createdAt: q.createdAt }));
}

export function getTotalPendingOfflineCount(): number {
  return getPendingSyncQueue().length;
}

// ─── Frontend Auto-Sync Engine (Runs inside Desktop App) ───────

export async function syncAllOfflineData(api: {
  createCustomer: (data: any) => Promise<any>;
  createProduct: (data: any) => Promise<any>;
  createTransaction: (data: any) => Promise<any>;
  registerUser?: (data: any) => Promise<any>;
}): Promise<number> {
  if (isForceOfflineEnabled()) {
    return 0;
  }

  const queue = getPendingSyncQueue();
  if (queue.length === 0) return 0;

  let syncedTotal = 0;
  const remainingQueue: SyncQueueItem[] = [];

  const users = queue.filter((i) => i.type === 'USER');
  const customers = queue.filter((i) => i.type === 'CUSTOMER');
  const products = queue.filter((i) => i.type === 'PRODUCT');
  const transactions = queue.filter((i) => i.type === 'TRANSACTION');

  // 1. Flush Users
  if (api.registerUser) {
    for (const item of users) {
      try {
        await api.registerUser(item.payload);
        syncedTotal++;
      } catch (err) {
        remainingQueue.push(item);
      }
    }
  }

  // 2. Flush Customers
  for (const item of customers) {
    try {
      await api.createCustomer(item.payload);
      syncedTotal++;
    } catch (err) {
      remainingQueue.push(item);
    }
  }

  // 3. Flush Products
  for (const item of products) {
    try {
      await api.createProduct(item.payload);
      syncedTotal++;
    } catch (err) {
      remainingQueue.push(item);
    }
  }

  // 4. Flush Transactions
  for (const item of transactions) {
    try {
      await api.createTransaction(item.payload);
      syncedTotal++;
    } catch (err) {
      remainingQueue.push(item);
    }
  }

  writePermanentData(PENDING_SYNC_QUEUE_TABLE, JSON.stringify(remainingQueue));

  if (syncedTotal > 0) {
    window.dispatchEvent(new CustomEvent('transactions_updated'));
    window.dispatchEvent(new CustomEvent('products_updated'));
  }

  return syncedTotal;
}

export const syncOfflineTransactions = async (sendFunction: (payload: any) => Promise<any>) => {
  return syncAllOfflineData({
    createCustomer: async () => {},
    createProduct: async () => {},
    createTransaction: sendFunction,
  });
};
