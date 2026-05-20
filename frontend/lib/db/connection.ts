'use client';

/**
 * SpacetimeDB identity / token storage.
 *
 * Auth model: anonymous SpacetimeDB identities.
 * - On first connection SpacetimeDB issues an identity + token.
 * - We store them in localStorage under `ihw_identity_token`.
 * - Any device that holds this token IS the owner of boards it created.
 * - Participants use the same mechanism but store an *additional* board-scoped
 *   display-name entry so the join flow can remember who they are on that board.
 */

const IDENTITY_TOKEN_KEY  = 'ihw_identity_token';
const IDENTITY_HEX_KEY    = 'ihw_identity_hex';
const PARTICIPANT_PREFIX  = 'ihw_participant_';   // + boardId → JSON {displayName}
const DISPLAY_NAME_KEY    = 'ihw_display_name';

// ---------------------------------------------------------------------------
// Identity token (owner / general identity)
// ---------------------------------------------------------------------------

export function getIdentityToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(IDENTITY_TOKEN_KEY);
}

export function setIdentityToken(token: string) {
  localStorage.setItem(IDENTITY_TOKEN_KEY, token);
}

export function clearIdentityToken() {
  localStorage.removeItem(IDENTITY_TOKEN_KEY);
  localStorage.removeItem(IDENTITY_HEX_KEY);
}

// ---------------------------------------------------------------------------
// Identity hex (the SpacetimeDB Identity as a hex string, for display)
// ---------------------------------------------------------------------------

export function getIdentityHex(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(IDENTITY_HEX_KEY);
}

export function setIdentityHex(hex: string) {
  localStorage.setItem(IDENTITY_HEX_KEY, hex);
}

// ---------------------------------------------------------------------------
// Display name (used by register_owner and join_board)
// ---------------------------------------------------------------------------

export function getDisplayName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DISPLAY_NAME_KEY);
}

export function setDisplayName(name: string) {
  localStorage.setItem(DISPLAY_NAME_KEY, name);
}

// ---------------------------------------------------------------------------
// Per-board participant state (display name used on that board)
// ---------------------------------------------------------------------------

interface ParticipantState {
  displayName: string;
  joinedAt: number;
}

export function getParticipantState(boardId: string | bigint): ParticipantState | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(`${PARTICIPANT_PREFIX}${boardId}`);
  if (!raw) return null;
  try { return JSON.parse(raw) as ParticipantState; } catch { return null; }
}

export function setParticipantState(boardId: string | bigint, state: ParticipantState) {
  localStorage.setItem(`${PARTICIPANT_PREFIX}${boardId}`, JSON.stringify(state));
}

export function clearParticipantState(boardId: string | bigint) {
  localStorage.removeItem(`${PARTICIPANT_PREFIX}${boardId}`);
}

// ---------------------------------------------------------------------------
// Legacy compat shims (used by pages built before auth model was finalised)
// ---------------------------------------------------------------------------

/** @deprecated use getIdentityToken() */
export function getOwnerToken(): string | null { return getIdentityToken(); }
/** @deprecated use setIdentityToken() */
export function setOwnerToken(token: string)   { setIdentityToken(token); }
/** @deprecated use clearIdentityToken() */
export function clearOwnerToken()              { clearIdentityToken(); }

/** @deprecated use getParticipantState() */
export function getParticipantToken(boardId: string | bigint): string | null {
  return getParticipantState(boardId) ? 'joined' : null;
}
/** @deprecated use setParticipantState() */
export function setParticipantToken(boardId: string | bigint, _token: string) {
  setParticipantState(boardId, { displayName: getDisplayName() ?? 'Anonymous', joinedAt: Date.now() });
}
/** @deprecated use clearParticipantState() */
export function clearParticipantToken(boardId: string | bigint) { clearParticipantState(boardId); }
