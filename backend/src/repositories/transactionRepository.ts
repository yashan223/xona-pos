import { TransactionModel, ProductModel, GraphEdgeModel } from '../persistence/database.js';
import db from '../persistence/sqliteDb.js';
import { isCloudOnline } from '../persistence/syncEngine.js';
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
    const online = isCloudOnline();
    db.prepare(`
      INSERT INTO local_transactions (id, cashierId, customerId, itemsJson, subtotal, discount, tax, totalAmount, paymentMethod, paymentStatus, synced, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.cashierId,
      record.customerId,
      JSON.stringify(record.items),
      record.subtotal,
      record.discount,
      record.tax,
      record.totalAmount,
      record.paymentMethod,
      record.paymentStatus,
      online ? 1 : 0,
      record.createdAt
    );
    for (const item of record.items) {
      db.prepare(`
        UPDATE local_products
        SET stock = CASE WHEN stock >= 0 THEN stock - ? ELSE stock END,
            salesCount = salesCount + ?,
            synced = ?
        WHERE id = ?
      `).run(item.quantity, item.quantity, online ? 1 : 0, item.productId);
    }
    const itemIds = record.items.map(i => i.productId);
    for (let i = 0; i < itemIds.length; i++) {
      for (let j = i + 1; j < itemIds.length; j++) {
        const [source, target] = [itemIds[i], itemIds[j]].sort();
        const edgeId = `edge:${source}:${target}:BOUGHT_WITH`;
        const existingRow = db.prepare('SELECT metadataJson FROM local_graph_edges WHERE source = ? AND target = ? AND type = "BOUGHT_WITH"').get(source, target) as any;
        let weight = 1;
        if (existingRow && existingRow.metadataJson) {
          try {
            weight = (JSON.parse(existingRow.metadataJson).weight || 1) + 1;
          } catch (e) {
            weight = 2;
          }
        }
        db.prepare(`
          INSERT INTO local_graph_edges (id, source, target, type, metadataJson, synced)
          VALUES (?, ?, ?, 'BOUGHT_WITH', ?, ?)
          ON CONFLICT(id) DO UPDATE SET metadataJson = excluded.metadataJson, synced = excluded.synced
        `).run(edgeId, source, target, JSON.stringify({ weight }), online ? 1 : 0);
      }
    }
    if (online) {
      try {
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
        for (const item of record.items) {
          const prod = await ProductModel.findById(item.productId);
          let updateObj: any = { $inc: { salesCount: item.quantity } };
          if (prod && prod.stock >= 0) {
            updateObj.$inc.stock = -item.quantity;
          }
          await ProductModel.findByIdAndUpdate(item.productId, updateObj, { new: true });
        }
        for (let i = 0; i < itemIds.length; i++) {
          for (let j = i + 1; j < itemIds.length; j++) {
            const [source, target] = [itemIds[i], itemIds[j]].sort();
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
      } catch (err) {
        console.error('[TransactionRepository] Error saving transaction to Cloud MongoDB (saved locally):', err);
      }
    }
    return record;
  }
  async getTransactionById(id: string): Promise<TransactionRecord | null> {
    const row = db.prepare('SELECT * FROM local_transactions WHERE id = ?').get(id) as any;
    if (row) {
      return this.rowToTransaction(row);
    }
    if (isCloudOnline()) {
      const doc = await TransactionModel.findById(id).lean() as any;
      if (doc) return this.docToTransaction(doc);
    }
    return null;
  }
  async getAllTransactions(): Promise<TransactionRecord[]> {
    const rows = db.prepare('SELECT * FROM local_transactions ORDER BY createdAt DESC').all() as any[];
    if (rows.length > 0) {
      return rows.map((row: any) => this.rowToTransaction(row));
    }
    if (isCloudOnline()) {
      const docs = await TransactionModel.find().sort({ createdAt: -1 }).lean();
      return docs.map((doc: any) => this.docToTransaction(doc));
    }
    return [];
  }
  async refundTransaction(id: string): Promise<TransactionRecord | null> {
    const tx = await this.getTransactionById(id);
    if (!tx || tx.paymentStatus === 'refunded') return null;
    const online = isCloudOnline();
    db.prepare('UPDATE local_transactions SET paymentStatus = "refunded", synced = ? WHERE id = ?').run(online ? 1 : 0, id);
    for (const item of tx.items) {
      db.prepare(`
        UPDATE local_products
        SET stock = CASE WHEN stock >= 0 THEN stock + ? ELSE stock END,
            salesCount = salesCount - ?,
            synced = ?
        WHERE id = ?
      `).run(item.quantity, item.quantity, online ? 1 : 0, item.productId);
    }
    if (online) {
      try {
        const refundedDoc = await TransactionModel.findByIdAndUpdate(
          id,
          { $set: { paymentStatus: 'refunded' } },
          { new: true }
        ).lean() as any;
        if (refundedDoc) {
          for (const item of refundedDoc.items) {
            const prod = await ProductModel.findById(item.productId);
            let updateObj: any = { $inc: { salesCount: -item.quantity } };
            if (prod && prod.stock >= 0) {
              updateObj.$inc.stock = item.quantity;
            }
            await ProductModel.findByIdAndUpdate(item.productId, updateObj, { new: true });
          }
        }
      } catch (err) {
        console.error('[TransactionRepository] Error updating refund in Cloud MongoDB (saved locally):', err);
      }
    }
    return { ...tx, paymentStatus: 'refunded' };
  }
  rowToTransaction(row: any): TransactionRecord {
    let items = [];
    try {
      items = JSON.parse(row.itemsJson || '[]');
    } catch (e) {
      items = [];
    }
    return {
      id: row.id,
      cashierId: row.cashierId,
      customerId: row.customerId,
      items,
      subtotal: row.subtotal,
      discount: row.discount,
      tax: row.tax,
      totalAmount: row.totalAmount,
      paymentMethod: row.paymentMethod,
      paymentStatus: row.paymentStatus,
      createdAt: row.createdAt,
    };
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
