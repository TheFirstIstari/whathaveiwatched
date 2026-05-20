export const LIGHT_THEME = {
  'canvas.bg': '#FAFAFA',
  'card.bg': '#FFFFFF',
  'card.border': '#E4E4E7',
  'card.borderHover': '#D4D4D8',
  'card.shadow': 'rgba(0,0,0,0.06)',
  'card.title': '#18181B',
  'card.subtitle': '#71717A',
  'chip.watched': '#10B981',
  'chip.partial': '#F59E0B',
  'chip.unwatched': '#D4D4D8',
  'menu.bg': '#FFFFFF',
  'menu.border': '#E4E4E7',
  'menu.text': '#18181B',
  'menu.muted': '#71717A',
  'menu.hover': '#F4F4F5',
  'danger': '#DC2626',
} as const;

export const DARK_THEME = {
  'canvas.bg': '#0A0A0A',
  'card.bg': '#111114',
  'card.border': 'rgba(255,255,255,0.08)',
  'card.borderHover': 'rgba(255,255,255,0.14)',
  'card.shadow': 'rgba(0,0,0,0.45)',
  'card.title': '#FAFAFA',
  'card.subtitle': '#A1A1AA',
  'chip.watched': '#34D399',
  'chip.partial': '#FBBF24',
  'chip.unwatched': '#3F3F46',
  'menu.bg': '#111114',
  'menu.border': 'rgba(255,255,255,0.10)',
  'menu.text': '#FAFAFA',
  'menu.muted': '#A1A1AA',
  'menu.hover': '#1C1C21',
  'danger': '#F87171',
} as const;

export type ThemeTokens = typeof LIGHT_THEME | typeof DARK_THEME;