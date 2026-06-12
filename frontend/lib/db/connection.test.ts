import { describe, it, expect, beforeEach } from 'vitest';
import {
  getIdentityToken, setIdentityToken, clearIdentityToken,
  getIdentityHex, setIdentityHex,
  getDisplayName, setDisplayName,
  getParticipantState, setParticipantState, clearParticipantState,
} from './connection';

describe('identity token storage', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips the identity token', () => {
    expect(getIdentityToken()).toBeNull();
    setIdentityToken('tok-123');
    expect(getIdentityToken()).toBe('tok-123');
  });

  it('clearIdentityToken removes token and hex', () => {
    setIdentityToken('tok');
    setIdentityHex('abcd');
    clearIdentityToken();
    expect(getIdentityToken()).toBeNull();
    expect(getIdentityHex()).toBeNull();
  });

  it('round-trips identity hex', () => {
    setIdentityHex('deadbeef');
    expect(getIdentityHex()).toBe('deadbeef');
  });
});

describe('display name storage', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips display name', () => {
    expect(getDisplayName()).toBeNull();
    setDisplayName('Alice');
    expect(getDisplayName()).toBe('Alice');
  });
});

describe('participant state', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips participant state as JSON, keyed by boardId', () => {
    setParticipantState('7', { displayName: 'Bob', joinedAt: 123 });
    expect(getParticipantState('7')).toEqual({ displayName: 'Bob', joinedAt: 123 });
  });

  it('supports bigint board ids', () => {
    setParticipantState(7n, { displayName: 'Bob', joinedAt: 1 });
    // string and bigint keys must resolve to the same slot
    expect(getParticipantState('7')).toEqual({ displayName: 'Bob', joinedAt: 1 });
  });

  it('returns null for unknown board', () => {
    expect(getParticipantState('999')).toBeNull();
  });

  it('returns null for corrupt JSON instead of throwing', () => {
    localStorage.setItem('ihw_participant_5', '{not json');
    expect(getParticipantState('5')).toBeNull();
  });

  it('clearParticipantState removes only that board', () => {
    setParticipantState('1', { displayName: 'A', joinedAt: 1 });
    setParticipantState('2', { displayName: 'B', joinedAt: 2 });
    clearParticipantState('1');
    expect(getParticipantState('1')).toBeNull();
    expect(getParticipantState('2')).not.toBeNull();
  });
});
