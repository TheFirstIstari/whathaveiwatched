'use client';

// No SpacetimeDB useTable hooks — only useReducer. No force-dynamic needed.
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react';
import { reducers, tables } from '@/src/module_bindings';
import { getDisplayName } from '@/lib/db/connection';
import { importMedia } from '@/lib/db/importMedia';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { toast } from 'sonner';
import { PRESETS, type Preset, type PresetItem } from '@/lib/presets';

function NewBoardPageInner() {
  const router = useRouter();
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [step, setStep]             = useState<'preset' | 'details'>('preset');

  // Preset auto-import state
  const [pendingImport, setPendingImport] = useState<Preset | null>(null);
  const [importProgress, setImportProgress] = useState<{current: number; total: number} | null>(null);
  const boardCountBeforeCreate = useRef(0);

  const { getConnection, identity } = useSpacetimeDB();
  const [allBoards] = useTable(tables.board);

  useEffect(() => {
    if (!getDisplayName()) router.replace('/signin');
  }, [router]);

  const createBoard = useReducer(reducers.createBoard);

  // Watch for the newly created board to appear in subscription, then auto-import preset items
  useEffect(() => {
    if (!pendingImport || !identity) return;
    if (importProgress) return; // already importing

    const identityHex = identity.toHexString();
    const myBoards = allBoards
      .filter(b => b.ownerIdentity.toHexString() === identityHex)
      .sort((a, b) => Number(b.id - a.id));

    // The newest board by our identity is the one we just created
    if (myBoards.length > boardCountBeforeCreate.current) {
      const newBoard = myBoards[0];
      const conn = getConnection();
      if (!conn) {
        toast.error('Not connected to database');
        setPendingImport(null);
        return;
      }

      // Start importing — show progress, don't block navigation until done
      setImportProgress({ current: 0, total: pendingImport.items.length });
      const toastId = toast.loading(`Importing 0/${pendingImport.items.length} titles…`);

      let cancelled = false;

      (async () => {
        for (let i = 0; i < pendingImport.items.length; i++) {
          if (cancelled) break;
          const item: PresetItem = pendingImport.items[i];
          try {
            await importMedia(conn, newBoard.id, item.tmdbId, item.mediaType);
            setImportProgress({ current: i + 1, total: pendingImport.items.length });
            toast.loading(`Importing ${i + 1}/${pendingImport.items.length} titles…`, { id: toastId });
          } catch (err: any) {
            const msg = err?.message ?? 'unknown';
            console.warn(`Failed to import "${item.title}" (TMDB:${item.tmdbId}): ${msg}`);
            toast.error(`Failed to import "${item.title}"`, { id: toastId });
          }
        }

        if (!cancelled) {
          toast.success(`Board created with ${pendingImport.items.length} titles`, { id: toastId });
          setPendingImport(null);
          setImportProgress(null);
          router.push(`/board/${newBoard.id}`);
        }
      })();

      // Cleanup — cancel if component unmounts
      return () => { cancelled = true; };
    }
  }, [allBoards, pendingImport, identity, importProgress, getConnection, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) { setError('Board name is required'); return; }
    setError('');
    setLoading(true);
    try {
      boardCountBeforeCreate.current = allBoards.length;
      await createBoard({ title: trimmed, description: description.trim() });
      if (selectedPreset) {
        // Start watching for board to appear, then auto-import
        setPendingImport(selectedPreset);
      } else {
        toast.success(`Board "${trimmed}" created`);
        router.push('/');
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to create board';
      if (msg.includes('NOT_AUTHENTICATED')) {
        setError('You must be registered first — please refresh and try again.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: Preset) => {
    setSelectedPreset(preset);
    setTitle(preset.name);
    setDescription(preset.description);
    setStep('details');
  };

  const handleSkipPreset = () => {
    setSelectedPreset(null);
    setStep('details');
  };

  const isLoading = loading || pendingImport !== null || importProgress !== null;

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>
      <div className="flex items-center justify-center w-full p-4">
        <div className="w-full max-w-lg ui-card p-6 sm:p-8 animate-[fade-in-up_0.4s_ease-out_both]">
          {step === 'preset' ? (
            <>
              <div className="mb-6">
                <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">Create board</h1>
                <p className="text-xs text-[var(--text-soft)] mt-1">Choose a preset to auto-populate, or start from scratch.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className="ui-card-interactive text-left p-3 group"
                  >
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-xl" aria-hidden>{preset.icon}</span>
                      <span className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                        {preset.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-dim)] leading-relaxed line-clamp-2">
                      {preset.description}
                    </p>
                    <span className="text-[10px] text-[var(--text-dim)] mt-1.5 inline-block">
                      {preset.items.length} titles
                    </span>
                  </button>
                ))}
              </div>

              <Button variant="secondary" onClick={handleSkipPreset} className="w-full">
                Start from scratch
              </Button>
            </>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={() => setStep('preset')} className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors" aria-label="Back to presets">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">
                    {selectedPreset ? `New: ${selectedPreset.name}` : 'Create board'}
                  </h1>
                </div>
                {selectedPreset && (
                  <p className="text-xs text-[var(--text-soft)] mt-1 ml-6">
                    {selectedPreset.items.length} titles will be imported automatically.
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Board name"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  error={error}
                  placeholder="e.g. MCU Rewatch"
                  maxLength={60}
                  autoFocus
                />
                <div className="space-y-1.5">
                  <label htmlFor="desc" className="block text-xs font-medium text-[var(--text-muted)] tracking-wide">
                    Description <span className="text-[var(--text-dim)] font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="desc"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="ui-input resize-none"
                    placeholder="What's this board about?"
                  />
                </div>
                <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                  Boards start private. You can change sharing &amp; invite settings after creation.
                </p>

                {importProgress && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[var(--text-dim)]">
                      <span>Importing titles…</span>
                      <span>{importProgress.current}/{importProgress.total}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1" disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {loading ? 'Creating…' : importProgress ? 'Importing…' : 'Create board'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewBoardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] h-12 flex items-center px-6">
        <div className="h-4 w-28 ui-skeleton" />
      </header>
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-3rem)]">
        <div className="w-full max-w-lg ui-card p-8 sm:p-10 space-y-6">
          <div className="h-5 w-32 ui-skeleton" />
          <div className="h-4 w-48 ui-skeleton" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="h-24 ui-skeleton rounded-[var(--radius-2xl)]" />
            <div className="h-24 ui-skeleton rounded-[var(--radius-2xl)]" />
            <div className="h-24 ui-skeleton rounded-[var(--radius-2xl)]" />
            <div className="h-24 ui-skeleton rounded-[var(--radius-2xl)]" />
          </div>
        </div>
      </div>
    </div>
  );
  return <NewBoardPageInner />;
}
