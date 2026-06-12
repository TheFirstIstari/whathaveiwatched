'use client';

// No SpacetimeDB useTable hooks — only useReducer. No force-dynamic needed.
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReducer } from 'spacetimedb/react';
import { reducers } from '@/src/module_bindings';
import { getDisplayName } from '@/lib/db/connection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { toast } from 'sonner';
import { PRESETS, type Preset } from '@/lib/presets';

function NewBoardPageInner() {
  const router = useRouter();
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [step, setStep]             = useState<'preset' | 'details'>('preset');

  useEffect(() => {
    if (!getDisplayName()) router.replace('/signin');
  }, [router]);

  const createBoard = useReducer(reducers.createBoard);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) { setError('Board name is required'); return; }
    setError('');
    setLoading(true);
    try {
      await createBoard({ title: trimmed, description: description.trim() });
      toast.success(`Board "${trimmed}" created`);
      if (selectedPreset) {
        toast.info(`Preset "${selectedPreset.name}" selected — add titles from the board page.`);
      }
      router.push('/');
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
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Creating…' : 'Create board'}
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
