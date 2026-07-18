/**
 * API Client — Centralized typed functions for all POS backend endpoints
 */

/** Single source of truth — change the URL in desktop/.env (VITE_API_BASE_URL) */
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
  depth?: number;
  discoveryOrder?: number;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats?: {
    nodeCount: number;
    edgeCount: number;
    nodeTypes: Record<string, number>;
  };
}

export interface SystemStats {
  products: { total: number; treeHeight: number; isBalanced: boolean };
  transactions: { total: number; totalRevenue: number };
  graph: { nodeCount: number; edgeCount: number; nodeTypes: Record<string, number> };
}

export interface POSPatterns {
  byCategory: { category: string; count: number }[];
  byPaymentMethod: { method: string; count: number }[];
  timeline: { date: string; revenue: number }[];
}

// ─── Product APIs ──────────────────────────────────────

export const productApi = {
  create: (data: {
    name: string;
    sku: string;
    category?: string;
    price: number;
    cost?: number;
    stock?: number;
    description?: string;
    imageUrl?: string;
  }) => request<ProductRecord>('/products', { method: 'POST', body: JSON.stringify(data) }),

  getAll: () => request<ProductRecord[]>('/products'),

  search: (query: string) => request<ProductRecord[]>(`/products/search?q=${encodeURIComponent(query)}`),

  getById: (id: string) => request<ProductRecord>(`/products/${id}`),

  update: (id: string, data: Partial<ProductRecord>) =>
    request<ProductRecord>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

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
  create: (data: { name: string; phone?: string; email?: string }) =>
    request<CustomerRecord>('/customers', { method: 'POST', body: JSON.stringify(data) }),

  getAll: () => request<CustomerRecord[]>('/customers'),

  getById: (id: string) => request<CustomerRecord>(`/customers/${id}`),

  delete: (id: string) => request<{ message: string }>(`/customers/${id}`, { method: 'DELETE' }),
};

// ─── Graph APIs ────────────────────────────────────────

export const graphApi = {
  getRelated: (productId: string, depth = 3) => request<GraphData>(`/graph/related/${productId}?depth=${depth}`),

  explore: (nodeId: string) => request<GraphData>(`/graph/explore/${nodeId}`),

  getVisualization: () => request<GraphData>('/graph/visualization'),

  getSubgraph: (nodeId: string, depth = 2) => request<GraphData>(`/graph/subgraph/${nodeId}?depth=${depth}`),
};

// ─── Report APIs ───────────────────────────────────────

export const reportApi = {
  popularProducts: () => request<ProductRecord[]>('/reports/frequent-errors'),

  effectiveProducts: () => request<ProductRecord[]>('/reports/effective-solutions'),

  posPatterns: () => request<POSPatterns>('/reports/developer-patterns'),

  timeline: () => request<TransactionRecord[]>('/reports/timeline'),

  stats: () => request<SystemStats>('/reports/stats'),

  resetDatabase: () => request<{ message: string }>('/reports/reset', { method: 'POST' }),

  clearDatabase: () => request<{ message: string }>('/reports/clear', { method: 'POST' }),

  listBackups: () => request<{ filename: string; size: number; createdAt: string }[]>('/reports/backups'),

  createBackup: () => request<{ message: string; filename: string }>('/reports/backups', { method: 'POST' }),

  restoreBackup: (filename: string) => request<{ message: string }>(`/reports/backups/${filename}/restore`, { method: 'POST' }),

  deleteBackup: (filename: string) => request<{ message: string }>(`/reports/backups/${filename}`, { method: 'DELETE' }),

  uploadBackup: (backupData: any) => request<{ message: string }>('/reports/backups/upload', { method: 'POST', body: JSON.stringify({ backupData }) }),

  listSavedReports: () => request<SavedReportRecord[]>('/reports/saved'),

  deleteSavedReport: (id: string) => request<{ message: string }>(`/reports/saved/${id}`, { method: 'DELETE' }),
};

export interface SavedReportRecord {
  _id: string;
  reportType: 'summary' | 'category' | 'daily';
  filename: string;
  filePath: string;
  localPath: string;
  generatedBy: string;
  createdAt: string;
}

// ─── Auth APIs ─────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  role?: string;
}

export const authApi = {
  register: (data: { username: string; password?: string; email?: string; role?: string }) =>
    request<{ message: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { username: string; password?: string }) =>
    request<{ message: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  getUsers: () => request<User[]>('/auth/users'),

  delete: (id: string) => request<{ message: string }>(`/auth/users/${id}`, { method: 'DELETE' }),

  updateRole: (id: string, role: string) => request<{ message: string }>(`/auth/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role }) }),

  update: (id: string, data: { username?: string; password?: string; email?: string; role?: string }) =>
    request<{ message: string }>(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
