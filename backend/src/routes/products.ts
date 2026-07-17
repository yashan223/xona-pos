import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import productController from '../controllers/productController.js';

const router = Router();

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // limit 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);
    if (extName && mimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, JPG, PNG, WEBP, GIF) are allowed.'));
    }
  }
});

// POST /api/products/upload — Upload a product image
router.post('/upload', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    const port = process.env.PORT || 3000;
    const imageUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });
});

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
