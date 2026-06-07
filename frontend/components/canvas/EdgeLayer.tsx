'use client';
import { Layer, Arrow, Line } from 'react-konva';
import { NodeLayout, nodeDimensions } from '@/lib/canvas/layout';
import { ThemeTokens } from '@/lib/theme';

interface Props {
  nodes: NodeLayout[];
  theme: ThemeTokens;
}

export function EdgeLayer({ nodes, theme }: Props) {
  // Group nodes by lane, sort by chronoOrder, draw edges between consecutive
  const byLane = new Map<number, NodeLayout[]>();
  nodes.forEach(n => {
    const lane = 0; // Phase 1: all lane 0
    const arr = byLane.get(lane) ?? [];
    arr.push(n);
    byLane.set(lane, arr);
  });

  const edgeColor = theme['card.border'];
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  byLane.forEach(laneNodes => {
    const sorted = [...laneNodes].sort((a, b) => a.chronoOrder - b.chronoOrder);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const { w: aw, h: ah } = nodeDimensions(a.mediaType);
      const { h: bh } = nodeDimensions(b.mediaType);
      edges.push({
        x1: a.x + aw,
        y1: a.y + ah / 2,
        x2: b.x,
        y2: b.y + bh / 2,
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
