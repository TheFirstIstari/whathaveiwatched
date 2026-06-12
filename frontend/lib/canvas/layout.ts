export const CHRONO_UNIT_PX = 180;
export const NODE_HEIGHT = 220;
export const NODE_WIDTH = 140;
export const LANE_GAP = 24;
export const NODE_PAD = 12;
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 2.0;
export const MAX_ITEMS_PER_BUCKET = 4; // How many items in the same time bucket before they need a new visual lane
export const BUCKET_WINDOW = 3; // chronoOrder values within this absolute range are grouped together

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

  // 1. Group items into "time buckets" — items with identical chronoOrders share a visual column
  //    Sequential chronoOrders (0, 1, 2) get separate columns as before
  const buckets: LayoutItem[][] = [];
  for (const item of sorted) {
    if (buckets.length === 0) {
      buckets.push([item]);
      continue;
    }
    const lastBucket = buckets[buckets.length - 1];
    const lastItem = lastBucket[lastBucket.length - 1];
    // Group only if they have the exact same chronoOrder or within a tiny epsilon
    if (item.chronoOrder === lastItem.chronoOrder) {
      lastBucket.push(item);
    } else {
      buckets.push([item]);
    }
  }

  // 2. Assign lanes per bucket — items in the same bucket spread across lanes
  const laneEnds: number[] = [0]; // track which item count each lane has
  const result: NodeLayout[] = [];

  buckets.forEach((bucket, bucketIdx) => {
    // Distribute items in this bucket across available lanes
    const bucketItems = [...bucket];
    const freeLanes: number[] = [];

    // First pass: find lanes that are free (their last bucket is at least BUCKET_WINDOW behind)
    for (let l = 0; l < laneEnds.length; l++) {
      if (laneEnds[l] <= bucketIdx) {
        freeLanes.push(l);
      }
    }

    // If we have more items than free lanes, add new lanes
    while (freeLanes.length < bucketItems.length) {
      const newLane = laneEnds.length;
      laneEnds.push(0);
      freeLanes.push(newLane);
    }

    // Assign each item to a lane, round-robin
    bucketItems.forEach((item, idx) => {
      const lane = freeLanes[idx];
      laneEnds[lane] = bucketIdx + 1;

      const { w, h } = nodeDimensions(item.mediaType);
      const bucketX = bucketIdx * CHRONO_UNIT_PX;
      // If multiple items in this bucket, offset them slightly horizontally to avoid overlap
      const laneOffsetX = bucketItems.length > 1 ? (idx * 12) : 0;
      result.push({
        id: item.id,
        x: bucketX + laneOffsetX,
        y: lane * (NODE_HEIGHT + LANE_GAP),
        width: w,
        height: h,
        zoomType: level,
        mediaType: item.mediaType,
        chronoOrder: item.chronoOrder,
        parentId: item.parentId,
      });
    });
  });

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