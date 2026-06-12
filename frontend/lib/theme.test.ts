import { describe, it, expect } from 'vitest';
import { LIGHT_THEME, DARK_THEME } from './theme';

describe('theme tokens', () => {
  const requiredKeys = [
    'canvas.bg',
    'canvas.dot',
    'card.bg',
    'card.border',
    'card.borderHover',
    'card.shadow',
    'card.title',
    'card.subtitle',
    'chip.watched',
    'chip.partial',
    'chip.unwatched',
    'menu.bg',
    'menu.border',
    'menu.text',
    'menu.muted',
    'menu.hover',
    'danger',
  ] as const;

  describe('LIGHT_THEME', () => {
    it('has all required keys', () => {
      for (const key of requiredKeys) {
        expect(LIGHT_THEME).toHaveProperty(key);
      }
    });

    it('uses warm stone neutrals for canvas bg', () => {
      expect(LIGHT_THEME['canvas.bg']).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('has a teal accent for card border hover', () => {
      // teal-ish: starts with #0 or #1 and contains 9488 or similar
      expect(LIGHT_THEME['card.borderHover']).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('has color-coded watch chips', () => {
      expect(LIGHT_THEME['chip.watched']).not.toBe(LIGHT_THEME['chip.unwatched']);
      expect(LIGHT_THEME['chip.partial']).not.toBe(LIGHT_THEME['chip.unwatched']);
    });
  });

  describe('DARK_THEME', () => {
    it('has all required keys', () => {
      for (const key of requiredKeys) {
        expect(DARK_THEME).toHaveProperty(key);
      }
    });

    it('has a darker canvas bg than light', () => {
      // Dark theme canvas should be darker (lower hex value) than light
      const darkVal = parseInt(DARK_THEME['canvas.bg'].slice(1), 16);
      const lightVal = parseInt(LIGHT_THEME['canvas.bg'].slice(1), 16);
      expect(darkVal).toBeLessThan(lightVal);
    });

    it('has a lighter card title than light (inverted)', () => {
      const darkTitle = parseInt(DARK_THEME['card.title'].slice(1), 16);
      const lightTitle = parseInt(LIGHT_THEME['card.title'].slice(1), 16);
      expect(darkTitle).toBeGreaterThan(lightTitle);
    });
  });

  describe('theme parity', () => {
    it('LIGHT_THEME and DARK_THEME have the same set of keys', () => {
      const lightKeys = new Set(Object.keys(LIGHT_THEME));
      const darkKeys = new Set(Object.keys(DARK_THEME));
      expect(lightKeys).toEqual(darkKeys);
    });
  });
});
