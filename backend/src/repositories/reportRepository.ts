import { ProductModel, TransactionModel, GraphNodeModel, GraphEdgeModel } from '../persistence/database.js';
import db from '../persistence/sqliteDb.js';
import { isCloudOnline } from '../persistence/syncEngine.js';
import store from '../persistence/store.js';
import { ProductRecord, TransactionRecord } from '../types/index.js';
class ReportRepository {
  async getPopularProducts(): Promise<any[]> {
    if (isCloudOnline()) {
      try {
        const popular = await ProductModel.find().sort({ salesCount: -1 }).limit(20).lean();
        if (popular.length > 0) return popular.map((p: any) => store.docToProduct(p));
      } catch (err) {
      }
    }
    try {
      const rows = db.prepare('SELECT * FROM local_products ORDER BY salesCount DESC LIMIT 20').all() as any[];
      return rows.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        description: p.description,
        imageUrl: p.imageUrl,
        salesCount: p.salesCount,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
    } catch (err) {
      return [];
    }
  }
  async getEffectiveProducts(k: number = 20): Promise<ProductRecord[]> {
    return this.getPopularProducts();
  }
  async getPOSPatterns(): Promise<any> {
    if (isCloudOnline()) {
      try {
        const byCategory = await ProductModel.aggregate([
          { $group: { _id: '$category', count: { $sum: '$salesCount' } } },
          { $project: { category: '$_id', count: 1, _id: 0 } },
          { $sort: { count: -1 } },
        ]);
        const byPaymentMethod = await TransactionModel.aggregate([
          { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
          { $project: { method: '$_id', count: 1, _id: 0 } },
          { $sort: { count: -1 } },
        ]);
        const timeline = await TransactionModel.aggregate([
          {
            $group: {
              _id: { $substr: ['$createdAt', 0, 10] },
              revenue: { $sum: '$totalAmount' },
              count: { $sum: 1 },
            },
          },
          { $project: { date: '$_id', revenue: 1, count: 1, _id: 0 } },
          { $sort: { date: -1 } },
          { $limit: 30 },
        ]);
        return {
          byCategory: byCategory.length > 0 ? byCategory : [{ category: 'None', count: 0 }],
          byPaymentMethod: byPaymentMethod.length > 0 ? byPaymentMethod : [{ method: 'cash', count: 0 }],
          timeline: timeline.reverse(),
        };
      } catch (err) {
      }
    }
    try {
      const categoryRows = db.prepare('SELECT category, SUM(salesCount) as count FROM local_products GROUP BY category ORDER BY count DESC').all() as any[];
      const txRows = db.prepare('SELECT SUBSTR(createdAt, 1, 10) as date, SUM(totalAmount) as revenue, COUNT(*) as count FROM local_transactions GROUP BY date ORDER BY date ASC LIMIT 30').all() as any[];
      return {
        byCategory: categoryRows.length > 0 ? categoryRows : [{ category: 'General', count: 0 }],
        byPaymentMethod: [{ method: 'cash', count: txRows.reduce((a, c) => a + (c.count || 0), 0) }],
        timeline: txRows,
      };
    } catch (err) {
      return {
        byCategory: [{ category: 'General', count: 0 }],
        byPaymentMethod: [{ method: 'cash', count: 0 }],
        timeline: [],
      };
    }
  }
  async getTimeline(limit = 50): Promise<TransactionRecord[]> {
    if (isCloudOnline()) {
      try {
        const docs = await TransactionModel.find().sort({ createdAt: -1 }).limit(limit).lean();
        if (docs.length > 0) return docs.map((doc: any) => transactionRepositoryDoc(doc));
      } catch (err) {
      }
    }
    try {
      const rows = db.prepare('SELECT * FROM local_transactions ORDER BY createdAt DESC LIMIT ?').all(limit) as any[];
      return rows.map((r) => ({
        id: r.id,
        cashierId: r.cashierId,
        customerId: r.customerId,
        items: JSON.parse(r.itemsJson || '[]'),
        subtotal: r.subtotal,
        discount: r.discount,
        tax: r.tax,
        totalAmount: r.totalAmount,
        paymentMethod: r.paymentMethod || 'cash',
        paymentStatus: r.paymentStatus || 'paid',
        createdAt: r.createdAt,
      }));
    } catch (err) {
      return [];
    }
  }
  async getStats(): Promise<any> {
    if (isCloudOnline()) {
      try {
        const productsCount = await ProductModel.countDocuments();
        const transactionsCount = await TransactionModel.countDocuments();
        const revenueSum = await TransactionModel.aggregate([
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]);
        const totalRevenue = revenueSum[0]?.total || 0;
        const nodeCount = await GraphNodeModel.countDocuments();
        const edgeCount = await GraphEdgeModel.countDocuments();
        return {
          products: { total: productsCount, treeHeight: 0, isBalanced: true },
          transactions: { total: transactionsCount, totalRevenue },
          graph: { nodeCount, edgeCount, nodeTypes: {} },
        };
      } catch (err) {
      }
    }
    try {
      const prodRes = db.prepare('SELECT COUNT(*) as count FROM local_products').get() as any;
      const txRes = db.prepare('SELECT COUNT(*) as count, SUM(totalAmount) as totalRevenue FROM local_transactions').get() as any;
      const nodeRes = db.prepare('SELECT COUNT(*) as count FROM local_graph_nodes').get() as any;
      const edgeRes = db.prepare('SELECT COUNT(*) as count FROM local_graph_edges').get() as any;
      return {
        products: { total: prodRes?.count || 0, treeHeight: 0, isBalanced: true },
        transactions: { total: txRes?.count || 0, totalRevenue: txRes?.totalRevenue || 0 },
        graph: { nodeCount: nodeRes?.count || 0, edgeCount: edgeRes?.count || 0, nodeTypes: {} },
      };
    } catch (err) {
      return {
        products: { total: 0, treeHeight: 0, isBalanced: true },
        transactions: { total: 0, totalRevenue: 0 },
        graph: { nodeCount: 0, edgeCount: 0, nodeTypes: {} },
      };
    }
  }
}
function transactionRepositoryDoc(doc: any): TransactionRecord {
  return {
    id: doc._id,
    cashierId: doc.cashierId,
    customerId: doc.customerId,
    items: doc.items || [],
    subtotal: doc.subtotal,
    discount: doc.discount,
    tax: doc.tax,
    totalAmount: doc.totalAmount,
    paymentMethod: doc.paymentMethod,
    paymentStatus: doc.paymentStatus,
    createdAt: doc.createdAt,
  };
}
export const reportRepository = new ReportRepository();
export default reportRepository;
