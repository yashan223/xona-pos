import { ProductModel, GraphNodeModel, GraphEdgeModel } from './database.js';
import AVLTree from '../data-structures/AVLTree.js';
import MaxHeap from '../data-structures/MaxHeap.js';
import Graph from '../data-structures/Graph.js';
import { ProductRecord } from '../types/index.js';

class Store {
  avlTree = new AVLTree();
  maxHeap = new MaxHeap();
  graph = new Graph();

  async loadAll(): Promise<void> {
    this.avlTree.clear();
    this.maxHeap.clear();
    this.graph.clear();

    try {
      // 1. Load products into AVL Tree and Max Heap
      const dbProducts = await ProductModel.find().lean();
      const productRecords: ProductRecord[] = dbProducts.map((p: any) => this.docToProduct(p));
      
      for (const record of productRecords) {
        this.avlTree.insert(record);
      }

      if (productRecords.length > 0) {
        this.maxHeap.buildHeap(productRecords);
      }

      // 2. Load recommendation graph nodes
      const dbNodes = await GraphNodeModel.find().lean();
      for (const node of dbNodes) {
        this.graph.addNode(node._id, node.type as any, node.label, node.metadata || {});
      }

      // 3. Load recommendation graph edges
      const dbEdges = await GraphEdgeModel.find().lean();
      for (const edge of dbEdges) {
        // Safe check to avoid edge additions for nodes that don't exist
        this.graph.addEdge(edge.source, edge.target, edge.type as any);
      }

      console.log(`[Store] Loaded in-memory: ${productRecords.length} products, ${dbNodes.length} graph nodes, ${dbEdges.length} graph edges`);
    } catch (err) {
      console.error('[Store] Failed to load data from MongoDB:', err);
    }
  }

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
