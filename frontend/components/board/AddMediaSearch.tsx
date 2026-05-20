'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/Spinner';

interface TmdbSearchResult {
  id: number;
  title: string;
  year: string;
  posterPath: string | null;
  media_type: string;
}

interface Props {
  boardId: bigint;
  existingTmdbIds: Set<number>;
  onImport: (tmdbId: number, mediaType: string) => Promise<void>;
}

const TYPE_LABELS = { all: 'All', show: 'TV', movie: 'Film' } as const;

export function AddMediaSearch({ boardId, existingTmdbIds, onImport }: Props) {
  const [query, setQuery]         = useState('');
  const [mediaType, setMediaType] = useState<'all' | 'show' | 'movie'>('all');
  const [results, setResults]     = useState<TmdbSearchResult[]>([]);
  const [loading, setLoading]     = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [open, setOpen]           = useState(false);
  const inputRef                  = useRef<HTMLInputElement>(null);
  void boardId;

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}&type=${mediaType}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
        setActiveIdx(-1);
      } catch {
        setResults([]);
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, mediaType]);

  const handleSelect = async (result: TmdbSearchResult) => {
    if (existingTmdbIds.has(result.id)) return;
    setQuery(''); setResults([]); setOpen(false);
    toast.promise(onImport(result.id, result.media_type === 'tv' ? 'TV_SHOW' : 'MOVIE'), {
      loading: `Importing ${result.title}…`,
      success: `${result.title} added`,
      error: 'Import failed',
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    if (e.key === 'Enter' && activeIdx >= 0) handleSelect(results[activeIdx]);
    if (e.key === 'Escape')    { setOpen(false); inputRef.current?.blur(); }
  };

  return (
    <div className="relative flex items-center gap-1.5">
      {/* Type filter pills — inline with input */}
      <div className="hidden sm:flex gap-1">
        {(['all', 'show', 'movie'] as const).map(t => (
          <button
            key={t}
            onClick={() => setMediaType(t)}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-all
                        ${mediaType === t
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="relative">
        {/* Search icon */}
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Add movie or show…"
          className="w-44 sm:w-52 pl-8 pr-8 py-1.5 rounded-lg text-sm border
                     border-gray-200 dark:border-gray-700
                     bg-gray-50 dark:bg-gray-800
                     text-gray-900 dark:text-gray-100
                     placeholder:text-gray-400 dark:placeholder:text-gray-500
                     outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-all"
        />
        {loading
          ? <Spinner className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          : query.length > 0 && (
            <button
              onClick={() => { setQuery(''); setOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs leading-none"
            >
              ✕
            </button>
          )
        }
      </div>

      {/* Dropdown */}
      {open && (
        <ul className={`absolute right-0 top-full mt-1.5
                        w-[min(20rem,calc(100vw-2rem))]
                        bg-white dark:bg-gray-900
                        rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700
                        overflow-hidden z-50`}>
          {/* Mobile-only type pills inside dropdown */}
          <li className="flex gap-1 px-3 pt-2 pb-1 sm:hidden">
            {(['all', 'show', 'movie'] as const).map(t => (
              <button
                key={t}
                onMouseDown={e => { e.preventDefault(); setMediaType(t); }}
                className={`px-2.5 py-0.5 text-xs rounded-full font-medium transition-all
                            ${mediaType === t
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </li>

          {results.length === 0 ? (
            <li className="px-4 py-4 text-sm text-gray-400 text-center">
              No results for &ldquo;{query}&rdquo;
            </li>
          ) : (
            results.map((r, i) => {
              const already = existingTmdbIds.has(r.id);
              return (
                <li
                  key={r.id}
                  onMouseDown={() => handleSelect(r)}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors select-none
                              ${already ? 'opacity-40 cursor-default' : ''}
                              ${i === activeIdx
                                ? 'bg-blue-50 dark:bg-blue-900/30'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  {/* Poster thumbnail */}
                  {r.posterPath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${r.posterPath}`}
                      className="w-8 h-11 rounded-md object-cover shrink-0 shadow-sm"
                      alt=""
                    />
                  ) : (
                    <div className="w-8 h-11 rounded-md bg-gray-100 dark:bg-gray-700 shrink-0 flex items-center justify-center">
                      <span className="text-gray-300 dark:text-gray-600 text-xs">?</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100 leading-snug">
                      {r.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.year}
                      {r.year && r.media_type && ' · '}
                      <span className="capitalize">{r.media_type === 'tv' ? 'TV' : r.media_type}</span>
                    </p>
                  </div>

                  {already
                    ? <span className="text-xs text-emerald-500 font-medium shrink-0">Added ✓</span>
                    : <span className="text-xs text-gray-300 dark:text-gray-600 shrink-0 font-medium">Add</span>
                  }
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
