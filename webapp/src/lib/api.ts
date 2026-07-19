/**
 * API Client — Centralized typed functions for all POS backend endpoints
 * Cloud-only version for Web Admin Portal (No Offline Support)
 */

export const BASE_HOST = import.meta.env.VITE_API_BASE_URL as string ?? 'http://localhost:3000';
const BASE_URL = `${BASE_HOST}/api`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const saved = localStorage.getItem('currentUser');
  if (saved) {
    try {
      const user = JSON.parse(saved);
      if (user?.id) headers['x-user-id'] = user.id;
      if (user?.role) headers['x-user-role'] = user.role;
    } catch (e) {
      // ignore
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

// ─── Types ─────────────────────────────────────────────

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
  createdAt: string;
  updatedAt: string;
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

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  role?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
}

// ─── Product APIs ──────────────────────────────────────

export const productApi = {
  create: (data: {
    name: string;
    sku: string;
    category: string;
    price: number;
    cost?: number;
    stock?: number;
    description?: string;
    imageUrl?: string;
  }) => request<ProductRecord>('/products', { method: 'POST', body: JSON.stringify(data) }),

  getAll: () => request<ProductRecord[]>('/products'),

  search: (query: string) => request<ProductRecord[]>(`/products/search?q=${encodeURIComponent(query)}`),

  getById: (id: string) => request<ProductRecord>(`/products/${id}`),

  update: (id: string, data: Partial<ProductRecord>) => request<ProductRecord>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) => request<{ message: string }>(`/products/${id}`, { method: 'DELETE' }),

  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return request<{ imageUrl: string }>('/products/upload', {
      method: 'POST',
      body: formData,
    });
  },
};

// ─── Transaction APIs ──────────────────────────────────

export const transactionApi = {
  create: (data: {
    cashierId: string;
    customerId?: string | null;
    items: TransactionItem[];
    subtotal: number;
    discount: number;
    tax: number;
    totalAmount: number;
    paymentMethod?: 'cash';
  }) => request<TransactionRecord>('/transactions', { method: 'POST', body: JSON.stringify(data) }),

  getAll: () => request<TransactionRecord[]>('/transactions'),

  getById: (id: string) => request<TransactionRecord>(`/transactions/${id}`),

  refund: (id: string) => request<{ message: string; transaction: TransactionRecord }>(`/transactions/${id}/refund`, { method: 'POST' }),
};

// ─── Customer APIs ─────────────────────────────────────

export const customerApi = {
  create: (data: { name: string; phone?: string; email?: string }) => request<CustomerRecord>('/customers', { method: 'POST', body: JSON.stringify(data) }),

  getAll: () => request<CustomerRecord[]>('/customers'),

  getById: (id: string) => request<CustomerRecord>(`/customers/${id}`),

  delete: (id: string) => request<{ message: string }>(`/customers/${id}`, { method: 'DELETE' }),
};

// ─── Graph / Recommendation APIs ───────────────────────

export const graphApi = {
  getVisualization: () => request<{ nodes: GraphNode[]; edges: GraphEdge[]; stats: any }>('/graph/visualization'),

  getRecommendations: (productId: string) => request<GraphNode[]>(`/graph/recommendations/${productId}`),

  getRelated: (productId: string, depth = 3) =>
    request<{ nodes: GraphNode[]; edges: GraphEdge[] }>(`/graph/subgraph/${productId}?depth=${depth}`),

  getSubgraph: (nodeId: string, depth = 2) =>
    request<{ nodes: GraphNode[]; edges: GraphEdge[] }>(`/graph/subgraph/${nodeId}?depth=${depth}`),
};

// ─── Report APIs ───────────────────────────────────────

export const reportApi = {
  stats: () => request<SystemStats>('/reports/stats'),
  patterns: () => request<POSPatterns>('/reports/patterns'),
  posPatterns: () => request<POSPatterns>('/reports/patterns'),
  popularProducts: () => productApi.getAll(),
  timeline: () => request<TransactionRecord[]>('/reports/timeline'),
  generatePdf: (type: 'summary' | 'category' | 'daily' = 'summary') =>
    request<{ message: string; pdfUrl: string; filename: string }>('/reports/generate-pdf', {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),
  listSavedPdfReports: () => request<SavedReportRecord[]>('/reports/saved-pdfs'),
  listSavedReports: () => request<SavedReportRecord[]>('/reports/saved-pdfs'),
  deleteSavedReport: (id: string) => request<{ message: string }>(`/reports/saved-pdfs/${id}`, { method: 'DELETE' }),
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

// ─── Auth APIs ─────────────────────────────────────────

export const authApi = {
  register: (data: { username: string; password?: string; email?: string; role?: string }) => request<{ message: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { username: string; password?: string }) => request<{ message: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getUsers: () => request<User[]>('/auth/users'),
  delete: (id: string) => request<{ message: string }>(`/auth/users/${id}`, { method: 'DELETE' }),
  updateRole: (id: string, role: string) => request<{ message: string }>(`/auth/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role }) }),
  update: (id: string, data: { username?: string; password?: string; email?: string; role?: string }) => request<{ message: string }>(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// ─── Sync APIs ─────────────────────────────────────────

export const syncApi = {
  getStatus: () => request<SyncStatus>('/sync/status').catch(() => ({ isOnline: false, pendingCount: 0, isSyncing: false, lastSyncTime: null })),
  trigger: () => request<{ success: boolean; status: SyncStatus }>('/sync/trigger').catch(() => ({ success: false, status: { isOnline: false, pendingCount: 0, isSyncing: false, lastSyncTime: null } })),
};
