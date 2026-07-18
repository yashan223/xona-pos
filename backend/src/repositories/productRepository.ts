import { ProductModel, GraphNodeModel, GraphEdgeModel } from '../persistence/database.js';
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

    // 1. Save to MongoDB
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

    // 2. Add to Graph Nodes and Edges
    await GraphNodeModel.findOneAndUpdate(
      { _id: record.id },
      { type: 'product', label: record.name },
      { upsert: true }
    );

    if (record.category) {
      const categoryId = `cat:${record.category.toLowerCase().replace(/\s+/g, '-')}`;
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
    }

    return record;
  }

  async updateProduct(id: string, productData: Partial<ProductRecord>): Promise<ProductRecord | null> {
    const existing = await this.getProduct(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates = {
      ...productData,
      updatedAt: now,
    };

    // 1. Update in MongoDB
    const updatedDoc = await ProductModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).lean() as any;

    if (!updatedDoc) return null;

    const updatedRecord = store.docToProduct(updatedDoc);

    // 2. Update Graph Node label
    await GraphNodeModel.updateOne({ _id: id }, { label: updatedRecord.name });

    // Handle category change if applicable
    if (productData.category && productData.category !== existing.category) {
      // Remove old category edge
      const oldCatId = `cat:${existing.category.toLowerCase().replace(/\s+/g, '-')}`;
      await GraphEdgeModel.deleteOne({ source: id, target: oldCatId, type: 'BELONGS_TO' });

      // Add new category edge
      const newCatId = `cat:${productData.category.toLowerCase().replace(/\s+/g, '-')}`;
      await GraphNodeModel.findOneAndUpdate(
        { _id: newCatId },
        { type: 'category', label: productData.category },
        { upsert: true }
      );

      await GraphEdgeModel.findOneAndUpdate(
        { source: id, target: newCatId, type: 'BELONGS_TO' },
        {},
        { upsert: true }
      );
    }

    return updatedRecord;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const existing = await this.getProduct(id);
    if (!existing) return false;

    // 1. Delete from MongoDB
    await ProductModel.deleteOne({ _id: id });
    await GraphNodeModel.deleteOne({ _id: id });
    await GraphEdgeModel.deleteMany({ $or: [{ source: id }, { target: id }] });

    return true;
  }

  async getProduct(id: string): Promise<ProductRecord | null> {
    const doc = await ProductModel.findById(id).lean();
    return doc ? store.docToProduct(doc) : null;
  }

  async getAllProducts(): Promise<ProductRecord[]> {
    const docs = await ProductModel.find().sort({ name: 1 }).lean();
    return docs.map((doc: any) => store.docToProduct(doc));
  }

  async searchProducts(query: string): Promise<ProductRecord[]> {
    const regex = new RegExp('^' + query, 'i');
    const docs = await ProductModel.find({ name: regex }).sort({ name: 1 }).lean();
    return docs.map((doc: any) => store.docToProduct(doc));
  }
}

export const productRepository = new ProductRepository();
export default productRepository;
