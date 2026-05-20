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

function BoardSettingsInner() {
  const router  = useRouter();
  const params  = useParams();
  const boardId = BigInt(params.boardId as string);

  const [identityHex, setIH]      = useState<string | null>(null);
  const [title, setTitle]         = useState('');
  const [description, setDesc]    = useState('');
  const [sharingMode, setSharing] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [editLoading, setEL]      = useState(false);
  const [deleteConfirm, setDC]    = useState(false);
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    const name = getDisplayName();
    const hex  = getIdentityHex();
    if (!name || !hex) { router.replace('/signin'); return; }
    setIH(hex);
  }, [router]);

  const [boards]        = useTable(tables.board);
  const [participants]  = useTable(tables.participant);
  const [accounts]      = useTable(tables.account);
  const [mediaItems]    = useTable(tables.media_item);

  const updateBoard        = useReducer(reducers.updateBoard);
  const deleteBoard        = useReducer(reducers.deleteBoard);
  const regenerateInvite   = useReducer(reducers.regenerateInvite);
  const removeParticipant  = useReducer(reducers.removeParticipant);

  const board = boards.find(b => b.id === boardId);
  const boardParticipants = participants.filter(p => p.boardId === boardId);

  // Stats
  const topLevelItems = mediaItems.filter(m => m.boardId === boardId && (m.mediaType === 'FILM' || m.mediaType === 'SHOW'));
  const totalItems    = mediaItems.filter(m => m.boardId === boardId).length;

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

  // Owner display name from account table
  const ownerAccount = board ? accounts.find(a => a.ownerIdentity.toHexString() === board.ownerIdentity.toHexString()) : null;
  const ownerName = ownerAccount?.displayName ?? getDisplayName() ?? 'Owner';

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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const handleRemoveParticipant = async (participantId: bigint, name: string) => {
    try {
      await removeParticipant({ boardId, participantId });
      toast.success(`Removed ${name}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed');
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/board/${boardId}`)} className="!px-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </Button>
          <span className="text-[var(--border-strong)] select-none">/</span>
          <h1 className="text-sm font-medium text-[var(--text)] truncate">{board?.title ?? 'Settings'}</h1>
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] ml-1">Settings</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-5">

        {/* Stats */}
        {board && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Titles', value: topLevelItems.length },
              { label: 'Items', value: totalItems },
              { label: 'Members', value: boardParticipants.length + 1 },
            ].map(stat => (
              <div key={stat.label} className="ui-card px-4 py-3">
                <p className="text-xl font-semibold text-[var(--text)] tabular-nums leading-none">{stat.value}</p>
                <p className="text-[11px] text-[var(--text-dim)] mt-1.5 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Board info */}
        <SettingsSection title="Board" description="Name, description, and sharing.">
          <form onSubmit={handleUpdate} className="space-y-4">
            <Input label="Name" value={title} onChange={e => setTitle(e.target.value)} maxLength={60} />
            <div className="space-y-1.5">
              <label htmlFor="settings-desc" className="block text-xs font-medium text-[var(--text-muted)] tracking-wide">
                Description
              </label>
              <textarea
                id="settings-desc"
                value={description}
                onChange={e => setDesc(e.target.value)}
                maxLength={500}
                rows={3}
                className="ui-input resize-none"
              />
            </div>
            <fieldset className="space-y-1">
              <legend className="block text-xs font-medium text-[var(--text-muted)] tracking-wide mb-2">
                Sharing
              </legend>
              {([
                { mode: 'PRIVATE' as const, label: 'Private', desc: 'Invite link required' },
                { mode: 'PUBLIC'  as const, label: 'Public',  desc: 'Anyone with link can view' },
              ]).map(({ mode, label, desc }) => {
                const checked = sharingMode === mode;
                return (
                  <label key={mode}
                         className={`flex items-start gap-3 p-3 rounded-md cursor-pointer border transition-colors
                                     ${checked
                                       ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                                       : 'border-[var(--border)] hover:bg-[var(--surface-2)]'}`}>
                    <input type="radio" name="sharing" value={mode}
                           checked={checked} onChange={() => setSharing(mode)}
                           className="mt-0.5 accent-[var(--accent)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text)] leading-tight">{label}</p>
                      <p className="text-xs text-[var(--text-soft)] mt-0.5">{desc}</p>
                    </div>
                  </label>
                );
              })}
            </fieldset>
            <div className="pt-1">
              <Button type="submit" disabled={editLoading} size="sm">
                {editLoading ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </SettingsSection>

        {/* Invite link */}
        <SettingsSection title="Invite link" description="Share this link so others can join.">
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteLink}
              onFocus={e => e.currentTarget.select()}
              className="ui-input !bg-[var(--surface-2)] font-mono text-xs text-[var(--text-soft)] truncate"
            />
            <Button size="sm" variant={copied ? 'secondary' : 'primary'} onClick={handleCopy} className="shrink-0">
              {copied ? '✓ Copied' : 'Copy'}
            </Button>
          </div>
          <button
            className="mt-3 text-xs text-[var(--text-dim)] hover:text-[var(--text)] transition-colors inline-flex items-center gap-1"
            onClick={handleRegenInvite}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9M3 4v5h5"/>
            </svg>
            Regenerate link
          </button>
        </SettingsSection>

        {/* Members */}
        <SettingsSection title={`Members · ${boardParticipants.length + 1}`} description="People with access to this board.">
          <ul className="-mx-2 -my-1">
            {/* Owner row */}
            <li className="flex items-center justify-between px-2 py-2 rounded-md">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-xs font-semibold text-[var(--accent)]">
                  {ownerName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-[var(--text)]">{ownerName}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)]">
                Owner
              </span>
            </li>
            {boardParticipants.map(p => (
              <li key={String(p.id)} className="flex items-center justify-between px-2 py-2 rounded-md ui-row-hover group">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-xs font-semibold text-[var(--text-soft)]">
                    {p.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-[var(--text)]">{p.displayName}</span>
                </div>
                <button
                  className="text-[11px] text-[var(--text-dim)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-1"
                  onClick={() => handleRemoveParticipant(p.id, p.displayName)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </SettingsSection>

        {/* Danger zone */}
        <section className="ui-card border-[var(--danger)]/30 p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-[var(--danger)]">Danger zone</h2>
            <p className="text-xs text-[var(--text-soft)] mt-0.5">Permanent and irreversible actions.</p>
          </div>
          {deleteConfirm ? (
            <div className="space-y-3 p-3 rounded-md bg-[var(--danger-soft)] border border-[var(--danger)]/20">
              <p className="text-sm text-[var(--text)]">Permanently delete this board and all its data?</p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={handleDelete}>Yes, delete</Button>
                <Button variant="secondary" size="sm" onClick={() => setDC(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" size="sm" onClick={handleDelete}>Delete board</Button>
          )}
        </section>

      </main>
    </div>
  );
}

function SettingsSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="ui-card p-6">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
        {description && <p className="text-xs text-[var(--text-soft)] mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function BoardSettingsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] h-14 flex items-center px-6">
        <div className="h-5 w-32 bg-[var(--surface-2)] rounded animate-pulse" />
      </header>
    </div>
  );
  return <BoardSettingsInner />;
}
