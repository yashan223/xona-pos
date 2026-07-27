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
      salesCount: productData.salesCount || 0,
      createdAt: now,
      updatedAt: now,
    };

    const categoryId = `cat:${record.category.toLowerCase().replace(/\s+/g, '-')}`;

    await ProductModel.findOneAndUpdate(
      { _id: record.id },
      {
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
      },
      { upsert: true, returnDocument: 'after' }
    );

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

    return record;
  }

  async updateProduct(id: string, productData: Partial<ProductRecord>): Promise<ProductRecord | null> {
    const now = new Date().toISOString();
    const doc = await ProductModel.findByIdAndUpdate(
      id,
      { $set: { ...productData, updatedAt: now } },
      { returnDocument: 'after' }
    ).lean();

    if (!doc) return null;

    if (productData.name) {
      await GraphNodeModel.updateOne({ _id: id }, { label: productData.name });
    }

    return store.docToProduct(doc);
  }

  async deleteProduct(id: string): Promise<boolean> {
    const res = await ProductModel.deleteOne({ _id: id });
    if (res.deletedCount && res.deletedCount > 0) {
      await GraphNodeModel.deleteOne({ _id: id });
      await GraphEdgeModel.deleteMany({ $or: [{ source: id }, { target: id }] });
      return true;
    }
    return false;
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
    const regex = new RegExp(query, 'i');
    const docs = await ProductModel.find({
      $or: [{ name: regex }, { sku: regex }],
    }).sort({ name: 1 }).lean();
    return docs.map((doc: any) => store.docToProduct(doc));
  }
}

export const productRepository = new ProductRepository();
export default productRepository;
