import express, { Request, Response } from 'express';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/status', (_req: Request, res: Response) => {
  const isOnline = mongoose.connection.readyState === 1;
  res.json({
    online: isOnline,
    pending: 0,
    unsyncedCount: 0,
    syncInProgress: false,
    lastSyncTime: new Date().toISOString(),
  });
});

router.post('/trigger', async (_req: Request, res: Response) => {
  const isOnline = mongoose.connection.readyState === 1;
  res.json({
    success: isOnline,
    status: {
      online: isOnline,
      pending: 0,
      unsyncedCount: 0,
      syncInProgress: false,
      lastSyncTime: new Date().toISOString(),
    },
  });
});

export default router;
