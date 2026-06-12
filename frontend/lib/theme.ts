// Cinematic Terminal Palette — Konva canvas tokens.
// Kept in sync with globals.css :root / .dark values.
// Watch-state chips kept color-coded for usability.
export const LIGHT_THEME = {
  'canvas.bg': '#E5E3DF',
  'canvas.dot': 'rgba(28,25,20,0.07)',
  'card.bg': '#F3F1ED',
  'card.border': 'rgba(28,25,20,0.13)',
  'card.borderHover': '#0D9488',
  'card.shadow': 'rgba(28,25,20,0.14)',
  'card.title': '#1C1917',
  'card.subtitle': '#78756F',
  'chip.watched': '#10B981',
  'chip.partial': '#F59E0B',
  'chip.unwatched': '#C5C2BC',
  'menu.bg': '#F3F1ED',
  'menu.border': 'rgba(28,25,20,0.11)',
  'menu.text': '#1C1917',
  'menu.muted': '#78756F',
  'menu.hover': '#E0DDD8',
  'danger': '#EF4444',
} as const;

export const DARK_THEME = {
  'canvas.bg': '#0E0E10',
  'canvas.dot': 'rgba(255,255,255,0.04)',
  'card.bg': '#18181A',
  'card.border': 'rgba(255,255,255,0.10)',
  'card.borderHover': '#2DD4BF',
  'card.shadow': 'rgba(0,0,0,0.68)',
  'card.title': '#ECECEA',
  'card.subtitle': '#9A9A98',
  'chip.watched': '#34D399',
  'chip.partial': '#FBBF24',
  'chip.unwatched': '#475569',
  'menu.bg': '#18181A',
  'menu.border': 'rgba(255,255,255,0.10)',
  'menu.text': '#ECECEA',
  'menu.muted': '#9A9A98',
  'menu.hover': '#2A2A2D',
  'danger': '#F87171',
} as const;

export type ThemeTokens = typeof LIGHT_THEME | typeof DARK_THEME;
