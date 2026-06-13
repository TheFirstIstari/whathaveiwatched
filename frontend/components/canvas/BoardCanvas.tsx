'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Circle, Image as KonvaImage, Rect, Text, Group } from 'react-konva';
import Konva from 'konva';
import { useCanvasCamera } from '@/lib/hooks/useCanvasCamera';
import { computeLayout, getZoomLevel, type NodeLayout, type ZoomLevel } from '@/lib/canvas/layout';
import { NodeCard } from './NodeCard';
import { EdgeLayer } from './EdgeLayer';
import { Tooltip } from './Tooltip';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { DrillDownDrawer } from './DrillDownDrawer';
import { ThemeTokens } from '@/lib/theme';
import { Button } from '@/components/ui/Button';

export type FitViewFn = () => void;

export interface BoardMediaItem {
  id: bigint;
  mediaType: string;
  title: string;
  subtitle?: string;
  posterUrl: string;
  chronoOrder: number;
  parentId: bigint;
  laneIndex: number;
  airDate: string;
}

export interface BoardParticipant {
  id: bigint;
  identityHex: string;
  displayName: string;
}

export interface WatchEntryData {
  mediaItemId: bigint;
  watcherIdentity: string;
  watched: boolean;
}

export interface WatchAggData {
  mediaItemId: bigint;
  watcherIdentity: string;
  watchedCount: number;
  totalCount: number;
}

interface Props {
  boardId: bigint;
  items: BoardMediaItem[];
  participants: BoardParticipant[];
  watchEntries: WatchEntryData[];
  watchAggs: WatchAggData[];
  myIdentityHex: string | null;
  isOwner: boolean;
  isOwnerOrParticipant: boolean;
  theme: ThemeTokens;
  onSetWatch: (mediaItemId: bigint, watched: boolean) => void;
  onSetWatchBulk: (ids: bigint[], watched: boolean) => void;
  onRemoveItem?: (mediaItemId: bigint) => void;
  onUpdateChrono?: (mediaItemId: bigint, newChronoOrder: number) => void;
  onScaleChange?: (scale: number) => void;
  fitViewRef?: React.MutableRefObject<FitViewFn | null>;
  externalStageRef?: React.MutableRefObject<Konva.Stage | null>;
}

