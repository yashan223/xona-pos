import express, { Request, Response } from 'express';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/status', (_req: Request, res: Response) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const isOnline = true;
  res.json({
    isOnline,
    online: isOnline,
    dbConnected,
    pendingCount: 0,
    pending: 0,
    unsyncedCount: 0,
    isSyncing: false,
    syncInProgress: false,
    lastSyncTime: new Date().toISOString(),
  });
});

router.post('/trigger', async (_req: Request, res: Response) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const isOnline = true;
  res.json({
    success: true,
    status: {
      isOnline,
      online: isOnline,
      dbConnected,
      pendingCount: 0,
      pending: 0,
      unsyncedCount: 0,
      isSyncing: false,
      syncInProgress: false,
      lastSyncTime: new Date().toISOString(),
    },
  });
});

export default router;
