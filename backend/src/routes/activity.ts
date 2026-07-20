import { Router, Request, Response } from 'express';
import { ActivityLogModel } from '../models/index.js';
const router = Router();
router.get('/', async (req: Request, res: Response) => {
  try {
    const logs = await ActivityLogModel.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
    res.json(logs);
  } catch (err) {
    console.error('[activity] GET all error:', err);
    res.status(500).json({ error: 'Failed to retrieve activity logs' });
  }
});
export default router;
