import { describe, it, expect } from 'vitest';
import { avatarColor } from './avatarColor';

describe('avatarColor', () => {
  it('returns a hex color from the palette', () => {
    expect(avatarColor('deadbeef')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('is deterministic for the same input', () => {
    expect(avatarColor('alice')).toBe(avatarColor('alice'));
  });

  it('handles empty string without throwing', () => {
    expect(() => avatarColor('')).not.toThrow();
    expect(avatarColor('')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('distributes across more than one color for varied inputs', () => {
    const colors = new Set(
      ['a', 'b', 'c', 'd', 'abcd', '0xff', 'identity-1', 'identity-2'].map(avatarColor),
    );
    expect(colors.size).toBeGreaterThan(1);
  });
});
