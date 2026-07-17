import { TransactionModel, ProductModel, CustomerModel, GraphEdgeModel } from '../persistence/database.js';
import store from '../persistence/store.js';
import { TransactionRecord } from '../types/index.js';

class TransactionRepository {
  private _generateId(): string {
    return `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  async createTransaction(txData: Partial<TransactionRecord>): Promise<TransactionRecord> {
    const now = new Date().toISOString();
    const id = txData.id || this._generateId();
    
    const record: TransactionRecord = {
      id,
      cashierId: txData.cashierId || '',
      customerId: txData.customerId || null,
      items: txData.items || [],
      subtotal: txData.subtotal || 0,
      discount: txData.discount || 0,
      tax: txData.tax || 0,
      totalAmount: txData.totalAmount || 0,
      paymentMethod: txData.paymentMethod || 'cash',
      paymentStatus: txData.paymentStatus || 'paid',
      createdAt: now,
    };

    // 1. Save Transaction to MongoDB
    await TransactionModel.create({
      _id: record.id,
      cashierId: record.cashierId,
      customerId: record.customerId,
      items: record.items,
      subtotal: record.subtotal,
      discount: record.discount,
      tax: record.tax,
      totalAmount: record.totalAmount,
      paymentMethod: record.paymentMethod,
      paymentStatus: record.paymentStatus,
      createdAt: record.createdAt,
    });

    // 2. Process transaction items
    for (const item of record.items) {
      // Update inventory stock and sales counts in MongoDB
      const prod = await ProductModel.findById(item.productId);
      let updateObj: any = { $inc: { salesCount: item.quantity } };
      if (prod && prod.stock >= 0) {
        updateObj.$inc.stock = -item.quantity;
      }

      const updatedProductDoc = await ProductModel.findByIdAndUpdate(
        item.productId,
        updateObj,
        { new: true }
      ).lean() as any;

      if (updatedProductDoc) {
        const prodRecord = store.docToProduct(updatedProductDoc);
        
        // Update in-memory AVLTree and MaxHeap
        store.avlTree.delete(item.productId);
        store.avlTree.insert(prodRecord);
        store.maxHeap.remove(item.productId);
        store.maxHeap.insert(prodRecord);
      }
    }

    // 3. Update customer loyalty points (e.g. 1 point per $10 spent)
    if (record.customerId && record.totalAmount > 0) {
      const earnedPoints = Math.floor(record.totalAmount / 10);
      if (earnedPoints > 0) {
        await CustomerModel.findByIdAndUpdate(
          record.customerId,
          { $inc: { loyaltyPoints: earnedPoints } }
        );
      }
    }

    // 4. Update Co-occurrence Graph (Bought Together)
    // Create edges between every pair of items in the cart
    const itemIds = record.items.map(i => i.productId);
    for (let i = 0; i < itemIds.length; i++) {
      for (let j = i + 1; j < itemIds.length; j++) {
        const prodA = itemIds[i];
        const prodB = itemIds[j];

        // Sort IDs to maintain alphabetical ordering of edges and prevent duplicate pairs
        const [source, target] = [prodA, prodB].sort();

        // Update in-memory Graph
        store.graph.addEdge(source, target, 'BOUGHT_WITH', { weight: 1 });

        // Update in MongoDB GraphEdge collection
        const existingEdge = await GraphEdgeModel.findOne({ source, target, type: 'BOUGHT_WITH' });
        if (existingEdge) {
          const currentWeight = ((existingEdge.toObject() as any).metadata?.weight || 1) + 1;
          await GraphEdgeModel.updateOne(
            { _id: (existingEdge as any)._id },
            { $set: { metadata: { weight: currentWeight } } }
          );
        } else {
          await GraphEdgeModel.create({
            source,
            target,
            type: 'BOUGHT_WITH',
            metadata: { weight: 1 }
          } as any);
        }
      }
    }

    return record;
  }

  async getTransactionById(id: string): Promise<TransactionRecord | null> {
    const doc = await TransactionModel.findById(id).lean() as any;
    if (!doc) return null;
    return this.docToTransaction(doc);
  }

  async getAllTransactions(): Promise<TransactionRecord[]> {
    const docs = await TransactionModel.find().sort({ createdAt: -1 }).lean();
    return docs.map((doc: any) => this.docToTransaction(doc));
  }

  async refundTransaction(id: string): Promise<TransactionRecord | null> {
    const doc = await TransactionModel.findById(id).lean() as any;
    if (!doc || doc.paymentStatus === 'refunded') return null;

    // 1. Update status to refunded in DB
    const refundedDoc = await TransactionModel.findByIdAndUpdate(
      id,
      { $set: { paymentStatus: 'refunded' } },
      { new: true }
    ).lean() as any;

    // 2. Put stock items back into inventory
    for (const item of refundedDoc.items) {
      const prod = await ProductModel.findById(item.productId);
      let updateObj: any = { $inc: { salesCount: -item.quantity } };
      if (prod && prod.stock >= 0) {
        updateObj.$inc.stock = item.quantity;
      }

      const updatedProdDoc = await ProductModel.findByIdAndUpdate(
        item.productId,
        updateObj,
        { new: true }
      ).lean() as any;

      if (updatedProdDoc) {
        const prodRecord = store.docToProduct(updatedProdDoc);
        store.avlTree.delete(item.productId);
        store.avlTree.insert(prodRecord);
        store.maxHeap.remove(item.productId);
        store.maxHeap.insert(prodRecord);
      }
    }

    // 3. Deduct loyalty points from customer
    if (refundedDoc.customerId && refundedDoc.totalAmount > 0) {
      const pointsToDeduct = Math.floor(refundedDoc.totalAmount / 10);
      if (pointsToDeduct > 0) {
        await CustomerModel.findByIdAndUpdate(
          refundedDoc.customerId,
          { $inc: { loyaltyPoints: -pointsToDeduct } }
        );
      }
    }

    return this.docToTransaction(refundedDoc);
  }

  docToTransaction(doc: any): TransactionRecord {
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
}

export const transactionRepository = new TransactionRepository();
export default transactionRepository;
