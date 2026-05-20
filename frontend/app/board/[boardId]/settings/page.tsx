'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '@/src/module_bindings';
import { getDisplayName, getIdentityHex } from '@/lib/db/connection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

export default function BoardSettingsPage() {
  const router  = useRouter();
  const params  = useParams();
  const boardId = BigInt(params.boardId as string);

  const [mounted, setMounted]     = useState(false);
  const [identityHex, setIH]      = useState<string | null>(null);
  const [title, setTitle]         = useState('');
  const [description, setDesc]    = useState('');
  const [sharingMode, setSharing] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [editLoading, setEL]      = useState(false);
  const [deleteConfirm, setDC]    = useState(false);

  useEffect(() => {
    setMounted(true);
    const name = getDisplayName();
    const hex  = getIdentityHex();
    if (!name || !hex) { router.replace('/auth/signin'); return; }
    setIH(hex);
  }, [router]);

  const [boards]        = useTable(tables.board);
  const [participants]  = useTable(tables.participant);

  const updateBoard        = useReducer(reducers.updateBoard);
  const deleteBoard        = useReducer(reducers.deleteBoard);
  const regenerateInvite   = useReducer(reducers.regenerateInvite);
  const removeParticipant  = useReducer(reducers.removeParticipant);

  const board = boards.find(b => b.id === boardId);
  const boardParticipants = participants.filter(p => p.boardId === boardId);

  // Guard: redirect non-owners
  useEffect(() => {
    if (!board || !identityHex) return;
    if (board.ownerIdentity.toHexString() !== identityHex) {
      router.replace(`/board/${boardId}`);
    }
  }, [board, identityHex, boardId, router]);

  // Pre-fill form from board data
  useEffect(() => {
    if (!board) return;
    setTitle(board.title);
    setDesc(board.description);
    setSharing(board.sharingMode as 'PRIVATE' | 'PUBLIC');
  }, [board]);

  const inviteLink = board
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/board/${boardId}/join?invite=${board.inviteToken}`
    : '';

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }
    setEL(true);
    try {
      await updateBoard({ boardId, title: title.trim(), description: description.trim(), sharingMode, orderingMode: board?.orderingMode ?? 'RELEASE_DATE' });
      toast.success('Board updated');
    } catch (err: any) {
      toast.error(err?.message ?? 'Update failed');
    } finally { setEL(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) { setDC(true); return; }
    try {
      await deleteBoard({ boardId });
      toast.success('Board deleted');
      router.replace('/');
    } catch (err: any) {
      toast.error(err?.message ?? 'Delete failed');
    }
  };

  const handleRegenInvite = async () => {
    try {
      await regenerateInvite({ boardId });
      toast.success('Invite link regenerated');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed');
    }
  };

  const handleRemoveParticipant = async (participantId: bigint, name: string) => {
    try {
      await removeParticipant({ boardId, participantId });
      toast.success(`Removed ${name}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed');
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b bg-white dark:bg-gray-900 px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/board/${boardId}`)}>← Back</Button>
        <h1 className="font-bold text-gray-900 dark:text-white">Board Settings</h1>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Board info */}
        <section className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Board Info</h2>
          <form onSubmit={handleUpdate} className="space-y-4">
            <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} maxLength={60} />
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
              <textarea
                value={description}
                onChange={e => setDesc(e.target.value)}
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
                  <input type="radio" name="sharing" value={mode}
                         checked={sharingMode === mode} onChange={() => setSharing(mode)} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {mode === 'PRIVATE' ? 'Private — invite link only' : 'Public — anyone with link can view'}
                  </span>
                </label>
              ))}
            </fieldset>
            <Button type="submit" disabled={editLoading}>
              {editLoading ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </section>

        {/* Invite link */}
        <section className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Invite Link</h2>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 rounded-lg border px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-500 truncate"
            />
            <Button size="sm" variant="secondary"
                    onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!'); }}>
              Copy
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="mt-2 text-xs text-gray-400" onClick={handleRegenInvite}>
            Regenerate link
          </Button>
        </section>

        {/* Participants */}
        {boardParticipants.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              Participants ({boardParticipants.length})
            </h2>
            <ul className="space-y-2">
              {boardParticipants.map(p => (
                <li key={String(p.id)} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{p.displayName}</span>
                  <Button
                    variant="ghost" size="sm"
                    className="text-red-500 hover:text-red-700 text-xs"
                    onClick={() => handleRemoveParticipant(p.id, p.displayName)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Danger zone */}
        <section className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-red-200 dark:border-red-900">
          <h2 className="font-semibold text-red-600 mb-3">Danger Zone</h2>
          {deleteConfirm ? (
            <div className="space-y-2">
              <p className="text-sm text-red-600">This will permanently delete the board and all its data. Are you sure?</p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={handleDelete}>Yes, delete</Button>
                <Button variant="secondary" size="sm" onClick={() => setDC(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" size="sm" onClick={handleDelete}>Delete Board</Button>
          )}
        </section>

      </main>
    </div>
  );
}
