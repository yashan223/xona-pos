import { GraphNode, GraphEdge } from '../types/index.js';

export interface AdjacencyEdge {
  targetId: string;
  edgeType: 'BOUGHT_WITH' | 'BELONGS_TO';
  metadata: Record<string, any>;
}

export class Graph {
  nodes: Map<string, GraphNode> = new Map();             // nodeId → GraphNode
  adjacency: Map<string, AdjacencyEdge[]> = new Map();   // nodeId → AdjacencyEdge[]

  // ─── Node Operations ────────────────────────────────────

  addNode(id: string, type: GraphNode['type'], label: string, metadata: Record<string, any> = {}): GraphNode {
    const existing = this.nodes.get(id);
    if (existing) return existing;

    const node: GraphNode = { id, type, label, metadata };
    this.nodes.set(id, node);
    this.adjacency.set(id, []);
    return node;
  }

  removeNode(id: string): boolean {
    if (!this.nodes.has(id)) return false;

    // Remove all edges pointing to this node
    for (const [nodeId, edges] of this.adjacency) {
      this.adjacency.set(nodeId, edges.filter(e => e.targetId !== id));
    }

    // Remove the node's own edges and entry
    this.adjacency.delete(id);
    this.nodes.delete(id);
    return true;
  }

  getNode(id: string): GraphNode | null {
    return this.nodes.get(id) || null;
  }

  // ─── Edge Operations ────────────────────────────────────

  addEdge(sourceId: string, targetId: string, edgeType: AdjacencyEdge['edgeType'], metadata: Record<string, any> = {}): boolean {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      return false;
    }

    const edges = this.adjacency.get(sourceId)!;
    const existingEdge = edges.find(e => e.targetId === targetId && e.edgeType === edgeType);
    
    if (existingEdge) {
      // For bought-with edges, we increment the co-occurrence weight
      if (edgeType === 'BOUGHT_WITH') {
        const weight = (existingEdge.metadata.weight || 1) + (metadata.weight || 1);
        existingEdge.metadata.weight = weight;
        
        // Find bidirectional edge in target
        const targetEdges = this.adjacency.get(targetId)!;
        const targetEdge = targetEdges.find(e => e.targetId === sourceId && e.edgeType === edgeType);
        if (targetEdge) {
          targetEdge.metadata.weight = weight;
        }
        return true;
      }
      return false;
    }

    // Add bidirectional edges
    this.adjacency.get(sourceId)!.push({ targetId, edgeType, metadata: { ...metadata } });
    this.adjacency.get(targetId)!.push({ targetId: sourceId, edgeType, metadata: { ...metadata } });

