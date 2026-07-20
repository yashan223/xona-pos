import { Router } from 'express';
import graphController from '../controllers/graphController.js';
const router = Router();
router.get('/related/:productId', graphController.getRelated);
router.get('/explore/:nodeId', graphController.explore);
router.get('/visualization', graphController.getVisualization);
router.get('/subgraph/:nodeId', graphController.getSubgraph);
export default router;
