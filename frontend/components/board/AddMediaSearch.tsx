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
    <div className="relative flex items-center gap-1">
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-dim)] pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
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
          className="w-44 sm:w-56 h-8 pl-8 pr-8 rounded-xl text-sm
                     bg-[var(--surface)] border border-[var(--border-strong)]
                     text-[var(--text)] placeholder:text-[var(--text-dim)]
                     outline-none transition-[border-color,box-shadow,background]
                     shadow-[0_1.5px_0_var(--border-strong)]
                     focus:bg-[var(--surface)] focus:border-[var(--accent)]
                     focus:shadow-[0_0_0_3px_var(--ring)]"
        />
        {loading
          ? <Spinner className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-dim)]" />
          : query.length > 0 && (
            <button
              onMouseDown={e => { e.preventDefault(); setQuery(''); setOpen(false); }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] text-xs leading-none"
              aria-label="Clear"
            >
              ✕
            </button>
          )
        }
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5
                        w-[min(22rem,calc(100vw-1.5rem))]
                        bg-[var(--surface)] border border-[var(--border-strong)]
                        rounded-2xl overflow-hidden z-50
                        shadow-[4px_4px_0_var(--border-strong)]">
          {/* Type filter pills */}
          <div className="flex gap-1 px-2.5 pt-2.5 pb-2 border-b border-[var(--border)]">
            {(['all', 'show', 'movie'] as const).map(t => (
              <button
                key={t}
                onMouseDown={e => { e.preventDefault(); setMediaType(t); }}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors
                            ${mediaType === t
                              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'text-[var(--text-soft)] hover:bg-[var(--surface-2)]'}`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-[var(--text-dim)] font-mono self-center">
              {results.length > 0 && `${results.length}`}
            </span>
          </div>

          <ul className="max-h-80 overflow-y-auto py-1">
            {results.length === 0 ? (
              <li className="px-4 py-6 text-sm text-[var(--text-dim)] text-center">
                No results for &ldquo;<span className="text-[var(--text-soft)]">{query}</span>&rdquo;
              </li>
            ) : (
              results.map((r, i) => {
                const already = existingTmdbIds.has(r.id);
                return (
                  <li
                    key={r.id}
                    onMouseDown={() => handleSelect(r)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 mx-1 my-px rounded-md
                                cursor-pointer transition-colors select-none
                                ${already ? 'opacity-50 cursor-default' : ''}
                                ${i === activeIdx
                                  ? 'bg-[var(--accent-soft)]'
                                  : 'hover:bg-[var(--surface-2)]'}`}
                  >
                    {/* Poster thumbnail */}
                    {r.posterPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://image.tmdb.org/t/p/w92${r.posterPath}`}
                        className="w-8 h-11 rounded object-cover shrink-0 border border-[var(--border)]"
                        alt=""
                      />
                    ) : (
                      <div className="w-8 h-11 rounded bg-[var(--surface-2)] shrink-0 flex items-center justify-center text-[var(--text-dim)] text-xs border border-[var(--border)]">
                        ?
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-[var(--text)] leading-snug">
                        {r.title}
                      </p>
                      <p className="text-[11px] text-[var(--text-dim)] mt-0.5 flex items-center gap-1.5">
                        {r.year && <span>{r.year}</span>}
                        {r.year && r.media_type && <span className="opacity-50">·</span>}
                        <span className="uppercase tracking-wider">
                          {r.media_type === 'tv' ? 'TV' : r.media_type}
                        </span>
                      </p>
                    </div>

                    {already
                      ? <span className="text-[10px] uppercase tracking-wider text-[var(--success)] font-medium shrink-0">Added</span>
                      : <span className={`text-[10px] uppercase tracking-wider font-medium shrink-0
                                          ${i === activeIdx ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}`}>
                          Add
                        </span>
                    }
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
