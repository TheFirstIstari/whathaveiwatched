export const LIGHT_THEME = {
  'card.bg': '#FFFFFF',
  'card.border': '#E2E8F0',
  'card.borderHover': '#94A3B8',
  'card.shadow': 'rgba(0,0,0,0.08)',
  'card.title': '#1A202C',
  'card.subtitle': '#718096',
  'chip.watched': '#38A169',
  'chip.partial': '#DD6B20',
  'chip.unwatched': '#CBD5E0',
} as const;

export const DARK_THEME = {
  'card.bg': '#1E1E2E',
  'card.border': '#313244',
  'card.borderHover': '#585B70',
  'card.shadow': 'rgba(0,0,0,0.40)',
  'card.title': '#CDD6F4',
  'card.subtitle': '#A6ADC8',
  'chip.watched': '#A6E3A1',
  'chip.partial': '#FAB387',
  'chip.unwatched': '#45475A',
} as const;

export type ThemeTokens = typeof LIGHT_THEME | typeof DARK_THEME;