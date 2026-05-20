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

export function AddMediaSearch({ boardId, existingTmdbIds, onImport }: Props) {
  const [query, setQuery]         = useState('');
  const [mediaType, setMediaType] = useState<'all' | 'show' | 'movie'>('all');
  const [results, setResults]     = useState<TmdbSearchResult[]>([]);
  const [loading, setLoading]     = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [open, setOpen]           = useState(false);
  const inputRef                  = useRef<HTMLInputElement>(null);

  // boardId is passed through for future use (e.g. scoped search)
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
      success: `${result.title} added to board`,
      error: 'Import failed — check TMDB availability',
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
    <div className="relative">
      {/* Type filter pills */}
      <div className="flex gap-1 mb-1">
        {(['all', 'show', 'movie'] as const).map(t => (
          <button
            key={t}
            onClick={() => setMediaType(t)}
            className={`px-2 py-0.5 text-xs rounded-full border transition-colors
                        ${mediaType === t
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-300 dark:border-gray-600 hover:border-blue-400'}`}
          >
            {t === 'all' ? 'All' : t === 'show' ? 'Show' : 'Film'}
          </button>
        ))}
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search TMDB…"
          className="w-56 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500
                     border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        {loading && <Spinner className="absolute right-2.5 top-2 w-4 h-4 text-gray-400" />}
      </div>

      {open && (
        <ul className="absolute right-0 mt-1 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl z-50 overflow-hidden border border-gray-200 dark:border-gray-700">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-500">No results for &ldquo;{query}&rdquo;</li>
          ) : (
            results.map((r, i) => {
              const already = existingTmdbIds.has(r.id);
              return (
                <li
                  key={r.id}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors
                              ${i === activeIdx ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                              ${already ? 'opacity-50 cursor-default' : ''}`}
                  onMouseDown={() => handleSelect(r)}
                >
                  {r.posterPath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${r.posterPath}`}
                      className="w-8 h-12 rounded object-cover shrink-0"
                      alt=""
                    />
                  ) : (
                    <div className="w-8 h-12 rounded bg-gray-200 dark:bg-gray-700 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{r.title}</p>
                    <p className="text-xs text-gray-400">{r.year} · {r.media_type}</p>
                  </div>
                  {already && <span className="text-green-500 text-xs shrink-0">✓ Added</span>}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
