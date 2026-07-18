/**
 * Client-Side Local Database & Sync Engine — Xona POS Desktop
 * Created entirely inside the Desktop Client PC app (runs without requiring a local Node backend).
 *
 * Local Relational Storage Schema:
 *   - local_products: Product catalog cached on client PC
 *   - local_customers: Customer CRM records cached on client PC
 *   - local_transactions: Checkout receipts queued on client PC
 *   - local_sync_queue: Unsynced local operations awaiting Cloud sync
 */

import { ProductRecord, CustomerRecord, TransactionItem, TransactionRecord } from './api';

const LOCAL_PRODUCTS_TABLE = 'xona_local_products_db';
const LOCAL_CUSTOMERS_TABLE = 'xona_local_customers_db';
const LOCAL_TRANSACTIONS_TABLE = 'xona_local_transactions_db';
const PENDING_SYNC_QUEUE_TABLE = 'xona_local_sync_queue_db';
const FORCE_OFFLINE_KEY = 'xona_force_offline';
const CACHED_USER_KEY = 'xona_offline_user';

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
    localStorage.setItem(FORCE_OFFLINE_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent('offline_mode_changed'));
  } catch (err) {
    console.error('[FrontendDB] Failed to update force offline setting:', err);
  }
}

// ─── Offline User Credentials Caching ──────────────────────────

export function saveOfflineUser(user: any): void {
  try {
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('[FrontendDB] Failed to cache user locally:', err);
  }
}

export function getOfflineUser(): any | null {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

const CACHED_USERS_LIST_KEY = 'xona_offline_users_list';

export function saveCachedUsersList(users: any[]): void {
  try {
    localStorage.setItem(CACHED_USERS_LIST_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('[FrontendDB] Failed to cache users list locally:', err);
  }
}

export function getCachedUsersList(): any[] {
  try {
    const raw = localStorage.getItem(CACHED_USERS_LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

// ─── Frontend Local Database: Products Table ──────────────────

export function saveCachedProducts(products: ProductRecord[]): void {
  try {
    localStorage.setItem(LOCAL_PRODUCTS_TABLE, JSON.stringify(products));
  } catch (err) {
    console.error('[FrontendDB] Failed to save products to local DB:', err);
  }
}

export function getCachedProducts(): ProductRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_TABLE);
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

  // Insert into local products table
  const products = getCachedProducts();
  products.push(record);
  saveCachedProducts(products);

  // Push to local sync queue
  pushToSyncQueue({ id, type: 'PRODUCT', payload, createdAt: now });

  window.dispatchEvent(new CustomEvent('products_updated'));
  return record;
}

// ─── Frontend Local Database: Customers Table ─────────────────

export function saveCachedCustomers(customers: CustomerRecord[]): void {
  try {
    localStorage.setItem(LOCAL_CUSTOMERS_TABLE, JSON.stringify(customers));
  } catch (err) {
    console.error('[FrontendDB] Failed to save customers to local DB:', err);
  }
}

export function getCachedCustomers(): CustomerRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMERS_TABLE);
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

  // Save transaction locally
  const localTxs = getLocalTransactions();
  localTxs.push(txRecord);
  try {
    localStorage.setItem(LOCAL_TRANSACTIONS_TABLE, JSON.stringify(localTxs));
  } catch (err) {
    console.error('[FrontendDB] Failed to save transaction locally:', err);
  }

  // Push to local sync queue
  pushToSyncQueue({ id: offlineId, type: 'TRANSACTION', payload, createdAt: now });

  // Update local stock in client DB
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
    const raw = localStorage.getItem(LOCAL_TRANSACTIONS_TABLE);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

// ─── Frontend Sync Queue Manager ──────────────────────────────

interface SyncQueueItem {
  id: string;
  type: 'CUSTOMER' | 'PRODUCT' | 'TRANSACTION';
  payload: any;
  createdAt: string;
}

function pushToSyncQueue(item: SyncQueueItem): void {
  const queue = getPendingSyncQueue();
  queue.push(item);
  localStorage.setItem(PENDING_SYNC_QUEUE_TABLE, JSON.stringify(queue));
}

export function getPendingSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_QUEUE_TABLE);
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
}): Promise<number> {
  if (isForceOfflineEnabled()) {
    return 0;
  }

  const queue = getPendingSyncQueue();
  if (queue.length === 0) return 0;

  let syncedTotal = 0;
  const remainingQueue: SyncQueueItem[] = [];

  // Sort queue by type: CUSTOMER first, then PRODUCT, then TRANSACTION
  const customers = queue.filter((i) => i.type === 'CUSTOMER');
  const products = queue.filter((i) => i.type === 'PRODUCT');
  const transactions = queue.filter((i) => i.type === 'TRANSACTION');

  // 1. Flush Customers
  for (const item of customers) {
    try {
      await api.createCustomer(item.payload);
      syncedTotal++;
    } catch (err) {
      remainingQueue.push(item);
    }
  }

  // 2. Flush Products
  for (const item of products) {
    try {
      await api.createProduct(item.payload);
      syncedTotal++;
    } catch (err) {
      remainingQueue.push(item);
    }
  }

  // 3. Flush Transactions
  for (const item of transactions) {
    try {
      await api.createTransaction(item.payload);
      syncedTotal++;
    } catch (err) {
      remainingQueue.push(item);
    }
  }

  localStorage.setItem(PENDING_SYNC_QUEUE_TABLE, JSON.stringify(remainingQueue));

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
