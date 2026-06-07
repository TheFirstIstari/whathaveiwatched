// Monolithic palette: single teal accent + neutral grays.
// Watch-state chips (watched/partial/unwatched) kept color-coded for usability.
export const LIGHT_THEME = {
  'canvas.bg': '#E8E8E5',
  'canvas.dot': 'rgba(20,20,18,0.08)',
  'card.bg': '#F2F2EF',
  'card.border': 'rgba(20,20,18,0.14)',
  'card.borderHover': '#0F766E',
  'card.shadow': 'rgba(20,20,18,0.18)',
  'card.title': '#18181B',
  'card.subtitle': '#6B6B70',
  'chip.watched': '#10B981',
  'chip.partial': '#F59E0B',
  'chip.unwatched': '#C9C9C4',
  'menu.bg': '#F2F2EF',
  'menu.border': 'rgba(20,20,18,0.12)',
  'menu.text': '#18181B',
  'menu.muted': '#6B6B70',
  'menu.hover': '#E2E2DE',
  'danger': '#EF4444',
} as const;

export const DARK_THEME = {
  'canvas.bg': '#0C0C0D',
  'canvas.dot': 'rgba(255,255,255,0.05)',
  'card.bg': '#161617',
  'card.border': 'rgba(255,255,255,0.12)',
  'card.borderHover': '#2DD4BF',
  'card.shadow': 'rgba(0,0,0,0.7)',
  'card.title': '#E9E9E7',
  'card.subtitle': '#9A9A98',
  'chip.watched': '#34D399',
  'chip.partial': '#FBBF24',
  'chip.unwatched': '#475569',
  'menu.bg': '#161617',
  'menu.border': 'rgba(255,255,255,0.12)',
  'menu.text': '#E9E9E7',
  'menu.muted': '#9A9A98',
  'menu.hover': '#242427',
  'danger': '#F87171',
} as const;

export type ThemeTokens = typeof LIGHT_THEME | typeof DARK_THEME;
