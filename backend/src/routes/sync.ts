import express, { Request, Response } from 'express';
import { getSyncStatus, syncPendingToCloud } from '../persistence/syncEngine.js';
const router = express.Router();
router.get('/status', (req: Request, res: Response) => {
  res.json(getSyncStatus());
});
router.post('/trigger', async (req: Request, res: Response) => {
  const success = await syncPendingToCloud();
  res.json({ success, status: getSyncStatus() });
});
export default router;
