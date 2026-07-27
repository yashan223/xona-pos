import { ProductModel, TransactionModel, GraphNodeModel, GraphEdgeModel } from '../persistence/database.js';
import store from '../persistence/store.js';
import { ProductRecord, TransactionRecord } from '../types/index.js';

class ReportRepository {
  async getPopularProducts(): Promise<any[]> {
    try {
      const popular = await ProductModel.find().sort({ salesCount: -1 }).limit(20).lean();
      return popular.map((p: any) => store.docToProduct(p));
    } catch (err) {
      console.error('[ReportRepository] Error fetching popular products:', err);
      return [];
    }
  }

  async getEffectiveProducts(k: number = 20): Promise<ProductRecord[]> {
    return this.getPopularProducts();
  }

  async getPOSPatterns(): Promise<any> {
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
        byCategory: byCategory.length > 0 ? byCategory : [{ category: 'General', count: 0 }],
        byPaymentMethod: byPaymentMethod.length > 0 ? byPaymentMethod : [{ method: 'cash', count: 0 }],
        timeline: timeline.reverse(),
      };
    } catch (err) {
      console.error('[ReportRepository] Error getting POS patterns:', err);
      return {
        byCategory: [{ category: 'General', count: 0 }],
        byPaymentMethod: [{ method: 'cash', count: 0 }],
        timeline: [],
      };
    }
  }

  async getTimeline(limit = 50): Promise<TransactionRecord[]> {
    try {
      const docs = await TransactionModel.find().sort({ createdAt: -1 }).limit(limit).lean();
      return docs.map((doc: any) => transactionRepositoryDoc(doc));
    } catch (err) {
      console.error('[ReportRepository] Error getting timeline:', err);
      return [];
    }
  }

  async getStats(): Promise<any> {
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
      console.error('[ReportRepository] Error getting stats:', err);
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
