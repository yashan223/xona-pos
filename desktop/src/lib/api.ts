/**
 * API Client — Centralized typed functions for all POS backend endpoints
 * Equipped with automatic local offline caching & background cloud sync queueing
 */
import {
  saveCachedProducts,
  getCachedProducts,
  queueOfflineProduct,
  updateOfflineProduct,
  deleteOfflineProduct,
  uploadOfflineImage,
  saveCachedCustomers,
  getCachedCustomers,
  queueOfflineCustomer,
  queueOfflineTransaction,
  getTotalPendingOfflineCount,
  syncAllOfflineData,
  isForceOfflineEnabled,
  saveOfflineUser,
  getOfflineUser,
  saveCachedUsersList,
  getCachedUsersList,
  queueOfflineUser,
  updateOfflineUser,
  deleteOfflineUser,
} from './offlineStore';
/** Single source of truth — change the URL in desktop/.env (VITE_API_BASE_URL) */
export const BASE_HOST = import.meta.env.VITE_API_BASE_URL as string ?? 'http://localhost:3000';
const BASE_URL = `${BASE_HOST}/api`;
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const apiKey = import.meta.env.VITE_DEVICE_API_KEY;
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  const saved = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  if (saved) {
    try {
      const user = JSON.parse(saved);
      if (user?.id) headers['x-user-id'] = user.id;
      if (user?.role) headers['x-user-role'] = user.role;
    } catch (e) {
    }
  }
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}
export interface ProductRecord {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  description: string;
  imageUrl?: string;
  salesCount: number;
  lastStockUpdatedBy?: string;
  lastStockUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}
