export const CHRONO_UNIT_PX = 180;
export const NODE_HEIGHT = 220;
export const NODE_WIDTH = 140;
export const LANE_GAP = 24;
export const NODE_PAD = 12;
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 2.0;

export type ZoomLevel = 'EPISODE' | 'SEASON' | 'SHOW';

export function getZoomLevel(scale: number): ZoomLevel {
  if (scale >= 0.5) return 'EPISODE';
  if (scale >= 0.25) return 'SEASON';
  return 'SHOW';
}

export interface NodeLayout {
  id: bigint;
  x: number;
  y: number;
  width: number;
  height: number;
  zoomType: ZoomLevel;
  mediaType: string;
  chronoOrder: number;
  parentId: bigint;
}

export interface LayoutItem {
  id: bigint;
  mediaType: string;
  chronoOrder: number;
  parentId: bigint;
  laneIndex: number;
}

export function computeLayout(items: LayoutItem[], scale: number): NodeLayout[] {
  const level = getZoomLevel(scale);
  const visible = filterForLevel(items, level);
  const sorted = [...visible].sort((a, b) => {
    if (a.chronoOrder === b.chronoOrder) return 0;
    // f64::MAX items go to end
    if (a.chronoOrder === Number.MAX_VALUE) return 1;
    if (b.chronoOrder === Number.MAX_VALUE) return -1;
    return a.chronoOrder - b.chronoOrder;
  });

  const laneEnds: number[] = [];
  const result: NodeLayout[] = [];

  for (const item of sorted) {
    // Use laneIndex from server if available; otherwise greedy assign
    let lane = item.laneIndex ?? 0;
    if (lane === 0) {
      lane = 0;
      for (let l = 0; l < laneEnds.length; l++) {
        if (laneEnds[l] < item.chronoOrder) { lane = l; break; }
      }
      if (lane >= laneEnds.length) { laneEnds.push(0); lane = laneEnds.length - 1; }
    }
    if (lane >= laneEnds.length) laneEnds.push(0);
    laneEnds[lane] = item.chronoOrder + 1;

    const { w, h } = nodeDimensions(item.mediaType);
    result.push({
      id: item.id,
      x: item.chronoOrder * CHRONO_UNIT_PX,
      y: lane * (NODE_HEIGHT + LANE_GAP),
      width: w,
      height: h,
      zoomType: level,
      mediaType: item.mediaType,
      chronoOrder: item.chronoOrder,
      parentId: item.parentId,
    });
  }
  return result;
}

function filterForLevel(items: LayoutItem[], level: ZoomLevel): LayoutItem[] {
  switch (level) {
    case 'EPISODE': return items.filter(i =>
      i.mediaType === 'EPISODE' || i.mediaType === 'FILM');
    case 'SEASON': return items.filter(i =>
      i.mediaType === 'SEASON' || i.mediaType === 'ARC' || i.mediaType === 'FILM');
    case 'SHOW': return items.filter(i =>
      i.mediaType === 'SHOW' || i.mediaType === 'FILM');
  }
}

export function nodeDimensions(mediaType: string): { w: number; h: number } {
  if (mediaType === 'SHOW' || mediaType === 'FILM') return { w: 180, h: 240 };
  if (mediaType === 'SEASON' || mediaType === 'ARC') return { w: 160, h: 200 };
  return { w: 140, h: 220 };
}