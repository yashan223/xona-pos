import { Router } from 'express';
import productController from '../controllers/productController.js';

const router = Router();

// POST /api/products — Create a new product
router.post('/', productController.create);

// GET /api/products — List all products
router.get('/', productController.getAll);

// GET /api/products/search?q= — Search products by prefix
router.get('/search', productController.search);

// GET /api/products/:id — Get a specific product
router.get('/:id', productController.getById);

// PUT /api/products/:id — Update a product
router.put('/:id', productController.update);

// DELETE /api/products/:id — Delete a product
router.delete('/:id', productController.delete);

export default router;
