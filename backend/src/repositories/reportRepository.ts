import { ProductModel, TransactionModel } from '../persistence/database.js';
import store from '../persistence/store.js';
import { ProductRecord, TransactionRecord } from '../types/index.js';

class ReportRepository {
  async getPopularProducts(): Promise<any[]> {
    // Get popular products ordered by sales count from DB
    const popular = await ProductModel.find().sort({ salesCount: -1 }).limit(20).lean();
    return popular.map((p: any) => store.docToProduct(p));
  }

  getEffectiveProducts(k: number = 20): ProductRecord[] {
    return store.maxHeap.getTopK(k);
  }

  async getPOSPatterns(): Promise<any> {
    // Group transaction revenue by category, payment method and date timeline

    // 1. By Category (Aggregate from transactions or simply look at products salesCount)
    const byCategory = await ProductModel.aggregate([
      { $group: { _id: '$category', count: { $sum: '$salesCount' } } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    // 2. By Payment Method
    const byPaymentMethod = await TransactionModel.aggregate([
      { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
      { $project: { method: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    // 3. Revenue Timeline (last 30 days of transactions)
    const timeline = await TransactionModel.aggregate([
      {
        $group: {
          _id: { $substr: ['$createdAt', 0, 10] }, // YYYY-MM-DD
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $project: { date: '$_id', revenue: 1, _id: 0 } },
      { $sort: { date: -1 } },
      { $limit: 30 }
    ]);

    return {
      byCategory: byCategory.length > 0 ? byCategory : [{ category: 'None', count: 0 }],
      byPaymentMethod: byPaymentMethod.length > 0 ? byPaymentMethod : [{ method: 'cash', count: 0 }],
      timeline: timeline.reverse() // Chronological order
    };
  }

  async getTimeline(limit = 50): Promise<TransactionRecord[]> {
    const docs = await TransactionModel.find().sort({ createdAt: -1 }).limit(limit).lean();
    return docs.map((doc: any) => transactionRepositoryDoc(doc));
  }

  async getStats(): Promise<any> {
    const productsCount = await ProductModel.countDocuments();
    const transactionsCount = await TransactionModel.countDocuments();
    
    const revenueSum = await TransactionModel.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueSum[0]?.total || 0;

    const avlStats = store.avlTree.getStats();
    const graphStats = store.graph.getStats();

    return {
      products: {
        total: productsCount,
        treeHeight: avlStats.height,
        isBalanced: avlStats.isBalanced
      },
      transactions: {
        total: transactionsCount,
        totalRevenue: totalRevenue
      },
      graph: {
        nodeCount: graphStats.nodeCount,
        edgeCount: graphStats.edgeCount,
        nodeTypes: graphStats.nodeTypes
      }
    };
  }
}

// Inline helper to avoid circular dependencies
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
