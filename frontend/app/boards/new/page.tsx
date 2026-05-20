'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '@/src/module_bindings';
import { getDisplayName, getIdentityHex } from '@/lib/db/connection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

function NewBoardPageInner() {
  const router = useRouter();
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [sharingMode, setSharingMode] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (!getDisplayName()) router.replace('/auth/signin');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Create Board</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Board name"
            value={title}
            onChange={e => setTitle(e.target.value)}
            error={error}
            placeholder="e.g. MCU Rewatch"
            maxLength={60}
            autoFocus
          />
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description (optional)</span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500
                         border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">Sharing</legend>
            {(['PRIVATE', 'PUBLIC'] as const).map(mode => (
              <label key={mode} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sharing"
                  value={mode}
                  checked={sharingMode === mode}
                  onChange={() => setSharingMode(mode)}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {mode === 'PRIVATE' ? 'Private — invite link only' : 'Public — anyone with link can view'}
                </span>
              </label>
            ))}
          </fieldset>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating…' : 'Create Board'}
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
  if (!mounted) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center"><p className="text-gray-400 text-sm">Loading…</p></div>;
  return <NewBoardPageInner />;
}
