import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import productRoutes from './routes/products.js';
import transactionRoutes from './routes/transactions.js';
import customerRoutes from './routes/customers.js';
import graphRoutes from './routes/graph.js';
import reportRoutes from './routes/reports.js';
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';
import activityRoutes from './routes/activity.js';

const app = express();
const PORT = process.env.PORT || 3000;

const backendDir = process.cwd().endsWith('backend') ? process.cwd() : path.join(process.cwd(), 'backend');

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-user-id', 'x-user-role']
}));

// Device API Key Middleware
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.DEVICE_API_KEY;

  // Allow requests if no key is configured on server (for backward compat), 
  // but if configured, enforce it.
  if (expectedKey && apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Device API Key' });
  }
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(backendDir, 'uploads')));
app.use('/receipts', express.static(path.join(backendDir, 'receipts')));
app.use('/reports', express.static(path.join(backendDir, 'reports')));

// Global error boundary for malformed JSON requests
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next(err);
});



// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/activity', activityRoutes);

import http from 'http';
import { initWebSocketServer } from './lib/websocket.js';

// Health check
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Xona POS backend is running', status: 'ok' });
});

const server = http.createServer(app);
initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 Xona POS backend running on http://localhost:${PORT}`);
});
// Trigger reload

