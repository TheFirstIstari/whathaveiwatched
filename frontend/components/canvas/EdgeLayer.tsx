'use client';
import { Layer, Arrow, Line } from 'react-konva';
import { NodeLayout, nodeDimensions, NODE_HEIGHT, LANE_GAP } from '@/lib/canvas/layout';
import { ThemeTokens } from '@/lib/theme';

interface Props {
  nodes: NodeLayout[];
  theme: ThemeTokens;
}

export function EdgeLayer({ nodes, theme }: Props) {
  // Group nodes by their vertical lane position, sort by chronoOrder, draw edges between consecutive
  const byLane = new Map<number, NodeLayout[]>();
  nodes.forEach(n => {
    // Use the node's y-position to determine lane grouping
    const laneKey = Math.round(n.y / (NODE_HEIGHT + LANE_GAP));
    const arr = byLane.get(laneKey) ?? [];
    arr.push(n);
    byLane.set(laneKey, arr);
  });

  const edgeColor = theme['card.border'];
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  byLane.forEach(laneNodes => {
    const sorted = [...laneNodes].sort((a, b) => a.chronoOrder - b.chronoOrder);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const { w: aw } = nodeDimensions(a.mediaType);
      edges.push({
        x1: a.x + aw,
        y1: a.y + a.height / 2,
        x2: b.x,
        y2: b.y + b.height / 2,
      });
    }
  });

  return (
    <Layer name="edge-layer" listening={false}>
      {edges.map((e, i) => (
        <Arrow
          key={i}
          points={[e.x1, e.y1, e.x2, e.y2]}
          stroke={edgeColor}
          strokeWidth={1.2}
          opacity={0.35}
          pointerLength={8}
          pointerWidth={6}
          fill={edgeColor}
          listening={false}
        />
      ))}
    </Layer>
  );
}
