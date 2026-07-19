import { Request, Response } from 'express';
import productRepository from '../repositories/productRepository.js';
import { broadcast } from '../lib/websocket.js';
import { logActivity } from '../lib/logger.js';

class ProductController {
  create = async (req: Request, res: Response) => {
    try {
      const { name, sku, category, price, cost, stock, description, imageUrl } = req.body;

      if (!name || !sku || price === undefined) {
        return res.status(400).json({ error: 'name, sku and price are required' });
      }

      const record = await productRepository.addProduct({
        name,
        sku,
        category,
        price: Number(price),
        cost: Number(cost || 0),
        stock: Number(stock || 0),
        description,
        imageUrl,
      });

      broadcast('PRODUCTS_UPDATED');
      await logActivity(req, 'CREATE', 'Product', record.id, { name: record.name, sku: record.sku });
      res.status(201).json(record);
    } catch (err) {
      console.error('[products] POST error:', err);
      res.status(500).json({ error: 'Failed to create product record' });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { name, sku, category, price, cost, stock, description, imageUrl } = req.body;

      const record = await productRepository.updateProduct(id, {
        name,
        sku,
        category,
        price: price !== undefined ? Number(price) : undefined,
        cost: cost !== undefined ? Number(cost) : undefined,
        stock: stock !== undefined ? Number(stock) : undefined,
        description,
        imageUrl,
      });

      if (!record) {
        return res.status(404).json({ error: 'Product not found' });
      }

      broadcast('PRODUCTS_UPDATED');
      await logActivity(req, 'UPDATE', 'Product', record.id, { name: record.name, updates: req.body });
      res.json(record);
    } catch (err) {
      console.error('[products] PUT error:', err);
      res.status(500).json({ error: 'Failed to update product record' });
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const products = await productRepository.getAllProducts();
      res.json(products);
    } catch (err) {
      console.error('[products] GET all error:', err);
      res.status(500).json({ error: 'Failed to retrieve products' });
    }
  };

  search = async (req: Request, res: Response) => {
    try {
      const query = (req.query.q as string) || '';
      if (!query) {
        return res.json([]);
      }
      const results = await productRepository.searchProducts(query);
      res.json(results);
    } catch (err) {
      console.error('[products] search error:', err);
      res.status(500).json({ error: 'Search failed' });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const product = await productRepository.getProduct(req.params.id as string);
      if (!product) {
        return res.status(404).json({ error: 'Product record not found' });
      }
      res.json(product);
    } catch (err) {
      console.error('[products] GET by id error:', err);
      res.status(500).json({ error: 'Failed to retrieve product' });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const success = await productRepository.deleteProduct(req.params.id as string);
      if (!success) {
        return res.status(404).json({ error: 'Product record not found' });
      }
      broadcast('PRODUCTS_UPDATED');
      await logActivity(req, 'DELETE', 'Product', req.params.id as string);
      res.json({ message: 'Product record deleted' });
    } catch (err) {
      console.error('[products] DELETE error:', err);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  };
}

export const productController = new ProductController();
export default productController;
