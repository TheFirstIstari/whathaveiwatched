export const LIGHT_THEME = {
  'canvas.bg': '#F7F8FB',
  'card.bg': '#FFFFFF',
  'card.border': 'rgba(15,23,42,0.14)',
  'card.borderHover': '#6366F1',
  'card.shadow': 'rgba(15,23,42,0.18)',
  'card.title': '#0F172A',
  'card.subtitle': '#64748B',
  'chip.watched': '#10B981',
  'chip.partial': '#F59E0B',
  'chip.unwatched': '#CBD5E1',
  'menu.bg': '#FFFFFF',
  'menu.border': 'rgba(15,23,42,0.12)',
  'menu.text': '#0F172A',
  'menu.muted': '#64748B',
  'menu.hover': '#F1F5F9',
  'danger': '#EF4444',
} as const;

export const DARK_THEME = {
  'canvas.bg': '#07080D',
  'card.bg': '#11131D',
  'card.border': 'rgba(255,255,255,0.12)',
  'card.borderHover': '#818CF8',
  'card.shadow': 'rgba(0,0,0,0.7)',
  'card.title': '#F8FAFC',
  'card.subtitle': '#94A3B8',
  'chip.watched': '#34D399',
  'chip.partial': '#FBBF24',
  'chip.unwatched': '#475569',
  'menu.bg': '#11131D',
  'menu.border': 'rgba(255,255,255,0.12)',
  'menu.text': '#F8FAFC',
  'menu.muted': '#94A3B8',
  'menu.hover': '#202437',
  'danger': '#F87171',
} as const;

export type ThemeTokens = typeof LIGHT_THEME | typeof DARK_THEME;
