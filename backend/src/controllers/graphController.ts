import { Request, Response } from 'express';
import store from '../persistence/store.js';

class GraphController {
  getRelated = async (req: Request, res: Response) => {
    try {
      const depth = parseInt(req.query.depth as string) || 3;
      const { visited, edges } = store.graph.bfs(req.params.productId as string, depth);

      const nodes = [];
      for (const [, info] of visited) {
        nodes.push({ ...info.node, depth: info.depth });
      }

      res.json({ nodes, edges });
    } catch (err) {
      console.error('[graph] related error:', err);
      res.status(500).json({ error: 'Failed to find related items' });
    }
  };

  explore = async (req: Request, res: Response) => {
    try {
      const { visited, edges } = store.graph.dfs(req.params.nodeId as string);

      const nodes = [];
      for (const [, info] of visited) {
        nodes.push({ ...info.node, discoveryOrder: info.discoveryOrder });
      }

      res.json({ nodes, edges });
    } catch (err) {
      console.error('[graph] explore error:', err);
      res.status(500).json({ error: 'Failed to explore relationships' });
    }
  };

  getVisualization = async (req: Request, res: Response) => {
    try {
      const data = store.graph.getVisualizationData();
      const stats = store.graph.getStats();
      res.json({ ...data, stats });
    } catch (err) {
      console.error('[graph] visualization error:', err);
      res.status(500).json({ error: 'Failed to get visualization data' });
    }
  };

  getSubgraph = async (req: Request, res: Response) => {
    try {
      const depth = parseInt(req.query.depth as string) || 2;
      const subgraph = store.graph.getSubgraph(req.params.nodeId as string, depth);
      res.json(subgraph);
    } catch (err) {
      console.error('[graph] subgraph error:', err);
      res.status(500).json({ error: 'Failed to get subgraph' });
    }
  };
}

export const graphController = new GraphController();
export default graphController;
