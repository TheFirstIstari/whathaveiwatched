'use client';
import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';
import { useCanvasCamera } from '@/lib/hooks/useCanvasCamera';
import { computeLayout, NodeLayout } from '@/lib/canvas/layout';
import { NodeCard } from './NodeCard';
import { EdgeLayer } from './EdgeLayer';
import { Tooltip } from './Tooltip';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { DrillDownDrawer } from './DrillDownDrawer';
import { ThemeTokens } from '@/lib/theme';

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
  onScaleChange?: (scale: number) => void;
  fitViewRef?: React.MutableRefObject<FitViewFn | null>;
}

export function BoardCanvas({
  boardId, items, participants, watchEntries, watchAggs,
  myIdentityHex, isOwner, isOwnerOrParticipant, theme,
  onSetWatch, onSetWatchBulk, onRemoveItem, onScaleChange, fitViewRef,
}: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const { x, y, scale, setCam } = useCanvasCamera();
  const [windowSize, setWindowSize] = useState({ width: 800, height: 600 });
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, title: '', subtitle: '' });
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean; x: number; y: number; nodeId: bigint | null;
  }>({ visible: false, x: 0, y: 0, nodeId: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerNodeId, setDrawerNodeId] = useState<bigint | null>(null);
  const isPanning = useRef(false);
  const panOrigin = useRef({ x: 0, y: 0, cx: 0, cy: 0 });

  useEffect(() => {
    const update = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Notify parent of scale changes
  useEffect(() => {
    onScaleChange?.(scale);
  }, [scale, onScaleChange]);

  // Build watch index
  const watchIdx = useMemo(() => {
    const idx = new Map<string, 'WATCHED' | 'PARTIAL' | 'UNWATCHED'>();
    watchEntries.forEach(e => {
      idx.set(`${e.mediaItemId}:${e.watcherIdentity}`, e.watched ? 'WATCHED' : 'UNWATCHED');
    });
    watchAggs.forEach(a => {
      const s = a.watchedCount === a.totalCount ? 'WATCHED'
              : a.watchedCount > 0 ? 'PARTIAL' : 'UNWATCHED';
      idx.set(`${a.mediaItemId}:${a.watcherIdentity}`, s);
    });
    return idx;
  }, [watchEntries, watchAggs]);

  // Layout
  const nodeLayouts = useMemo(() =>
    computeLayout(items.map(i => ({
      id: i.id, mediaType: i.mediaType, chronoOrder: i.chronoOrder,
      parentId: i.parentId, laneIndex: i.laneIndex,
    })), scale),
  [items, scale]);

  // Fit to view function
  const fitView = useCallback(() => {
    if (!nodeLayouts.length) return;
    const pad = 60;
    const minX = Math.min(...nodeLayouts.map(n => n.x));
    const minY = Math.min(...nodeLayouts.map(n => n.y));
    const maxX = Math.max(...nodeLayouts.map(n => n.x + n.width));
    const maxY = Math.max(...nodeLayouts.map(n => n.y + n.height));
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

  // Pan
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

  const handleNodeClick = useCallback((id: bigint) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    if (item.mediaType === 'EPISODE' || item.mediaType === 'FILM') {
      if (!isOwnerOrParticipant) return;
      const current = getItemWatchState(id) === 'WATCHED';
      onSetWatch(id, !current);
    } else {
      setDrawerNodeId(id);
      setDrawerOpen(true);
    }
  }, [items, getItemWatchState, isOwnerOrParticipant, onSetWatch]);

  const handleNodeRightClick = useCallback((id: bigint, pos: { x: number; y: number }) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    setContextMenu({ visible: true, x: pos.x - x, y: pos.y - y, nodeId: id });
  }, [items, x, y]);

  const buildContextItems = useCallback((): ContextMenuItem[] => {
    if (!contextMenu.nodeId) return [];
    const nodeId = contextMenu.nodeId;
    const menuItems: ContextMenuItem[] = [];

    if (isOwnerOrParticipant) {
      menuItems.push(
        { label: 'Mark watched',    action: () => onSetWatch(nodeId, true) },
        { label: 'Mark unwatched',  action: () => onSetWatch(nodeId, false) },
        {
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
        },
      );
    }

    menuItems.push({ label: 'Show details', action: () => { setDrawerNodeId(nodeId); setDrawerOpen(true); } });

    if (isOwner && onRemoveItem) {
      menuItems.push({ label: 'Remove from board', action: () => onRemoveItem(nodeId) });
    }

    return menuItems;
  }, [contextMenu.nodeId, isOwner, isOwnerOrParticipant, items, nodeLayouts, onSetWatch, onSetWatchBulk, onRemoveItem]);

  const getSubtitle = (item: BoardMediaItem) => {
    if (item.subtitle) return item.subtitle;
    if (item.airDate) return item.airDate.slice(0, 4);
    return item.mediaType.toLowerCase();
  };

  // Suppress unused variable warning for boardId (reserved for future use)
  void boardId;

  return (
    <>
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
        style={{ cursor: 'grab', background: theme['card.bg'] }}
      >
        {/* Background layer */}
        <Layer name="bg-layer" />

        {/* Edge layer */}
        <EdgeLayer nodes={nodeLayouts} />

        {/* Node layer */}
        <Layer name="node-layer">
          {nodeLayouts.map(layout => {
            const item = items.find(i => i.id === layout.id);
            if (!item) return null;
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
                x={layout.x}
                y={layout.y}
                theme={theme}
                isOwnerOrParticipant={isOwnerOrParticipant}
                scale={scale}
                onClick={handleNodeClick}
                onRightClick={handleNodeRightClick}
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
          <Tooltip {...tooltip} />
          <ContextMenu
            {...contextMenu}
            items={buildContextItems()}
            onDismiss={() => setContextMenu(c => ({ ...c, visible: false }))}
          />
        </Layer>
      </Stage>

      {/* Drill-down drawer (DOM, not Konva) */}
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
    </>
  );
}