    return true;
  }

  removeEdge(sourceId: string, targetId: string, edgeType: AdjacencyEdge['edgeType']): boolean {
    if (!this.adjacency.has(sourceId) || !this.adjacency.has(targetId)) return false;

    this.adjacency.set(
      sourceId,
      this.adjacency.get(sourceId)!.filter(e => !(e.targetId === targetId && e.edgeType === edgeType))
    );
    this.adjacency.set(
      targetId,
      this.adjacency.get(targetId)!.filter(e => !(e.targetId === sourceId && e.edgeType === edgeType))
    );

    return true;
  }

  getNeighbors(nodeId: string): { node: GraphNode | undefined; edgeType: AdjacencyEdge['edgeType']; metadata: Record<string, any> }[] {
    const edges = this.adjacency.get(nodeId);
    if (!edges) return [];

    return edges.map(e => ({
      node: this.nodes.get(e.targetId),
      edgeType: e.edgeType,
      metadata: e.metadata,
    }));
  }

  // ─── BFS (Breadth-First Search) ──────────────────────────

  /**
   * BFS from a starting node up to `maxDepth` hops.
   * Returns { visited: Map<id, {node, depth}>, edges: [{source, target, type}] }
   */
  bfs(startId: string, maxDepth: number = 3): { visited: Map<string, { node: GraphNode; depth: number }>; edges: GraphEdge[] } {
    const visited = new Map<string, { node: GraphNode; depth: number }>();
    if (!this.nodes.has(startId)) return { visited, edges: [] };

    const edges: GraphEdge[] = [];
    const queue = [{ id: startId, depth: 0 }];
    visited.set(startId, { node: this.nodes.get(startId)!, depth: 0 });

    let head = 0;
    while (head < queue.length) {
      const { id, depth } = queue[head++];

      if (depth >= maxDepth) continue;

      const neighbors = this.adjacency.get(id) || [];
      for (const edge of neighbors) {
        edges.push({
          source: id,
          target: edge.targetId,
          type: edge.edgeType,
        });

        if (!visited.has(edge.targetId)) {
          visited.set(edge.targetId, {
            node: this.nodes.get(edge.targetId)!,
            depth: depth + 1,
          });
          queue.push({ id: edge.targetId, depth: depth + 1 });
        }
      }
    }

    return { visited, edges };
  }

  // ─── DFS (Depth-First Search) ────────────────────────────

  /**
   * DFS from a starting node. Returns the full connected component.
   * Returns { visited: Map<id, {node, discoveryOrder}>, edges: [{source, target, type}] }
   */
  dfs(startId: string): { visited: Map<string, { node: GraphNode; discoveryOrder: number }>; edges: GraphEdge[] } {
    const visited = new Map<string, { node: GraphNode; discoveryOrder: number }>();
    if (!this.nodes.has(startId)) return { visited, edges: [] };

    const edges: GraphEdge[] = [];
    let order = 0;

    const stack: { id: string; parentId: string | null; edgeType: AdjacencyEdge['edgeType'] | null }[] = [
      { id: startId, parentId: null, edgeType: null }
    ];

    while (stack.length > 0) {
      const { id, parentId, edgeType } = stack.pop()!;

      if (visited.has(id)) continue;

      visited.set(id, {
        node: this.nodes.get(id)!,
        discoveryOrder: order++,
      });

      if (parentId !== null && edgeType !== null) {
        edges.push({ source: parentId, target: id, type: edgeType });
      }

      const neighbors = this.adjacency.get(id) || [];
      // Push in reverse so we visit in the expected order
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const edge = neighbors[i];
        if (!visited.has(edge.targetId)) {
          stack.push({ id: edge.targetId, parentId: id, edgeType: edge.edgeType });
        }
      }
    }

    return { visited, edges };
  }

  // ─── Relationship Queries ────────────────────────────────

  /** Find all products related to a given product (frequently bought together, via BFS neighbors) */
  getRelatedProducts(productId: string, maxDepth: number = 2): (GraphNode & { depth: number; weight: number })[] {
    const { visited } = this.bfs(productId, maxDepth);
    const related: (GraphNode & { depth: number; weight: number })[] = [];

    // Find direct co-occurrence edges to get their weights
    const directNeighbors = this.adjacency.get(productId) || [];

    for (const [id, info] of visited) {
      if (id !== productId && info.node && info.node.type === 'product') {
        const directEdge = directNeighbors.find(e => e.targetId === id && e.edgeType === 'BOUGHT_WITH');
        const weight = directEdge ? (directEdge.metadata.weight || 1) : 1;
        related.push({ ...info.node, depth: info.depth, weight });
      }
    }

    // Sort by co-occurrence weight (higher frequency first)
    return related.sort((a, b) => b.weight - a.weight);
  }

  /** Get all products belonging to a category */
  getProductsByCategory(categoryId: string): GraphNode[] {
    const neighbors = this.getNeighbors(categoryId);
    return neighbors
      .filter(n => n.edgeType === 'BELONGS_TO' && n.node && n.node.type === 'product')
      .map(n => n.node!);
  }

  // ─── Subgraph Extraction ─────────────────────────────────

  /** Extract a subgraph around a node (for visualization) */
  getSubgraph(nodeId: string, maxDepth: number = 2): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const { visited, edges } = this.bfs(nodeId, maxDepth);

    const nodes: GraphNode[] = [];
    for (const [, info] of visited) {
      nodes.push(info.node);
    }

    // Deduplicate edges (since bidirectional)
    const seen = new Set<string>();
    const uniqueEdges: GraphEdge[] = [];
    for (const edge of edges) {
      const key = [edge.source, edge.target].sort().join('|') + '|' + edge.type;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEdges.push(edge);
      }
    }

    return { nodes, edges: uniqueEdges };
  }

  // ─── Full Graph Data ────────────────────────────────────

  /** Get all nodes and edges for full visualization */
  getVisualizationData(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodes = Array.from(this.nodes.values());

    const seen = new Set<string>();
    const edges: GraphEdge[] = [];
    for (const [sourceId, edgeList] of this.adjacency) {
      for (const edge of edgeList) {
        const key = [sourceId, edge.targetId].sort().join('|') + '|' + edge.edgeType;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({
            source: sourceId,
            target: edge.targetId,
            type: edge.edgeType,
          });
        }
      }
    }

    return { nodes, edges };
  }

  /** Get graph statistics */
  getStats() {
    let edgeCount = 0;
    for (const [, edges] of this.adjacency) {
      edgeCount += edges.length;
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount: edgeCount / 2, // bidirectional, so divide by 2
      nodeTypes: this._countByType(),
    };
  }

  private _countByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [, node] of this.nodes) {
      counts[node.type] = (counts[node.type] || 0) + 1;
    }
    return counts;
  }

  /** Clear the graph */
  clear(): void {
    this.nodes.clear();
    this.adjacency.clear();
  }
}

export default Graph;
