import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOwnerToken, setOwnerToken, clearOwnerToken,
  getParticipantToken, setParticipantToken, clearParticipantToken,
  setDisplayName,
} from './connection';

describe('legacy compat shims', () => {
  beforeEach(() => localStorage.clear());

  describe('owner token shims', () => {
    it('getOwnerToken delegates to getIdentityToken', () => {
      expect(getOwnerToken()).toBeNull();
      setOwnerToken('legacy-tok');
      expect(getOwnerToken()).toBe('legacy-tok');
    });

    it('clearOwnerToken clears both token and hex', () => {
      setOwnerToken('tok');
      clearOwnerToken();
      expect(getOwnerToken()).toBeNull();
    });
  });

  describe('participant token shims', () => {
    it('setParticipantToken stores participant state', () => {
      setDisplayName('LegacyUser');
      setParticipantToken('42', 'some-token');
      const state = getParticipantToken('42');
      expect(state).toBe('joined');
    });

    it('clearParticipantToken removes participant state', () => {
      setDisplayName('LegacyUser');
      setParticipantToken('42', 'some-token');
      clearParticipantToken('42');
      expect(getParticipantToken('42')).toBeNull();
    });

    it('returns null when no participant state exists', () => {
      expect(getParticipantToken('nonexistent')).toBeNull();
    });
  });
});
