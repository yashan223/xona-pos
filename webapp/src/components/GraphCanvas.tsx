import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import type { GraphNode, GraphEdge } from '@/lib/api';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
}

const NODE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  product: { fill: '#8b5cf6', stroke: '#a78bfa', text: '#f5f3ff' },   // violet
  category: { fill: '#10b981', stroke: '#34d399', text: '#ecfdf5' },  // emerald
};

const EDGE_COLORS: Record<string, string> = {
  BOUGHT_WITH: '#8b5cf6',
  BELONGS_TO: '#10b981',
};

export default function GraphCanvas({ nodes, edges, onNodeClick }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Initialize ECharts instance
    const chart = echarts.init(containerRef.current);
    chartInstanceRef.current = chart;

    // Map nodes to ECharts format
    const chartNodes = nodes.map(node => {
      const colors = NODE_COLORS[node.type] || NODE_COLORS.product;
      const cleanLabel = node.label.length > 18 ? node.label.substring(0, 16) + '…' : node.label;
      return {
        id: node.id,
        name: cleanLabel,
        originalNode: node,
        value: node.type,
        symbolSize: node.type === 'category' ? 32 : 24,
        itemStyle: {
          color: colors.fill,
          borderColor: colors.stroke,
          borderWidth: 2,
          shadowBlur: 10,
          shadowColor: colors.fill + '60',
        },
        label: {
          show: true,
          position: 'bottom' as const,
          distance: 8,
          color: '#f8fafc',
          fontSize: 10,
          fontWeight: '600' as const,
          fontFamily: 'Inter, system-ui, sans-serif',
          textBorderColor: '#0f172a',
          textBorderWidth: 3,
        },
      };
    });

    // Map edges to ECharts format
    const chartLinks = edges.map(edge => {
      const color = EDGE_COLORS[edge.type] || '#4b5563';
      return {
        source: edge.source,
        target: edge.target,
        value: edge.type,
        lineStyle: {
          color,
          width: edge.type === 'BOUGHT_WITH' ? 2.5 : 1.5,
          opacity: 0.65,
          curveness: 0.08,
        },
      };
    });

    // Configure options
    const option: any = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(30, 41, 59, 0.9)', // Slate-800 glass style
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        textStyle: {
          color: '#f8fafc',
          fontSize: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const node = params.data.originalNode as GraphNode;
            return `
              <div style="padding: 4px 6px;">
                <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #94a3b8;">${node.type}</span>
                <div style="margin-top: 4px; font-weight: 500; color: #ffffff;">${node.label}</div>
              </div>
            `;
          } else if (params.dataType === 'edge') {
            const source = nodes.find(n => n.id === params.data.source);
            const target = nodes.find(n => n.id === params.data.target);
            return `
              <div style="padding: 4px 6px;">
                <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #94a3b8;">Relation: ${params.data.value}</span>
                <div style="margin-top: 4px; font-weight: 500; color: #ffffff;">
                  ${source ? source.label : 'Item'} &harr; ${target ? target.label : 'Item'}
                </div>
              </div>
            `;
          }
          return '';
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          data: chartNodes,
          links: chartLinks,
          roam: true, // enables dragging and zooming
          draggable: true,
          label: {
            show: true,
            position: 'bottom',
            distance: 8,
            color: '#f8fafc',
            fontSize: 10,
            fontFamily: 'Inter, system-ui, sans-serif',
            textBorderColor: '#0f172a',
            textBorderWidth: 3,
          },
          force: {
            repulsion: 220,
            edgeLength: 120,
            gravity: 0.08,
            friction: 0.6,
          },
          emphasis: {
            focus: 'adjacency', // highlight connected edges & nodes on hover
            label: {
              show: true,
              fontSize: 11,
              fontWeight: '700' as const,
              color: '#ffffff',
            },
            lineStyle: {
              width: 3.5,
              opacity: 0.95,
            },
          },
        },
      ],
    };

    chart.setOption(option);

    // Click handler
    chart.on('click', (params: any) => {
      if (params.dataType === 'node') {
        const clickedNode = params.data.originalNode as GraphNode;
        if (clickedNode && onNodeClick) {
          onNodeClick(clickedNode);
        }
      }
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [nodes, edges, onNodeClick]);

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-sidebar/20 border border-border/40 rounded-xl p-6 min-h-[450px]">
        <p className="text-sm font-medium">No recommendation net data available</p>
        <p className="text-xs mt-1 text-muted-foreground/80">Process checkouts in the Register to build purchase relationships</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative border border-border/40 rounded-xl overflow-hidden bg-sidebar/20 min-h-[450px]">
      {/* Target element for ECharts graph */}
      <div ref={containerRef} className="w-full h-full absolute inset-0" />

      {/* Legend Overlay */}
      <div className="absolute bottom-3 left-3 glass-card p-2.5 flex items-center gap-4 text-xs z-10 shadow-lg pointer-events-none select-none">
        {Object.entries(NODE_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: colors.fill }} />
            <span className="text-muted-foreground/90 font-medium capitalize text-[10px]">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