export interface StockPresetRecord {
  _id: string;
  name: string;
  items: { productId: string; qty: number }[];
  createdBy: string;
  createdAt: string;
}
export interface TransactionItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}
export interface TransactionRecord {
  id: string;
  cashierId: string;
  customerId?: string | null;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentMethod: 'cash';
  paymentStatus: 'paid' | 'refunded' | 'voided';
  createdAt: string;
  pdfUrl?: string;
}
export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
}
export interface GraphNode {
  id: string;
  type: 'product' | 'category';
  label: string;
  metadata?: any;
}
export interface GraphEdge {
  source: string;
  target: string;
  type: 'BELONGS_TO' | 'BOUGHT_WITH';
  metadata?: any;
}
export interface POSPatterns {
  salesByHour: { hour: number; count: number; totalSales: number }[];
  byCategory: { category: string; salesCount: number; revenue: number; count: number }[];
  byPaymentMethod: { method: string; count: number }[];
  topPairs: { pair: string[]; weight: number }[];
  dailyTimeline: { date: string; salesCount: number; totalRevenue: number; revenue: number }[];
  timeline: { date: string; salesCount: number; totalRevenue: number; revenue: number }[];
}
export interface SystemStats {
  products: { total: number };
  transactions: { total: number; totalRevenue: number };
  graph: { nodeCount: number; edgeCount: number };
}
export interface SavedReportRecord {
  _id: string;
  id?: string;
  filename: string;
  createdAt: string;
  size: number;
  reportType: string;
  localPath?: string;
  generatedBy?: string;
}
export const productApi = {
  create: async (data: {
    name: string;
    sku: string;
    category: string;
    price: number;
    cost?: number;
    stock?: number;
    description?: string;
    imageUrl?: string;
  }): Promise<ProductRecord> => {
    if (isForceOfflineEnabled()) {
      return queueOfflineProduct(data);
    }
    try {
      const created = await request<ProductRecord>('/products', { method: 'POST', body: JSON.stringify(data) });
      saveCachedProducts([...getCachedProducts().filter((p) => p.id !== created.id), created]);
      return created;
    } catch (err) {
      console.warn('[API Client] Cloud Backend unreachable. Saving product creation locally:', err);
      return queueOfflineProduct(data);
    }
  },
  getAll: async (): Promise<ProductRecord[]> => {
    if (isForceOfflineEnabled()) {
      return getCachedProducts();
    }
    try {
      const products = await request<ProductRecord[]>('/products');
      saveCachedProducts(products);
      return products;
    } catch (err) {
      console.warn('[API Client] Cloud Backend unreachable. Serving local cached products:', err);
      return getCachedProducts();
    }
  },
  search: async (query: string): Promise<ProductRecord[]> => {
    if (isForceOfflineEnabled()) {
      const cached = getCachedProducts();
      const q = query.toLowerCase();
      return cached.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    try {
      return await request<ProductRecord[]>(`/products/search?q=${encodeURIComponent(query)}`);
    } catch (err) {
      const cached = getCachedProducts();
      const q = query.toLowerCase();
      return cached.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
  },
  getById: (id: string) => request<ProductRecord>(`/products/${id}`),
  update: async (id: string, data: Partial<ProductRecord>): Promise<ProductRecord> => {
    if (isForceOfflineEnabled()) {
      return updateOfflineProduct(id, data);
    }
    try {
      const updated = await request<ProductRecord>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      saveCachedProducts([...getCachedProducts().filter((p) => p.id !== id), updated]);
      return updated;
    } catch (err) {
      console.warn('[API Client] Cloud Backend unreachable. Updating product locally:', err);
      return updateOfflineProduct(id, data);
    }
  },
  delete: async (id: string): Promise<{ message: string }> => {
    if (isForceOfflineEnabled()) {
      deleteOfflineProduct(id);
      return { message: 'Product deleted locally' };
    }
    try {
      const res = await request<{ message: string }>(`/products/${id}`, { method: 'DELETE' });
      deleteOfflineProduct(id);
      return res;
    } catch (err) {
      console.warn('[API Client] Cloud Backend unreachable. Deleting product locally:', err);
      deleteOfflineProduct(id);
      return { message: 'Product deleted locally' };
    }
  },
  uploadImage: async (file: File): Promise<{ imageUrl: string }> => {
    if (isForceOfflineEnabled()) {
      return uploadOfflineImage(file);
    }
    try {
      const formData = new FormData();
      formData.append('image', file);
      return await request<{ imageUrl: string }>('/products/upload', {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      console.warn('[API Client] Cloud Backend unreachable. Uploading image locally as base64:', err);
      return uploadOfflineImage(file);
    }
  },
};
export const transactionApi = {
  create: async (data: {
    cashierId: string;
    customerId?: string | null;
    items: TransactionItem[];
    subtotal: number;
    discount: number;
    tax: number;
    totalAmount: number;
    paymentMethod?: 'cash';
  }): Promise<TransactionRecord> => {
    if (isForceOfflineEnabled()) {
      return queueOfflineTransaction({ ...data, paymentMethod: 'cash' });
    }
    try {
      return await request<TransactionRecord>('/transactions', { method: 'POST', body: JSON.stringify(data) });
    } catch (err) {
      console.warn('[API Client] Cloud Backend unreachable. Queuing transaction locally for auto-sync:', err);
      return queueOfflineTransaction({ ...data, paymentMethod: 'cash' });
    }
  },
  getAll: () => request<TransactionRecord[]>('/transactions'),
  getById: (id: string) => request<TransactionRecord>(`/transactions/${id}`),
  refund: (id: string) => request<{ message: string; transaction: TransactionRecord }>(`/transactions/${id}/refund`, { method: 'POST' }),
};
export const customerApi = {
  create: async (data: { name: string; phone?: string; email?: string }): Promise<CustomerRecord> => {
    if (isForceOfflineEnabled()) {
      return queueOfflineCustomer(data);
    }
    try {
      const created = await request<CustomerRecord>('/customers', { method: 'POST', body: JSON.stringify(data) });
      saveCachedCustomers([...getCachedCustomers().filter((c) => c.id !== created.id), created]);
      return created;
    } catch (err) {
      console.warn('[API Client] Cloud Backend unreachable. Saving customer creation locally:', err);
      return queueOfflineCustomer(data);
    }
  },
  getAll: async (): Promise<CustomerRecord[]> => {
    if (isForceOfflineEnabled()) {
      return getCachedCustomers();
    }
    try {
      const customers = await request<CustomerRecord[]>('/customers');
      saveCachedCustomers(customers);
      return customers;
    } catch (err) {
      const cached = getCachedCustomers();
      if (cached.length > 0) return cached;
      throw err;
    }
  },
  getById: (id: string) => request<CustomerRecord>(`/customers/${id}`),
  delete: (id: string) => request<{ message: string }>(`/customers/${id}`, { method: 'DELETE' }),
};
export const graphApi = {
  getVisualization: () => request<{ nodes: GraphNode[]; edges: GraphEdge[]; stats: any }>('/graph/visualization'),
  getRecommendations: (productId: string) => request<GraphNode[]>(`/graph/recommendations/${productId}`),
  getRelated: (productId: string, depth = 3) =>
    request<{ nodes: GraphNode[]; edges: GraphEdge[] }>(`/graph/subgraph/${productId}?depth=${depth}`),
  getSubgraph: (nodeId: string, depth = 2) =>
    request<{ nodes: GraphNode[]; edges: GraphEdge[] }>(`/graph/subgraph/${nodeId}?depth=${depth}`),
};
export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  role?: string;
}
export const authApi = {
  register: async (data: { username: string; password?: string; email?: string; role?: string }): Promise<{ message: string; user: User }> => {
    if (isForceOfflineEnabled()) {
      return queueOfflineUser(data);
    }
    try {
      const res = await request<{ message: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) });
      saveCachedUsersList([...getCachedUsersList().filter((u) => u.id !== res.user.id), res.user]);
      return res;
    } catch (err) {
      console.warn('[API Client] Cloud Backend unreachable. Registering user locally:', err);
      return queueOfflineUser(data);
    }
  },
  login: async (data: { username: string; password?: string }): Promise<{ message: string; user: User }> => {
    const cachedUsers = getCachedUsersList();
    const matchedCached = cachedUsers.find((u) => u.username.toLowerCase() === data.username.toLowerCase());
    const inferredRole = matchedCached?.role || (data.username.toLowerCase().includes('admin') ? 'admin' : 'cashier');
    if (isForceOfflineEnabled()) {
      const offlineUser = matchedCached || getOfflineUser();
      if (offlineUser && offlineUser.username.toLowerCase() === data.username.toLowerCase()) {
        saveOfflineUser(offlineUser);
        return { message: 'Logged in offline successfully', user: offlineUser };
      }
      const syntheticUser: User = {
        id: `user-off-${Date.now()}`,
        username: data.username,
        email: `${data.username}@xona-pos.dev`,
        createdAt: new Date().toISOString(),
        role: inferredRole,
      };
      saveOfflineUser(syntheticUser);
      return { message: 'Logged in offline successfully', user: syntheticUser };
    }
    try {
      const res = await request<{ message: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      saveOfflineUser(res.user);
      saveCachedUsersList([...getCachedUsersList().filter((u) => u.id !== res.user.id), res.user]);
      return res;
    } catch (err) {
      console.warn('[API Client] Cloud Backend unreachable. Operating in offline login mode:', err);
      if (matchedCached) {
        saveOfflineUser(matchedCached);
        return { message: 'Logged in offline successfully', user: matchedCached };
      }
      const fallbackUser: User = {
        id: `offline-user-${data.username}`,
        username: data.username,
        email: `${data.username}@xona-pos.dev`,
        createdAt: new Date().toISOString(),
        role: inferredRole,
      };
      saveOfflineUser(fallbackUser);
      return { message: 'Logged in offline successfully', user: fallbackUser };
    }
  },
  getUsers: async (): Promise<User[]> => {
    if (isForceOfflineEnabled()) {
      const cached = getCachedUsersList();
      if (cached.length > 0) return cached;
      const offlineUser = getOfflineUser();
      return offlineUser ? [offlineUser] : [{ id: 'admin-1', username: 'admin', email: 'admin@xona-pos.dev', createdAt: new Date().toISOString(), role: 'admin' }];
    }
    try {
      const users = await request<User[]>('/auth/users');
      saveCachedUsersList(users);
      return users;
    } catch (err) {
      console.warn('[API Client] Cloud Backend unreachable. Serving local cached users list:', err);
      const cached = getCachedUsersList();
      if (cached.length > 0) return cached;
      const offlineUser = getOfflineUser();
      return offlineUser ? [offlineUser] : [{ id: 'admin-1', username: 'admin', email: 'admin@xona-pos.dev', createdAt: new Date().toISOString(), role: 'admin' }];
    }
  },
  delete: async (id: string): Promise<{ message: string }> => {
    if (isForceOfflineEnabled()) {
      deleteOfflineUser(id);
      return { message: 'User deleted locally' };
    }
    try {
      const res = await request<{ message: string }>(`/auth/users/${id}`, { method: 'DELETE' });
      deleteOfflineUser(id);
      return res;
    } catch (err) {
      deleteOfflineUser(id);
      return { message: 'User deleted locally' };
    }
  },
  updateRole: async (id: string, role: string): Promise<{ message: string }> => {
    if (isForceOfflineEnabled()) {
      updateOfflineUser(id, { role });
      return { message: 'Role updated locally' };
    }
    try {
      const res = await request<{ message: string }>(`/auth/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role }) });
      updateOfflineUser(id, { role });
      return res;
    } catch (err) {
      updateOfflineUser(id, { role });
      return { message: 'Role updated locally' };
    }
  },
  update: async (id: string, data: { username?: string; password?: string; email?: string; role?: string }): Promise<{ message: string }> => {
    if (isForceOfflineEnabled()) {
      updateOfflineUser(id, data);
      return { message: 'User updated locally' };
    }
    try {
      const res = await request<{ message: string }>(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      updateOfflineUser(id, data);
      return res;
    } catch (err) {
      updateOfflineUser(id, data);
      return { message: 'User updated locally' };
    }
  },
};
export const reportApi = {
  stats: () => request<SystemStats>('/reports/stats'),
  timeline: () => request<TransactionRecord[]>('/reports/timeline'),
  generatePdf: (type: 'summary' | 'category' | 'daily' = 'summary') =>
    request<{ message: string; pdfUrl: string; filename: string }>('/reports/generate-pdf', {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),
  listSavedPdfReports: () => request<SavedReportRecord[]>('/reports/saved'),
  listSavedReports: () => request<SavedReportRecord[]>('/reports/saved'),
  deleteSavedReport: (id: string) => request<{ message: string }>(`/reports/saved/${id}`, { method: 'DELETE' }),
  listBackups: () => request<{ filename: string; createdAt: string; size: number }[]>('/reports/backups'),
  createBackup: () => request<{ message: string; filename: string }>('/reports/backups/create', { method: 'POST' }),
  uploadBackup: (file: File) => {
    const formData = new FormData();
    formData.append('backup', file);
    return request<{ message: string }>('/reports/backups/upload', {
      method: 'POST',
      body: formData,
    });
  },
  restoreBackup: (filename: string) => request<{ message: string }>(`/reports/backups/${filename}/restore`, { method: 'POST' }),
  deleteBackup: (filename: string) => request<{ message: string }>(`/reports/backups/${filename}`, { method: 'DELETE' }),
  resetData: (includeAdmin = false) => request<{ message: string }>('/reports/reset', { method: 'POST', body: JSON.stringify({ includeAdmin }) }),
  clearDatabase: () => request<{ message: string }>('/reports/reset', { method: 'POST', body: JSON.stringify({ includeAdmin: false }) }),
};
export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
}
export const syncApi = {
  getStatus: async (): Promise<SyncStatus> => {
    const pendingOffline = getTotalPendingOfflineCount();
    if (isForceOfflineEnabled()) {
      return { isOnline: false, pendingCount: pendingOffline, isSyncing: false, lastSyncTime: null };
    }
    try {
      const status = await request<SyncStatus>('/sync/status');
      if (pendingOffline > 0) {
        syncAllOfflineData({
          createCustomer: (data) => request<CustomerRecord>('/customers', { method: 'POST', body: JSON.stringify(data) }),
          createProduct: (data) => request<ProductRecord>('/products', { method: 'POST', body: JSON.stringify(data) }),
          createTransaction: (data) => request<TransactionRecord>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
          registerUser: (data) => request<{ message: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
        });
      }
      return { ...status, pendingCount: status.pendingCount + pendingOffline };
    } catch (err) {
      return { isOnline: false, pendingCount: pendingOffline, isSyncing: false, lastSyncTime: null };
    }
  },
  trigger: async () => {
    const pendingOffline = getTotalPendingOfflineCount();
    if (isForceOfflineEnabled()) {
      return {
        success: false,
        status: { isOnline: false, pendingCount: pendingOffline, isSyncing: false, lastSyncTime: null },
      };
    }
    if (pendingOffline > 0) {
      await syncAllOfflineData({
        createCustomer: (data) => request<CustomerRecord>('/customers', { method: 'POST', body: JSON.stringify(data) }),
        createProduct: (data) => request<ProductRecord>('/products', { method: 'POST', body: JSON.stringify(data) }),
        createTransaction: (data) => request<TransactionRecord>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
        registerUser: (data) => request<{ message: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
      });
    }
    try {
      return await request<{ success: boolean; status: SyncStatus }>('/sync/trigger', { method: 'POST' });
    } catch (err) {
      return {
        success: false,
        status: { isOnline: false, pendingCount: getTotalPendingOfflineCount(), isSyncing: false, lastSyncTime: null },
      };
    }
  },
};
export interface ActivityRecord {
  _id: string;
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  details?: any;
  createdAt: string;
}
export const activityApi = {
  getAll: () => request<ActivityRecord[]>('/activity'),
};
export const inventoryApi = {
  getPresets: () => request<StockPresetRecord[]>('/inventory/presets'),
  createPreset: (data: { name: string; items: { productId: string; qty: number }[] }) => request<{ message: string; preset: StockPresetRecord }>('/inventory/presets', { method: 'POST', body: JSON.stringify(data) }),
  applyPreset: (id: string, data: { updatedBy: string }) => request<{ message: string }>(`/inventory/presets/${id}/apply`, { method: 'POST', body: JSON.stringify(data) }),
  deletePreset: (id: string) => request<{ message: string }>(`/inventory/presets/${id}`, { method: 'DELETE' }),
};
