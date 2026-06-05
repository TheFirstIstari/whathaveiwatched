'use client';
import { useMemo } from 'react';
import { Button } from '@/components/ui/Button';

interface MediaItemLike {
  id: bigint;
  mediaType: string;
  title: string;
  posterUrl: string;
  parentId: bigint;
}

interface WatchEntry {
  mediaItemId: bigint;
  watcherIdentity: string;
  watched: boolean;
}

interface Props {
  open: boolean;
  nodeId: bigint | null;
  onClose: () => void;
  items: MediaItemLike[];
  watchEntries: WatchEntry[];
  myIdentityHex: string | null;
  isOwnerOrParticipant: boolean;
  onSetWatch: (mediaItemId: bigint, watched: boolean) => void;
  onSetWatchBulk: (ids: bigint[], watched: boolean) => void;
}

export function DrillDownDrawer({
  open, nodeId, onClose, items, watchEntries, myIdentityHex, isOwnerOrParticipant, onSetWatch, onSetWatchBulk
}: Props) {
  const node = items.find(i => i.id === nodeId);

  const tree = useMemo(() => {
    const map = new Map<bigint, MediaItemLike[]>();
    items.forEach(item => {
      const siblings = map.get(item.parentId) ?? [];
      siblings.push(item);
      map.set(item.parentId, siblings);
    });
    return map;
  }, [items]);

  const watchIdx = useMemo(() => {
    const idx = new Map<string, boolean>();
    watchEntries.forEach(e => {
      if (e.watcherIdentity === myIdentityHex) {
        idx.set(String(e.mediaItemId), e.watched);
      }
    });
    return idx;
  }, [watchEntries, myIdentityHex]);

  const groups = useMemo(() => {
    if (!nodeId) return [];
    const directChildren = tree.get(nodeId) ?? [];
    if (directChildren.every(c => c.mediaType === 'EPISODE' || c.mediaType === 'FILM')) {
      return [{ header: undefined as MediaItemLike | undefined, episodes: directChildren }];
    }
    return directChildren.map(group => ({
      header: group,
      episodes: tree.get(group.id) ?? [],
    }));
  }, [tree, nodeId]);

  // All leaf episode/film ids under this node
  const allLeafIds = useMemo(() => {
    const ids: bigint[] = [];
    groups.forEach(({ episodes }) => ids.push(...episodes.map(e => e.id)));
    return ids;
  }, [groups]);

  const watchedCount = allLeafIds.filter(id => watchIdx.get(String(id))).length;

  return (
    <div className={`fixed right-0 top-0 h-screen w-[22rem] bg-[var(--surface)]
                     shadow-[-12px_0_32px_-12px_rgba(0,0,0,0.18)] dark:shadow-[-12px_0_40px_-8px_rgba(0,0,0,0.6)]
                     transition-transform duration-300 ease-out z-50 overflow-y-auto flex flex-col
                     border-l border-[var(--border)]
                     ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Header */}
      <header className="sticky top-0 bg-[var(--surface)]/95 backdrop-blur-sm border-b border-[var(--border)] px-4 h-12 flex items-center justify-between z-10">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--text)] truncate leading-tight">{node?.title ?? 'Details'}</h2>
          {allLeafIds.length > 0 && (
            <p className="text-[11px] text-[var(--text-dim)] mt-0.5 tabular-nums">
              <span className="text-[var(--text-soft)] font-medium">{watchedCount}</span>
              <span className="opacity-60"> / {allLeafIds.length} watched</span>
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" icon onClick={onClose} title="Close">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </Button>
      </header>

      {/* Poster */}
      {node?.posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={node.posterUrl} className="w-full object-cover max-h-44" alt={node.title} />
      )}

      {/* Progress bar */}
      {allLeafIds.length > 0 && (
        <div className="px-4 pt-3">
          <div className="h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div className="h-full bg-[var(--success)] transition-all"
                 style={{ width: `${(watchedCount / allLeafIds.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Bulk actions */}
      {isOwnerOrParticipant && allLeafIds.length > 0 && (
        <div className="flex gap-2 px-4 py-3 border-b border-[var(--border)]">
          <Button size="sm" className="flex-1" onClick={() => onSetWatchBulk(allLeafIds, true)}>
            ✓ Mark all watched
          </Button>
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => onSetWatchBulk(allLeafIds, false)}>
            Reset
          </Button>
        </div>
      )}

      {/* Episode list */}
      <div className="flex-1 p-3 space-y-4">
        {groups.length === 0 && (
          <p className="text-sm text-[var(--text-dim)] text-center py-8">No episodes found</p>
        )}
        {groups.map(({ header, episodes }, gi) => {
          const groupWatched = episodes.filter(e => watchIdx.get(String(e.id))).length;
          const allWatched = groupWatched === episodes.length && episodes.length > 0;
          return (
            <div key={gi}>
              {header && (
                <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)] truncate">
                      {header.title}
                    </span>
                    {episodes.length > 0 && (
                      <span className="text-[10px] tabular-nums text-[var(--text-dim)] shrink-0">
                        {groupWatched}/{episodes.length}
                      </span>
                    )}
                  </div>
                  {isOwnerOrParticipant && episodes.length > 0 && (
                    <button
                      className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] hover:text-[var(--accent)] font-medium transition-colors rounded-[var(--radius-sm)] px-1.5 py-0.5 hover:bg-[var(--surface-2)]"
                      onClick={() => onSetWatchBulk(episodes.map(e => e.id), !allWatched)}
                    >
                      {allWatched ? 'Reset' : 'All'}
                    </button>
                  )}
                </div>
              )}
              <div className="space-y-px">
                {episodes.map(ep => {
                  const watched = watchIdx.get(String(ep.id)) ?? false;
                  return (
                    <label
                      key={String(ep.id)}
                      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors
                                  ${watched
                                    ? 'text-[var(--text-dim)]'
                                    : 'hover:bg-[var(--surface-2)]'}`}
                    >
                      <input
                        type="checkbox"
                        checked={watched}
                        onChange={e => isOwnerOrParticipant && onSetWatch(ep.id, e.target.checked)}
                        disabled={!isOwnerOrParticipant}
                        className="rounded accent-[var(--success)] w-3.5 h-3.5"
                      />
                      <span className={`text-sm flex-1 truncate ${watched ? 'line-through opacity-60' : 'text-[var(--text)]'}`}>
                        {ep.title}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
