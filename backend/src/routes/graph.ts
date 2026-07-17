import { Router } from 'express';
import graphController from '../controllers/graphController.js';

const router = Router();

// GET /api/graph/related/:productId — BFS to find related products bought together
router.get('/related/:productId', graphController.getRelated);

// GET /api/graph/explore/:nodeId — DFS to explore full relationship components
router.get('/explore/:nodeId', graphController.explore);

// GET /api/graph/visualization — Full product co-occurrence graph for UI rendering
router.get('/visualization', graphController.getVisualization);

// GET /api/graph/subgraph/:nodeId — Subgraph around a specific product/category
router.get('/subgraph/:nodeId', graphController.getSubgraph);

export default router;