// Minimap component
function Minimap({
  nodes,
  theme,
  scale,
  x,
  y,
  windowSize,
  onNavigate,
}: {
  nodes: NodeLayout[];
  theme: ThemeTokens;
  scale: number;
  x: number;
  y: number;
  windowSize: { width: number; height: number };
  onNavigate: (nx: number, ny: number) => void;
}) {
  const mapW = 160;
  const mapH = 100;
  const pad = 8;

  const { dots, viewportRect } = useMemo(() => {
    if (!nodes.length) return { dots: [], viewportRect: null };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + n.width > maxX) maxX = n.x + n.width;
      if (n.y + n.height > maxY) maxY = n.y + n.height;
    }

    const contentW = maxX - minX || 1;
    const contentH = maxY - minY || 1;
    const scaleX = (mapW - pad * 2) / contentW;
    const scaleY = (mapH - pad * 2) / contentH;
    const s = Math.min(scaleX, scaleY);

    const dots = nodes.map(n => ({
      x: pad + (n.x - minX) * s,
      y: pad + (n.y - minY) * s,
      w: Math.max(2, n.width * s),
      h: Math.max(2, n.height * s),
    }));

    // Viewport rectangle in minimap coordinates
    const vpX = pad + (-x / scale - minX) * s;
    const vpY = pad + (-y / scale - minY) * s;
    const vpW = (windowSize.width / scale) * s;
    const vpH = (windowSize.height / scale) * s;

    return { dots, viewportRect: { x: vpX, y: vpY, w: vpW, h: vpH } };
  }, [nodes, scale, x, y, windowSize]);

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage || !nodes.length) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Convert minimap click to world coordinates
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + n.width > maxX) maxX = n.x + n.width;
      if (n.y + n.height > maxY) maxY = n.y + n.height;
    }
    const contentW = maxX - minX || 1;
    const contentH = maxY - minY || 1;
    const s = Math.min((mapW - pad * 2) / contentW, (mapH - pad * 2) / contentH);

    const worldX = (pos.x - pad) / s + minX;
    const worldY = (pos.y - pad) / s + minY;

    onNavigate(
      windowSize.width / 2 - worldX * scale,
      windowSize.height / 2 - worldY * scale
    );
  };

  return (
    <Group x={windowSize.width - mapW - 12} y={12}>
      {/* Background */}
      <Rect
        width={mapW}
        height={mapH}
        fill={theme['card.bg']}
        stroke={theme['card.border']}
        strokeWidth={1}
        cornerRadius={6}
        shadowColor={theme['card.shadow']}
        shadowBlur={4}
        shadowOpacity={0.3}
        onClick={handleClick}
        onTap={() => {
          // For touch, navigate to center of minimap content
          if (nodes.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let i = 0; i < nodes.length; i++) {
              const n = nodes[i];
              if (n.x < minX) minX = n.x;
              if (n.y < minY) minY = n.y;
              if (n.x + n.width > maxX) maxX = n.x + n.width;
              if (n.y + n.height > maxY) maxY = n.y + n.height;
            }
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            onNavigate(
              windowSize.width / 2 - centerX * scale,
              windowSize.height / 2 - centerY * scale
            );
          }
        }}
      />
      {/* Dots */}
      {dots.map((d, i) => (
        <Rect
          key={i}
          x={d.x}
          y={d.y}
          width={d.w}
          height={d.h}
          fill={theme['accent']}
          cornerRadius={1}
          listening={false}
        />
      ))}
      {/* Viewport indicator */}
      {viewportRect && (
        <Rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={viewportRect.w}
          height={viewportRect.h}
          fill="transparent"
          stroke={theme['accent']}
          strokeWidth={1.5}
          cornerRadius={2}
          listening={false}
        />
      )}
    </Group>
  );
}

