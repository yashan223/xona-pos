import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import GraphCanvas from '@/components/GraphCanvas';
import { graphApi } from '@/lib/api';
import type { GraphNode, GraphEdge } from '@/lib/api';
import { useTranslation } from '@/lib/translations';

export default function GraphPage() {
  const { t } = useTranslation();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [stats, setStats] = useState<{ nodeCount: number; edgeCount: number; nodeTypes: Record<string, number> } | null>(null);

  useEffect(() => {
    loadGraph();
  }, []);

  async function loadGraph() {
    setLoading(true);
    try {
      const data = await graphApi.getVisualization();
      setNodes(data.nodes);
      setEdges(data.edges);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error('Failed to load graph:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleNodeClick(node: GraphNode) {
    setSelectedNode(node);

    // Load subgraph around clicked node
    try {
      const subgraph = await graphApi.getSubgraph(node.id, 2);
      setNodes(subgraph.nodes);
      setEdges(subgraph.edges);
    } catch (err) {
      console.error('Failed to load subgraph:', err);
    }
  }

  async function resetView() {
    setSelectedNode(null);
    await loadGraph();
  }

  return (
    <div className="p-6 h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('recommendationNet')}</h1>
          <p className="text-sm text-muted-foreground mt-1 text-primary/80">
            {t('graphSubtitle')}
            {stats && ` · ${stats.nodeCount} items, ${stats.edgeCount} connections`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedNode && (
            <button
              onClick={resetView}
              className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors cursor-pointer"
            >
              Show Full Graph
            </button>
          )}
          <button
            onClick={resetView}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected node info */}
      {selectedNode && (
        <div className="glass-card p-3 mb-4 flex items-center gap-3 flex-shrink-0 animate-fade-in">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor:
                selectedNode.type === 'product' ? '#8b5cf6' : '#10b981',
            }}
          />
          <span className="text-sm font-semibold text-foreground">{selectedNode.label}</span>
          <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full capitalize">{selectedNode.type}</span>
          <span className="text-xs text-muted-foreground ml-auto font-medium">
            Showing related connections
          </span>
        </div>
      )}

      {/* Graph Canvas */}
      <div className="flex-1 min-h-0 rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
          />
        )}
      </div>
    </div>
  );
}
