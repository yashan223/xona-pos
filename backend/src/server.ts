import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import store from './persistence/store.js';
import productRoutes from './routes/products.js';
import transactionRoutes from './routes/transactions.js';
import customerRoutes from './routes/customers.js';
import graphRoutes from './routes/graph.js';
import reportRoutes from './routes/reports.js';
import authRoutes from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Global error boundary for malformed JSON requests
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next(err);
});

// Initialize data structures from MongoDB
store.loadAll();

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Xona POS backend is running', status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Xona POS backend running on http://localhost:${PORT}`);
});