export function BoardCanvas({
  boardId, items, participants, watchEntries, watchAggs,
  myIdentityHex, isOwner, isOwnerOrParticipant, theme,
  onSetWatch, onSetWatchBulk, onRemoveItem, onUpdateChrono, onScaleChange, fitViewRef, externalStageRef,
}: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external ref
  useEffect(() => {
    if (externalStageRef) externalStageRef.current = stageRef.current;
  });

  const { x, y, scale, setCam } = useCanvasCamera();
  const [windowSize, setWindowSize] = useState({ width: 800, height: 600 });
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, title: '', subtitle: '' });
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean; x: number; y: number; nodeId: bigint | null;
  }>({ visible: false, x: 0, y: 0, nodeId: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerNodeId, setDrawerNodeId] = useState<bigint | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMinimap, setShowMinimap] = useState(true);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<bigint>>(new Set());
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  // Drag state
  const [draggingId, setDraggingId] = useState<bigint | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; chronoOrder: number } | null>(null);

  const prevZoomLevelRef = useRef<ZoomLevel>(getZoomLevel(scale));
  const [prevLayouts, setPrevLayouts] = useState<NodeLayout[] | null>(null);
  const [transitionNodes, setTransitionNodes] = useState<{
    id: bigint;
    fromX: number; fromY: number; fromOpacity: number;
    toX: number; toY: number; opacity: number;
  }[] | null>(null);
  const isPanning = useRef(false);
  const panOrigin = useRef({ x: 0, y: 0, cx: 0, cy: 0 });
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

  // Window size tracking
  useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (el) {
        setWindowSize({ width: el.clientWidth, height: el.clientHeight });
      } else {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      }
    };
    update();
    let timer: ReturnType<typeof setTimeout>;
    const debounced = () => { clearTimeout(timer); timer = setTimeout(update, 100); };
    window.addEventListener('resize', debounced);
    const el = containerRef.current;
    let observer: ResizeObserver | undefined;
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(update, 50); });
      observer.observe(el);
    }
    return () => { clearTimeout(timer); window.removeEventListener('resize', debounced); observer?.disconnect(); };
  }, []);

  // Notify parent of scale changes
  useEffect(() => {
    onScaleChange?.(scale);
  }, [scale, onScaleChange]);

  // Build watch index
  const watchIdx = useMemo(() => {
    const idx = new Map<string, 'WATCHED' | 'PARTIAL' | 'UNWATCHED'>();
    for (let i = 0; i < watchEntries.length; i++) {
      const e = watchEntries[i];
      idx.set(`${e.mediaItemId}:${e.watcherIdentity}`, e.watched ? 'WATCHED' : 'UNWATCHED');
    }
    for (let i = 0; i < watchAggs.length; i++) {
      const a = watchAggs[i];
      const s = a.watchedCount === a.totalCount ? 'WATCHED'
              : a.watchedCount > 0 ? 'PARTIAL' : 'UNWATCHED';
      idx.set(`${a.mediaItemId}:${a.watcherIdentity}`, s);
    }
    return idx;
  }, [watchEntries, watchAggs]);

  // Filtered items based on search
  const filteredIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.trim().toLowerCase();
    return new Set(
      items.filter(i => i.title.toLowerCase().includes(q)).map(i => i.id)
    );
  }, [items, searchQuery]);

  // Layout
  const nodeLayouts = useMemo(() =>
    computeLayout(items.map(i => ({
      id: i.id, mediaType: i.mediaType, chronoOrder: i.chronoOrder,
      parentId: i.parentId, laneIndex: i.laneIndex,
    })), scale),
  [items, scale]);

  // Fit to view
  const fitView = useCallback(() => {
    if (!nodeLayouts.length) return;
    const pad = 60;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < nodeLayouts.length; i++) {
      const n = nodeLayouts[i];
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + n.width > maxX) maxX = n.x + n.width;
      if (n.y + n.height > maxY) maxY = n.y + n.height;
    }
    const s = Math.min(
      (windowSize.width  - pad * 2) / (maxX - minX || 1),
      (windowSize.height - pad * 2) / (maxY - minY || 1),
      2.0
    );
    setCam({
      x: windowSize.width  / 2 - ((minX + maxX) / 2) * s,
      y: windowSize.height / 2 - ((minY + maxY) / 2) * s,
      scale: s,
    });
  }, [nodeLayouts, windowSize, setCam]);

  // Expose fitView to parent
  useEffect(() => {
    if (fitViewRef) fitViewRef.current = fitView;
  }, [fitView, fitViewRef]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = scale;
    const newScale = Math.min(2.0, oldScale * 1.25);
    const ptr = stage.getPointerPosition() || { x: windowSize.width / 2, y: windowSize.height / 2 };
    setCam({
      x: ptr.x - (ptr.x - x) * (newScale / oldScale),
      y: ptr.y - (ptr.y - y) * (newScale / oldScale),
      scale: newScale,
    });
  }, [scale, x, y, setCam, windowSize]);

  const handleZoomOut = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = scale;
    const newScale = Math.max(0.1, oldScale / 1.25);
    const ptr = stage.getPointerPosition() || { x: windowSize.width / 2, y: windowSize.height / 2 };
    setCam({
      x: ptr.x - (ptr.x - x) * (newScale / oldScale),
      y: ptr.y - (ptr.y - y) * (newScale / oldScale),
      scale: newScale,
    });
  }, [scale, x, y, setCam, windowSize]);

  const handleZoomReset = useCallback(() => {
    setCam({ x: 0, y: 0, scale: 1.0 });
  }, [setCam]);

  // Navigate from minimap
  const handleMinimapNavigate = useCallback((nx: number, ny: number) => {
    setCam(c => ({ ...c, x: nx, y: ny }));
  }, [setCam]);

  // Detect zoom level changes to animate transitions
  const currentZoomLevel = getZoomLevel(scale);
  useEffect(() => {
    const prev = prevZoomLevelRef.current;
    if (prev !== currentZoomLevel && prevLayouts && nodeLayouts.length > 0) {
      const oldLayoutMap = new Map(prevLayouts.map(l => [String(l.id), l]));
      const transitions: {
        id: bigint;
        fromX: number; fromY: number; fromOpacity: number;
        toX: number; toY: number; opacity: number;
      }[] = [];

      nodeLayouts.forEach(layout => {
        const old = oldLayoutMap.get(String(layout.id));
        if (old) {
          transitions.push({
            id: layout.id,
            fromX: old.x, fromY: old.y, fromOpacity: 1,
            toX: layout.x, toY: layout.y, opacity: 1,
          });
        } else {
          transitions.push({
            id: layout.id,
            fromX: layout.x, fromY: layout.y - 20, fromOpacity: 0,
            toX: layout.x, toY: layout.y, opacity: 1,
          });
        }
      });

      setTransitionNodes(transitions);
      setTimeout(() => setTransitionNodes(null), 300);
    }
    prevZoomLevelRef.current = currentZoomLevel;
    if (nodeLayouts.length > 0) {
      setPrevLayouts(nodeLayouts);
    }
  }, [currentZoomLevel, prevLayouts, nodeLayouts]);

  const getItemWatchState = useCallback((itemId: bigint) => {
    if (!myIdentityHex) return 'UNWATCHED' as const;
    return watchIdx.get(`${itemId}:${myIdentityHex}`) ?? 'UNWATCHED' as const;
  }, [watchIdx, myIdentityHex]);

  const getChips = useCallback((itemId: bigint) =>
    participants.map(p => ({
      identityHex: p.identityHex,
      displayName: p.displayName,
      watched: watchIdx.get(`${itemId}:${p.identityHex}`) === 'WATCHED',
    })),
  [participants, watchIdx]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const selected = selectedIdsRef.current;

      // Escape: clear selection / close drawer
      if (e.key === 'Escape') {
        if (drawerOpen) {
          setDrawerOpen(false);
        } else if (selected.size > 0) {
          setSelectedIds(new Set());
        }
        return;
      }

      // Delete/Backspace: remove selected nodes
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected.size > 0 && isOwner && onRemoveItem) {
        e.preventDefault();
        selected.forEach(id => onRemoveItem(id));
        setSelectedIds(new Set());
        return;
      }

      // Enter/Space: toggle watched or open drawer
      if ((e.key === 'Enter' || e.key === ' ') && selected.size > 0) {
        e.preventDefault();
        const firstId = selected.values().next().value!;
        const item = items.find(i => i.id === firstId);
        if (!item) return;
        if ((item.mediaType === 'EPISODE' || item.mediaType === 'FILM') && isOwnerOrParticipant) {
          const current = getItemWatchState(firstId) === 'WATCHED';
          onSetWatch(firstId, !current);
        } else {
          setDrawerNodeId(firstId);
          setDrawerOpen(true);
        }
        return;
      }

      // Ctrl+A: select all
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const allIds = new Set(nodeLayouts.map(l => l.id));
        setSelectedIds(allIds);
        return;
      }

      // Arrow keys: navigate between nodes
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selected.size > 0) {
        e.preventDefault();
        const currentId = selected.values().next().value!;
        const currentLayout = nodeLayouts.find(l => l.id === currentId);
        if (!currentLayout) return;

        // Find nearest node in the direction
        let best: NodeLayout | null = null;
        let bestDist = Infinity;
        for (let i = 0; i < nodeLayouts.length; i++) {
          const n = nodeLayouts[i];
          if (n.id === currentId) continue;
          const dx = n.x - currentLayout.x;
          const dy = n.y - currentLayout.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let inDirection = false;
          if (e.key === 'ArrowLeft') inDirection = dx < -10;
          if (e.key === 'ArrowRight') inDirection = dx > 10;
          if (e.key === 'ArrowUp') inDirection = dy < -10;
          if (e.key === 'ArrowDown') inDirection = dy > 10;

          if (inDirection && dist < bestDist) {
            best = n;
            bestDist = dist;
          }
        }

        if (best) {
          const newSelected = e.shiftKey ? new Set(selected) : new Set<bigint>();
          newSelected.add(best.id);
          setSelectedIds(newSelected);
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [drawerOpen, isOwner, isOwnerOrParticipant, items, nodeLayouts, onRemoveItem, onSetWatch]);

  // Node click handler with selection
  const handleNodeClick = useCallback((id: bigint, e?: Konva.KonvaEventObject<MouseEvent>) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    // Check if shift key is held for multi-select
    const isMultiSelect = e?.evt?.shiftKey || false;

    if (isMultiSelect) {
      const newSelected = new Set(selectedIdsRef.current);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelectedIds(newSelected);
      return;
    }

    // Single click: select and perform action
    setSelectedIds(new Set([id]));

    if (item.mediaType === 'EPISODE' || item.mediaType === 'FILM') {
      if (!isOwnerOrParticipant) return;
      const current = getItemWatchState(id) === 'WATCHED';
      onSetWatch(id, !current);
    } else {
      setDrawerNodeId(id);
      setDrawerOpen(true);
    }
  }, [items, getItemWatchState, isOwnerOrParticipant, onSetWatch]);

  // Node drag handlers
  const handleNodeDragStart = useCallback((id: bigint, e: Konva.KonvaEventObject<DragEvent>) => {
    const item = items.find(i => i.id === id);
    if (!item || !isOwner) return;
    setDraggingId(id);
    const stage = stageRef.current;
    if (stage) {
      const ptr = stage.getPointerPosition();
      dragStartRef.current = {
        x: ptr?.x ?? 0,
        y: ptr?.y ?? 0,
        chronoOrder: item.chronoOrder,
      };
    }
    // Bring to front
    e.target.moveToTop();
  }, [items, isOwner]);

  const handleNodeDragMove = useCallback((id: bigint, e: Konva.KonvaEventObject<DragEvent>) => {
    if (draggingId !== id) return;
    // The node follows the cursor automatically via Konva drag
  }, [draggingId]);

  const handleNodeDragEnd = useCallback((id: bigint, e: Konva.KonvaEventObject<DragEvent>) => {
    if (draggingId !== id || !dragStartRef.current || !onUpdateChrono) {
      setDraggingId(null);
      dragStartRef.current = null;
      return;
    }

    const stage = stageRef.current;
    if (!stage) {
      setDraggingId(null);
      dragStartRef.current = null;
      return;
    }

    // Calculate new chrono order based on drag distance
    const ptr = stage.getPointerPosition();
    if (ptr && dragStartRef.current) {
      const dx = ptr.x - dragStartRef.current.x;
      // Each 100px drag = 1 chrono unit
      const chronoDelta = dx / 100;
      const newChrono = Math.max(0, dragStartRef.current.chronoOrder + chronoDelta);
      onUpdateChrono(id, Math.round(newChrono * 10) / 10);
    }

    setDraggingId(null);
    dragStartRef.current = null;
  }, [draggingId, onUpdateChrono]);

  // Right-click handler
  const handleNodeRightClick = useCallback((id: bigint, pos: { x: number; y: number }) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    // If right-clicking a node that's not selected, select it
    if (!selectedIdsRef.current.has(id)) {
      setSelectedIds(new Set([id]));
    }
    setContextMenu({ visible: true, x: pos.x - x, y: pos.y - y, nodeId: id });
  }, [items, x, y]);

  // Context menu items
  const buildContextItems = useCallback((): ContextMenuItem[] => {
    if (!contextMenu.nodeId) return [];
    const nodeId = contextMenu.nodeId;
    const selected = selectedIdsRef.current;
    const hasMultiple = selected.size > 1;
    const menuItems: ContextMenuItem[] = [];

    if (isOwnerOrParticipant) {
      if (hasMultiple) {
        menuItems.push(
          { label: `Mark ${selected.size} watched`, action: () => onSetWatchBulk(Array.from(selected), true) },
          { label: `Mark ${selected.size} unwatched`, action: () => onSetWatchBulk(Array.from(selected), false) },
        );
      } else {
        const item = items.find(i => i.id === nodeId);
        const isLeaf = item && (item.mediaType === 'EPISODE' || item.mediaType === 'FILM');
        if (isLeaf) {
          const current = getItemWatchState(nodeId) === 'WATCHED';
          menuItems.push({
            label: current ? 'Mark unwatched' : 'Mark watched',
            action: () => onSetWatch(nodeId, !current),
          });
        }
        menuItems.push({
          label: 'Mark all up to here',
          action: () => {
            const clicked = items.find(i => i.id === nodeId);
            if (!clicked) return;
            const ids = nodeLayouts
              .filter(n => {
                const item = items.find(i => i.id === n.id);
                return item && item.chronoOrder <= clicked.chronoOrder;
              })
              .map(n => n.id);
            onSetWatchBulk(ids, true);
          }
        });
      }
    }

    menuItems.push({
      label: 'Show details',
      action: () => { setDrawerNodeId(nodeId); setDrawerOpen(true); },
      dividerAfter: isOwner && onRemoveItem ? true : false
    });

    if (isOwner && onRemoveItem) {
      if (hasMultiple) {
        menuItems.push({ label: `Remove ${selected.size} items`, action: () => selected.forEach(id => onRemoveItem(id)), danger: true });
      } else {
        menuItems.push({ label: 'Remove from board', action: () => onRemoveItem(nodeId), danger: true });
      }
    }

    return menuItems;
  }, [contextMenu.nodeId, isOwner, isOwnerOrParticipant, items, nodeLayouts, getItemWatchState, onSetWatch, onSetWatchBulk, onRemoveItem]);

  // Wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current!;
    const oldScale = scale;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(0.1, Math.min(2.0, oldScale * Math.pow(1.1, direction)));
    const ptr = stage.getPointerPosition()!;
    setCam({
      x: ptr.x - (ptr.x - x) * (newScale / oldScale),
      y: ptr.y - (ptr.y - y) * (newScale / oldScale),
      scale: newScale,
    });
  }, [scale, x, y, setCam]);

  // Pan handlers
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current) return;
    setContextMenu(c => c.visible ? { ...c, visible: false } : c);
    isPanning.current = true;
    const ptr = stageRef.current!.getPointerPosition()!;
    panOrigin.current = { x: ptr.x, y: ptr.y, cx: x, cy: y };
    stageRef.current!.container().style.cursor = 'grabbing';
  }, [x, y]);

  const handleMouseMove = useCallback((_e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanning.current) return;
    const ptr = stageRef.current!.getPointerPosition()!;
    setCam(c => ({
      ...c,
      x: panOrigin.current.cx + (ptr.x - panOrigin.current.x),
      y: panOrigin.current.cy + (ptr.y - panOrigin.current.y),
    }));
  }, [setCam]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    if (stageRef.current) stageRef.current.container().style.cursor = 'grab';
  }, []);

  // Double-click to fit
  const handleDblClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current) return;
    fitView();
  }, [fitView]);

  // Touch handlers for pinch-to-zoom
  const handleTouchStart = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length === 2) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenter.current = {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length === 2 && lastTouchDist.current !== null) {
      e.evt.preventDefault();
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scaleFactor = dist / lastTouchDist.current;

      const stage = stageRef.current;
      if (stage && lastTouchCenter.current) {
        const oldScale = scale;
        const newScale = Math.max(0.1, Math.min(2.0, oldScale * scaleFactor));
        const ptr = stage.getPointerPosition() || lastTouchCenter.current;
        setCam({
          x: ptr.x - (ptr.x - x) * (newScale / oldScale),
          y: ptr.y - (ptr.y - y) * (newScale / oldScale),
          scale: newScale,
        });
      }

      lastTouchDist.current = dist;
      lastTouchCenter.current = {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    }
  }, [scale, x, y, setCam]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null;
    lastTouchCenter.current = null;
  }, []);

  const getSubtitle = (item: BoardMediaItem) => {
    if (item.subtitle) return item.subtitle;
    if (item.airDate) return item.airDate.slice(0, 4);
    return item.mediaType.toLowerCase();
  };

  void boardId;

  // Dot grid background
  const dotGridImage = useMemo(() => {
    const spacing = 40;
    const dotR = 1.2;
    const left   = -x / scale;
    const top    = -y / scale;
    const right  = left + windowSize.width / scale;
    const bottom = top  + windowSize.height / scale;
    const startX = Math.floor(left / spacing) * spacing;
    const startY = Math.floor(top / spacing) * spacing;

    const canvas = document.createElement('canvas');
    const w = Math.ceil(right - startX + spacing);
    const h = Math.ceil(bottom - startY + spacing);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = theme['canvas.dot'];

    for (let dx = startX; dx <= right; dx += spacing) {
      for (let dy = startY; dy <= bottom; dy += spacing) {
        ctx.beginPath();
        ctx.arc(dx - startX, dy - startY, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return { src: canvas.toDataURL(), originX: startX, originY: startY };
  }, [theme, x, y, scale, windowSize]);

  // Selection change count for context menu
  const selCount = selectedIds.size;

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <Stage
        ref={stageRef}
        width={windowSize.width}
        height={windowSize.height}
        x={x} y={y}
        scaleX={scale} scaleY={scale}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDblClick={handleDblClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: 'grab', background: theme['canvas.bg'] }}
      >
        {/* Background layer */}
        <Layer name="bg-layer" listening={false}>
          <KonvaImage
            image={(() => {
              const img = new window.Image();
              img.src = dotGridImage.src;
              return img;
            })()}
            x={dotGridImage.originX}
            y={dotGridImage.originY}
            listening={false}
          />
        </Layer>

        {/* Edge layer */}
        <EdgeLayer nodes={nodeLayouts} theme={theme} />

        {/* Node layer */}
        <Layer name="node-layer">
          {nodeLayouts.map(layout => {
            const item = items.find(i => i.id === layout.id);
            if (!item) return null;
            const trans = transitionNodes?.find(t => t.id === layout.id);
            const isSelected = selectedIds.has(item.id);
            const isFiltered = filteredIds ? !filteredIds.has(item.id) : false;
            const isDragging = draggingId === item.id;

            return (
              <NodeCard
                key={String(layout.id)}
                id={item.id}
                mediaType={item.mediaType}
                title={item.title}
                subtitle={getSubtitle(item)}
                posterUrl={item.posterUrl || null}
                participants={getChips(item.id)}
                watchState={getItemWatchState(item.id)}
                x={trans ? trans.fromX : layout.x}
                y={trans ? trans.fromY : layout.y}
                opacity={trans ? trans.fromOpacity : (isFiltered ? 0.2 : 1)}
                targetX={trans ? trans.toX : undefined}
                targetY={trans ? trans.toY : undefined}
                targetOpacity={trans ? trans.opacity : undefined}
                theme={theme}
                isOwnerOrParticipant={isOwnerOrParticipant}
                scale={scale}
                isSelected={isSelected}
                isDragging={isDragging}
                draggable={isOwner}
                onClick={handleNodeClick}
                onRightClick={handleNodeRightClick}
                onDragStart={handleNodeDragStart}
                onDragMove={handleNodeDragMove}
                onDragEnd={handleNodeDragEnd}
                onShowTooltip={(ttitle, tsubtitle, pos) =>
                  setTooltip({ visible: true, x: pos.x - x, y: pos.y - y, title: ttitle, subtitle: tsubtitle })
                }
                onHideTooltip={() => setTooltip(t => ({ ...t, visible: false }))}
              />
            );
          })}
        </Layer>

        {/* UI layer — tooltip + context menu */}
        <Layer name="ui-layer">
          <Tooltip {...tooltip} theme={theme} />
          <ContextMenu
            {...contextMenu}
            items={buildContextItems()}
            onDismiss={() => setContextMenu(c => ({ ...c, visible: false }))}
            theme={theme}
          />
        </Layer>

        {/* Minimap */}
        {showMinimap && nodeLayouts.length > 5 && (
          <Layer name="minimap-layer" listening={true}>
            <Minimap
              nodes={nodeLayouts}
              theme={theme}
              scale={scale}
              x={x}
              y={y}
              windowSize={windowSize}
              onNavigate={handleMinimapNavigate}
            />
          </Layer>
        )}

        {/* Selection indicator text */}
        {selCount > 0 && (
          <Layer name="selection-layer" listening={false}>
            <Group x={12} y={windowSize.height - 36}>
              <Rect
                width={200}
                height={28}
                fill={theme['card.bg']}
                stroke={theme['card.border']}
                strokeWidth={1}
                cornerRadius={6}
                shadowColor={theme['card.shadow']}
                shadowBlur={4}
                shadowOpacity={0.2}
                listening={false}
              />
              <Text
                text={`${selCount} selected`}
                x={10}
                y={8}
                fontSize={12}
                fill={theme['menu.text']}
                listening={false}
              />
            </Group>
          </Layer>
        )}
      </Stage>

      {/* Zoom controls overlay */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-20">
        <Button variant="secondary" size="sm" icon onClick={handleZoomIn} title="Zoom in">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
        </Button>
        <Button variant="secondary" size="sm" icon onClick={handleZoomOut} title="Zoom out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg>
        </Button>
        <Button variant="secondary" size="sm" icon onClick={fitView} title="Fit to view">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
        </Button>
        <Button variant="secondary" size="sm" icon onClick={handleZoomReset} title="Reset zoom">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5"/></svg>
        </Button>
        <div className="text-center text-[10px] text-[var(--text-dim)] bg-[var(--card.bg)] rounded px-1.5 py-0.5 border border-[var(--border)]">
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* Search input */}
      <div className="absolute top-2 left-2 z-20">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search nodes..."
          className="w-48 h-8 pl-3 pr-8 text-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--text)] placeholder:text-[var(--text-dim)] outline-none focus:border-[var(--accent)] shadow-[var(--shadow-xs)]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--text)] text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Minimap toggle */}
      <div className="absolute top-2 right-2 z-20">
        <Button
          variant="secondary"
          size="sm"
          icon
          onClick={() => setShowMinimap(m => !m)}
          title={showMinimap ? 'Hide minimap' : 'Show minimap'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1" opacity="0.3"/>
            <rect x="3" y="14" width="7" height="7" rx="1" opacity="0.3"/>
          </svg>
        </Button>
      </div>

      {/* Drill-down drawer */}
      <DrillDownDrawer
        open={drawerOpen}
        nodeId={drawerNodeId}
        onClose={() => setDrawerOpen(false)}
        items={items.map(i => ({
          id: i.id, mediaType: i.mediaType, title: i.title,
          posterUrl: i.posterUrl, parentId: i.parentId,
        }))}
        watchEntries={watchEntries.map(e => ({
          mediaItemId: e.mediaItemId,
          watcherIdentity: e.watcherIdentity,
          watched: e.watched,
        }))}
        myIdentityHex={myIdentityHex}
        isOwnerOrParticipant={isOwnerOrParticipant}
        onSetWatch={onSetWatch}
        onSetWatchBulk={onSetWatchBulk}
      />
    </div>
  );
}
