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
}

export function DrillDownDrawer({
  open, nodeId, onClose, items, watchEntries, myIdentityHex, isOwnerOrParticipant, onSetWatch
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

  return (
    <div className={`fixed right-0 top-0 h-screen w-96 bg-white dark:bg-gray-900 shadow-xl
                     transition-transform duration-300 z-50 overflow-y-auto
                     ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      <header className="sticky top-0 bg-white dark:bg-gray-900 border-b p-4 flex items-center justify-between">
        <h2 className="font-bold text-gray-900 dark:text-white truncate pr-2">{node?.title ?? 'Details'}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">✕</button>
      </header>
      {node?.posterUrl && (
        <img src={node.posterUrl} className="w-full" alt={node.title} />
      )}
      <div className="p-4 space-y-4">
        {groups.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No episodes found</p>
        )}
        {groups.map(({ header, episodes }, gi) => (
          <div key={gi}>
            {header && (
              <div className="flex items-center justify-between py-1 border-b mb-2">
                <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  {header.title}
                </span>
                {isOwnerOrParticipant && (
                  <button
                    className="text-xs text-blue-500 hover:text-blue-600"
                    onClick={() => onSetWatch(header.id, true)}
                  >
                    Mark all watched
                  </button>
                )}
              </div>
            )}
            {episodes.map(ep => (
              <label
                key={String(ep.id)}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={watchIdx.get(String(ep.id)) ?? false}
                  onChange={e => isOwnerOrParticipant && onSetWatch(ep.id, e.target.checked)}
                  disabled={!isOwnerOrParticipant}
                  className="rounded"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">{ep.title}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
