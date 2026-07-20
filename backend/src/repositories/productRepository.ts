import { ProductModel, GraphNodeModel, GraphEdgeModel } from '../persistence/database.js';
import db from '../persistence/sqliteDb.js';
import { isCloudOnline } from '../persistence/syncEngine.js';
import store from '../persistence/store.js';
import { ProductRecord } from '../types/index.js';
class ProductRepository {
  private _generateId(): string {
    return `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  async addProduct(productData: Partial<ProductRecord>): Promise<ProductRecord> {
    const now = new Date().toISOString();
    const id = productData.id || this._generateId();
    const record: ProductRecord = {
      id,
      name: productData.name || '',
      sku: productData.sku || '',
      category: productData.category || 'General',
      price: productData.price || 0,
      cost: productData.cost || 0,
      stock: productData.stock || 0,
      description: productData.description || '',
      imageUrl: productData.imageUrl || '',
      salesCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const online = isCloudOnline();
    db.prepare(`
      INSERT INTO local_products (id, name, sku, category, price, cost, stock, description, imageUrl, salesCount, synced, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        sku=excluded.sku,
        category=excluded.category,
        price=excluded.price,
        cost=excluded.cost,
        stock=excluded.stock,
        description=excluded.description,
        imageUrl=excluded.imageUrl,
        synced=excluded.synced,
        updatedAt=excluded.updatedAt
    `).run(
      record.id,
      record.name,
      record.sku,
      record.category,
      record.price,
      record.cost,
      record.stock,
      record.description,
      record.imageUrl,
      record.salesCount,
      online ? 1 : 0,
      record.createdAt,
      record.updatedAt
    );
    const categoryId = `cat:${record.category.toLowerCase().replace(/\s+/g, '-')}`;
    db.prepare(`
      INSERT INTO local_graph_nodes (id, type, label, metadataJson, synced)
      VALUES (?, 'product', ?, '{}', ?)
      ON CONFLICT(id) DO UPDATE SET label=excluded.label, synced=excluded.synced
    `).run(record.id, record.name, online ? 1 : 0);
    db.prepare(`
      INSERT INTO local_graph_nodes (id, type, label, metadataJson, synced)
      VALUES (?, 'category', ?, '{}', ?)
      ON CONFLICT(id) DO UPDATE SET label=excluded.label, synced=excluded.synced
    `).run(categoryId, record.category, online ? 1 : 0);
    const edgeId = `edge:${record.id}:${categoryId}:BELONGS_TO`;
    db.prepare(`
      INSERT INTO local_graph_edges (id, source, target, type, metadataJson, synced)
      VALUES (?, ?, ?, 'BELONGS_TO', '{}', ?)
      ON CONFLICT(id) DO UPDATE SET synced=excluded.synced
    `).run(edgeId, record.id, categoryId, online ? 1 : 0);
    if (online) {
      try {
        await ProductModel.create({
          _id: record.id,
          name: record.name,
          sku: record.sku,
          category: record.category,
          price: record.price,
          cost: record.cost,
          stock: record.stock,
          description: record.description,
          imageUrl: record.imageUrl,
          salesCount: record.salesCount,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });
        await GraphNodeModel.findOneAndUpdate(
          { _id: record.id },
          { type: 'product', label: record.name },
          { upsert: true }
        );
        await GraphNodeModel.findOneAndUpdate(
          { _id: categoryId },
          { type: 'category', label: record.category },
          { upsert: true }
        );
        await GraphEdgeModel.findOneAndUpdate(
          { source: record.id, target: categoryId, type: 'BELONGS_TO' },
          {},
          { upsert: true }
        );
      } catch (err) {
        console.error('[ProductRepository] Error writing to Cloud MongoDB (saved locally):', err);
      }
    }
    return record;
  }
  async updateProduct(id: string, productData: Partial<ProductRecord>): Promise<ProductRecord | null> {
    const existing = await this.getProduct(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const updatedRecord: ProductRecord = {
      ...existing,
      ...productData,
      updatedAt: now,
    };
    const online = isCloudOnline();
    db.prepare(`
      UPDATE local_products SET
        name = ?,
        sku = ?,
        category = ?,
        price = ?,
        cost = ?,
        stock = ?,
        description = ?,
        imageUrl = ?,
        synced = ?,
        updatedAt = ?
      WHERE id = ?
    `).run(
      updatedRecord.name,
      updatedRecord.sku,
      updatedRecord.category,
      updatedRecord.price,
      updatedRecord.cost,
      updatedRecord.stock,
      updatedRecord.description,
      updatedRecord.imageUrl,
      online ? 1 : 0,
      updatedRecord.updatedAt,
      id
    );
    if (online) {
      try {
        await ProductModel.findByIdAndUpdate(
          id,
          { $set: productData, updatedAt: now },
          { new: true }
        );
        await GraphNodeModel.updateOne({ _id: id }, { label: updatedRecord.name });
      } catch (err) {
        console.error('[ProductRepository] Error updating Cloud MongoDB (saved locally):', err);
      }
    }
    return updatedRecord;
  }
  async deleteProduct(id: string): Promise<boolean> {
    const existing = await this.getProduct(id);
    if (!existing) return false;
    db.prepare('DELETE FROM local_products WHERE id = ?').run(id);
    db.prepare('DELETE FROM local_graph_nodes WHERE id = ?').run(id);
    db.prepare('DELETE FROM local_graph_edges WHERE source = ? OR target = ?').run(id, id);
    if (isCloudOnline()) {
      try {
        await ProductModel.deleteOne({ _id: id });
        await GraphNodeModel.deleteOne({ _id: id });
        await GraphEdgeModel.deleteMany({ $or: [{ source: id }, { target: id }] });
      } catch (err) {
        console.error('[ProductRepository] Error deleting from Cloud MongoDB:', err);
      }
    }
    return true;
  }
  async getProduct(id: string): Promise<ProductRecord | null> {
    const row = db.prepare('SELECT * FROM local_products WHERE id = ?').get(id) as any;
    if (row) {
      return store.docToProduct({
        _id: row.id,
        name: row.name,
        sku: row.sku,
        category: row.category,
        price: row.price,
        cost: row.cost,
        stock: row.stock,
        description: row.description,
        imageUrl: row.imageUrl,
        salesCount: row.salesCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }
    if (isCloudOnline()) {
      const doc = await ProductModel.findById(id).lean();
      return doc ? store.docToProduct(doc) : null;
    }
    return null;
  }
  async getAllProducts(): Promise<ProductRecord[]> {
    const rows = db.prepare('SELECT * FROM local_products ORDER BY name ASC').all() as any[];
    if (rows.length > 0) {
      return rows.map((row: any) =>
        store.docToProduct({
          _id: row.id,
          name: row.name,
          sku: row.sku,
          category: row.category,
          price: row.price,
          cost: row.cost,
          stock: row.stock,
          description: row.description,
          imageUrl: row.imageUrl,
          salesCount: row.salesCount,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })
      );
    }
    if (isCloudOnline()) {
      const docs = await ProductModel.find().sort({ name: 1 }).lean();
      return docs.map((doc: any) => store.docToProduct(doc));
    }
    return [];
  }
  async searchProducts(query: string): Promise<ProductRecord[]> {
    const rows = db.prepare('SELECT * FROM local_products WHERE name LIKE ? OR sku LIKE ? ORDER BY name ASC').all(`%${query}%`, `%${query}%`) as any[];
    return rows.map((row: any) =>
      store.docToProduct({
        _id: row.id,
        name: row.name,
        sku: row.sku,
        category: row.category,
        price: row.price,
        cost: row.cost,
        stock: row.stock,
        description: row.description,
        imageUrl: row.imageUrl,
        salesCount: row.salesCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
    );
  }
}
export const productRepository = new ProductRepository();
export default productRepository;
