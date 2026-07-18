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
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  passwordHash?: string;
  email: string;
  createdAt: string;
  role?: string;
}

export interface GraphNode {
  id: string;
  type: 'product' | 'category';
  label: string;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'BOUGHT_WITH' | 'BELONGS_TO';
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
