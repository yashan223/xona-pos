import express, { Request, Response } from 'express';
import { getSyncStatus, syncPendingToCloud } from '../persistence/syncEngine.js';

const router = express.Router();

// GET /api/sync/status
router.get('/status', (req: Request, res: Response) => {
  res.json(getSyncStatus());
});

// POST /api/sync/trigger
router.post('/trigger', async (req: Request, res: Response) => {
  const success = await syncPendingToCloud();
  res.json({ success, status: getSyncStatus() });
});

export default router;
