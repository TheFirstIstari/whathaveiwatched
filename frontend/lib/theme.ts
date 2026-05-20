export const LIGHT_THEME = {
  'canvas.bg': '#FDFCF8',
  'card.bg': '#FFFEFA',
  'card.border': '#1F1F1F',
  'card.borderHover': '#6965DB',
  'card.shadow': 'rgba(31,31,31,0.16)',
  'card.title': '#1F1F1F',
  'card.subtitle': '#756F65',
  'chip.watched': '#2B8A3E',
  'chip.partial': '#E67700',
  'chip.unwatched': '#D8D2C4',
  'menu.bg': '#FFFEFA',
  'menu.border': '#1F1F1F',
  'menu.text': '#1F1F1F',
  'menu.muted': '#756F65',
  'menu.hover': '#F4F1EA',
  'danger': '#D9480F',
} as const;

export const DARK_THEME = {
  'canvas.bg': '#09090B',
  'card.bg': '#111114',
  'card.border': 'rgba(255,255,255,0.72)',
  'card.borderHover': '#8B87FF',
  'card.shadow': 'rgba(0,0,0,0.65)',
  'card.title': '#FAFAF9',
  'card.subtitle': '#A8A29E',
  'chip.watched': '#34D399',
  'chip.partial': '#FBBF24',
  'chip.unwatched': '#44403C',
  'menu.bg': '#111114',
  'menu.border': 'rgba(255,255,255,0.72)',
  'menu.text': '#FAFAF9',
  'menu.muted': '#A8A29E',
  'menu.hover': '#242428',
  'danger': '#FF8787',
} as const;

export type ThemeTokens = typeof LIGHT_THEME | typeof DARK_THEME;