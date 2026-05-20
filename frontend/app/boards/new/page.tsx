'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReducer } from 'spacetimedb/react';
import { reducers } from '@/src/module_bindings';
import { getDisplayName } from '@/lib/db/connection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

function NewBoardPageInner() {
  const router = useRouter();
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md ui-card p-8">
        <div className="mb-6">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">Create board</h1>
          <p className="text-xs text-[var(--text-dim)] mt-1">A space to track watched media with friends.</p>
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
      </div>
    </div>
  );
}

export default function NewBoardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="min-h-screen flex items-center justify-center"><p className="text-[var(--text-dim)] text-sm">Loading…</p></div>;
  return <NewBoardPageInner />;
}
