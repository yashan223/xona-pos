import { ProductRecord, CustomerRecord, TransactionItem, TransactionRecord } from './api';

const CACHED_PRODUCTS_KEY = 'xona_offline_products';
const CACHED_CUSTOMERS_KEY = 'xona_offline_customers';
const PENDING_PRODUCTS_KEY = 'xona_pending_products';
const PENDING_CUSTOMERS_KEY = 'xona_pending_customers';
const PENDING_TX_KEY = 'xona_pending_transactions';
const FORCE_OFFLINE_KEY = 'xona_force_offline';

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
    console.error('Failed to update force offline mode:', err);
  }
}

// ─── Products Offline Storage ─────────────────────────────────

export function saveCachedProducts(products: ProductRecord[]): void {
  try {
    localStorage.setItem(CACHED_PRODUCTS_KEY, JSON.stringify(products));
  } catch (err) {
    console.error('Failed to cache products locally:', err);
  }
}

export function getCachedProducts(): ProductRecord[] {
  try {
    const raw = localStorage.getItem(CACHED_PRODUCTS_KEY);
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

  const current = getCachedProducts();
  current.push(record);
  saveCachedProducts(current);

  const pending = getPendingOfflineProducts();
  pending.push({ id, payload, createdAt: now });
  localStorage.setItem(PENDING_PRODUCTS_KEY, JSON.stringify(pending));

  window.dispatchEvent(new CustomEvent('products_updated'));
  return record;
}

export function getPendingOfflineProducts(): Array<{ id: string; payload: any; createdAt: string }> {
  try {
    const raw = localStorage.getItem(PENDING_PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

// ─── Customers Offline Storage ────────────────────────────────

export function saveCachedCustomers(customers: CustomerRecord[]): void {
  try {
    localStorage.setItem(CACHED_CUSTOMERS_KEY, JSON.stringify(customers));
  } catch (err) {
    console.error('Failed to cache customers locally:', err);
  }
}

export function getCachedCustomers(): CustomerRecord[] {
  try {
    const raw = localStorage.getItem(CACHED_CUSTOMERS_KEY);
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

  const current = getCachedCustomers();
  current.push(record);
  saveCachedCustomers(current);

  const pending = getPendingOfflineCustomers();
  pending.push({ id, payload, createdAt: now });
  localStorage.setItem(PENDING_CUSTOMERS_KEY, JSON.stringify(pending));

  return record;
}

export function getPendingOfflineCustomers(): Array<{ id: string; payload: any; createdAt: string }> {
  try {
    const raw = localStorage.getItem(PENDING_CUSTOMERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

// ─── Transactions Offline Storage ─────────────────────────────

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

  const pendingQueue = getPendingOfflineTransactions();
  pendingQueue.push({ id: offlineId, payload, createdAt: now });
  localStorage.setItem(PENDING_TX_KEY, JSON.stringify(pendingQueue));

  const cachedProds = getCachedProducts();
  const updatedProds = cachedProds.map((prod) => {
    const cartItem = payload.items.find((i) => i.productId === prod.id);
    if (cartItem) {
      const newStock = prod.stock >= 0 ? Math.max(0, prod.stock - cartItem.quantity) : prod.stock;
      return { ...prod, stock: newStock, salesCount: (prod.salesCount || 0) + cartItem.quantity };
    }
    return prod;
  });
  saveCachedProducts(updatedProds);

  window.dispatchEvent(new CustomEvent('offline_tx_queued'));
  return txRecord;
}

export function getPendingOfflineTransactions(): Array<{ id: string; payload: any; createdAt: string }> {
  try {
    const raw = localStorage.getItem(PENDING_TX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function getTotalPendingOfflineCount(): number {
  return (
    getPendingOfflineProducts().length +
    getPendingOfflineCustomers().length +
    getPendingOfflineTransactions().length
  );
}

// ─── Unified Offline Flush & Auto-Sync Engine ─────────────────

export async function syncAllOfflineData(api: {
  createCustomer: (data: any) => Promise<any>;
  createProduct: (data: any) => Promise<any>;
  createTransaction: (data: any) => Promise<any>;
}): Promise<number> {
  if (isForceOfflineEnabled()) {
    console.log('[OfflineStore] Force Offline Mode is enabled. Skipping cloud sync.');
    return 0;
  }

  let syncedTotal = 0;

  // 1. Sync Customers first
  const pendingCustomers = getPendingOfflineCustomers();
  if (pendingCustomers.length > 0) {
    const remainingCustomers = [];
    for (const item of pendingCustomers) {
      try {
        await api.createCustomer(item.payload);
        syncedTotal++;
      } catch (err) {
        remainingCustomers.push(item);
      }
    }
    localStorage.setItem(PENDING_CUSTOMERS_KEY, JSON.stringify(remainingCustomers));
  }

  // 2. Sync Products second
  const pendingProducts = getPendingOfflineProducts();
  if (pendingProducts.length > 0) {
    const remainingProducts = [];
    for (const item of pendingProducts) {
      try {
        await api.createProduct(item.payload);
        syncedTotal++;
      } catch (err) {
        remainingProducts.push(item);
      }
    }
    localStorage.setItem(PENDING_PRODUCTS_KEY, JSON.stringify(remainingProducts));
  }

  // 3. Sync Transactions third
  const pendingTx = getPendingOfflineTransactions();
  if (pendingTx.length > 0) {
    const remainingTx = [];
    for (const item of pendingTx) {
      try {
        await api.createTransaction(item.payload);
        syncedTotal++;
      } catch (err) {
        remainingTx.push(item);
      }
    }
    localStorage.setItem(PENDING_TX_KEY, JSON.stringify(remainingTx));
  }

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
