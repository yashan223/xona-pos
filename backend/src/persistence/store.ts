import { ProductRecord } from '../types/index.js';
class Store {
  docToProduct(doc: any): ProductRecord {
    return {
      id: doc._id,
      name: doc.name,
      sku: doc.sku,
      category: doc.category,
      price: doc.price,
      cost: doc.cost,
      stock: doc.stock,
      description: doc.description || '',
      imageUrl: doc.imageUrl || '',
      salesCount: doc.salesCount || 0,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
const store = new Store();
export default store;
export { store };
