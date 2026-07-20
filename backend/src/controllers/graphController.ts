import { Request, Response } from 'express';
import { GraphNodeModel, GraphEdgeModel } from '../persistence/database.js';
async function runBfs(startId: string, maxDepth: number = 3) {
  const dbNodes = await GraphNodeModel.find().lean();
  const dbEdges = await GraphEdgeModel.find().lean();
  const nodesMap = new Map<string, any>();
  for (const node of dbNodes) {
    nodesMap.set(node._id, { id: node._id, type: node.type, label: node.label, metadata: node.metadata || {} });
  }
  const adjacency = new Map<string, any[]>();
  for (const edge of dbEdges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
    adjacency.get(edge.source)!.push({ targetId: edge.target, edgeType: edge.type });
    adjacency.get(edge.target)!.push({ targetId: edge.source, edgeType: edge.type });
  }
  const visited = new Map<string, { node: any; depth: number }>();
  if (!nodesMap.has(startId)) return { visited, edges: [] };
  const edges: any[] = [];
  const queue = [{ id: startId, depth: 0 }];
  visited.set(startId, { node: nodesMap.get(startId), depth: 0 });
  let head = 0;
  while (head < queue.length) {
    const { id, depth } = queue[head++];
    if (depth >= maxDepth) continue;
    const neighbors = adjacency.get(id) || [];
    for (const edge of neighbors) {
      edges.push({
        source: id,
        target: edge.targetId,
        type: edge.edgeType,
      });
      if (!visited.has(edge.targetId)) {
        visited.set(edge.targetId, {
          node: nodesMap.get(edge.targetId),
          depth: depth + 1,
        });
        queue.push({ id: edge.targetId, depth: depth + 1 });
      }
    }
  }
  return { visited, edges };
}
async function runDfs(startId: string) {
  const dbNodes = await GraphNodeModel.find().lean();
  const dbEdges = await GraphEdgeModel.find().lean();
  const nodesMap = new Map<string, any>();
  for (const node of dbNodes) {
    nodesMap.set(node._id, { id: node._id, type: node.type, label: node.label, metadata: node.metadata || {} });
  }
  const adjacency = new Map<string, any[]>();
  for (const edge of dbEdges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
    adjacency.get(edge.source)!.push({ targetId: edge.target, edgeType: edge.type });
    adjacency.get(edge.target)!.push({ targetId: edge.source, edgeType: edge.type });
  }
  const visited = new Map<string, { node: any; discoveryOrder: number }>();
  if (!nodesMap.has(startId)) return { visited, edges: [] };
  const edges: any[] = [];
  let order = 0;
  const stack: { id: string; parentId: string | null; edgeType: string | null }[] = [
    { id: startId, parentId: null, edgeType: null }
  ];
  while (stack.length > 0) {
    const { id, parentId, edgeType } = stack.pop()!;
    if (visited.has(id)) continue;
    visited.set(id, {
      node: nodesMap.get(id),
      discoveryOrder: order++,
    });
    if (parentId !== null && edgeType !== null) {
      edges.push({ source: parentId, target: id, type: edgeType });
    }
    const neighbors = adjacency.get(id) || [];
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const edge = neighbors[i];
      if (!visited.has(edge.targetId)) {
        stack.push({ id: edge.targetId, parentId: id, edgeType: edge.edgeType });
      }
    }
  }
  return { visited, edges };
}
class GraphController {
  getRelated = async (req: Request, res: Response) => {
    try {
      const depth = parseInt(req.query.depth as string) || 3;
      const { visited, edges } = await runBfs(req.params.productId as string, depth);
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
      const { visited, edges } = await runDfs(req.params.nodeId as string);
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
      const dbNodes = await GraphNodeModel.find().lean();
      const dbEdges = await GraphEdgeModel.find().lean();
      const nodes = dbNodes.map(node => ({
        id: node._id,
        type: node.type,
        label: node.label,
        metadata: node.metadata || {}
      }));
      const seen = new Set<string>();
      const edges: any[] = [];
      for (const edge of dbEdges) {
        const key = [edge.source, edge.target].sort().join('|') + '|' + edge.type;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({
            source: edge.source,
            target: edge.target,
            type: edge.type,
          });
        }
      }
      const nodeTypes: Record<string, number> = {};
      for (const node of nodes) {
        nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
      }
      const stats = {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        nodeTypes
      };
      res.json({ nodes, edges, stats });
    } catch (err) {
      console.error('[graph] visualization error:', err);
      res.status(500).json({ error: 'Failed to get visualization data' });
    }
  };
  getSubgraph = async (req: Request, res: Response) => {
    try {
      const depth = parseInt(req.query.depth as string) || 2;
      const { visited, edges } = await runBfs(req.params.nodeId as string, depth);
      const nodes: any[] = [];
      for (const [, info] of visited) {
        nodes.push(info.node);
      }
      const seen = new Set<string>();
      const uniqueEdges: any[] = [];
      for (const edge of edges) {
        const key = [edge.source, edge.target].sort().join('|') + '|' + edge.type;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueEdges.push(edge);
        }
      }
      res.json({ nodes, edges: uniqueEdges });
    } catch (err) {
      console.error('[graph] subgraph error:', err);
      res.status(500).json({ error: 'Failed to get subgraph' });
    }
  };
}
export const graphController = new GraphController();
export default graphController;
