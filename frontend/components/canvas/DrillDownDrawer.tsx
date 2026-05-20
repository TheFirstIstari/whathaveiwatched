'use client';
import { useMemo } from 'react';

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
    <div className={`fixed right-0 top-0 h-screen w-96 bg-white dark:bg-gray-900 shadow-2xl
                     transition-transform duration-300 z-50 overflow-y-auto flex flex-col
                     border-l border-gray-200 dark:border-gray-800
                     ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Header */}
      <header className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between z-10">
        <div className="min-w-0">
          <h2 className="font-bold text-gray-900 dark:text-white truncate text-sm">{node?.title ?? 'Details'}</h2>
          {allLeafIds.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {watchedCount} / {allLeafIds.length} watched
            </p>
          )}
        </div>
        <button onClick={onClose} className="ml-2 shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 transition-colors text-sm">
          ✕
        </button>
      </header>

      {/* Poster */}
      {node?.posterUrl && (
        <img src={node.posterUrl} className="w-full object-cover max-h-48" alt={node.title} />
      )}

      {/* Bulk actions */}
      {isOwnerOrParticipant && allLeafIds.length > 0 && (
        <div className="flex gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <button
            className="flex-1 text-xs py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-medium transition-colors"
            onClick={() => onSetWatchBulk(allLeafIds, true)}
          >
            Mark all watched
          </button>
          <button
            className="flex-1 text-xs py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
            onClick={() => onSetWatchBulk(allLeafIds, false)}
          >
            Mark all unwatched
          </button>
        </div>
      )}

      {/* Episode list */}
      <div className="flex-1 p-4 space-y-4">
        {groups.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No episodes found</p>
        )}
        {groups.map(({ header, episodes }, gi) => (
          <div key={gi}>
            {header && (
              <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {header.title}
                </span>
                {isOwnerOrParticipant && episodes.length > 0 && (
                  <button
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                    onClick={() => onSetWatchBulk(episodes.map(e => e.id), true)}
                  >
                    All watched
                  </button>
                )}
              </div>
            )}
            <div className="space-y-0.5">
              {episodes.map(ep => {
                const watched = watchIdx.get(String(ep.id)) ?? false;
                return (
                  <label
                    key={String(ep.id)}
                    className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors
                                ${watched
                                  ? 'bg-emerald-50 dark:bg-emerald-900/10'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    <input
                      type="checkbox"
                      checked={watched}
                      onChange={e => isOwnerOrParticipant && onSetWatch(ep.id, e.target.checked)}
                      disabled={!isOwnerOrParticipant}
                      className="rounded accent-emerald-500"
                    />
                    <span className={`text-sm flex-1 ${watched ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                      {ep.title}
                    </span>
                    {watched && <span className="text-emerald-500 text-xs shrink-0">✓</span>}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
