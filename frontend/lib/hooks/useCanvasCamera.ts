'use client';
import { useState } from 'react';

export interface CameraState { x: number; y: number; scale: number; }

export function useCanvasCamera() {
  const [cam, setCam] = useState<CameraState>({ x: 0, y: 0, scale: 1.0 });

  const zoomTo = (scale: number, focal?: { x: number; y: number }) => {
    const s = Math.max(0.1, Math.min(2.0, scale));
    setCam(c => {
      if (!focal) return { ...c, scale: s };
      return {
        x: focal.x - (focal.x - c.x) * (s / c.scale),
        y: focal.y - (focal.y - c.y) * (s / c.scale),
        scale: s,
      };
    });
  };

  const fitToView = (nodes: Array<{ x: number; y: number; width: number; height: number }>) => {
    if (!nodes.length) return;
    const minX = Math.min(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxX = Math.max(...nodes.map(n => n.x + n.width));
    const maxY = Math.max(...nodes.map(n => n.y + n.height));
    const pad = 40;
    const s = Math.min(
      (window.innerWidth  - pad * 2) / (maxX - minX || 1),
      (window.innerHeight - pad * 2) / (maxY - minY || 1),
      2.0
    );
    setCam({
      x: window.innerWidth  / 2 - ((minX + maxX) / 2) * s,
      y: window.innerHeight / 2 - ((minY + maxY) / 2) * s,
      scale: s,
    });
  };

  return { ...cam, setCam, zoomTo, fitToView };
}