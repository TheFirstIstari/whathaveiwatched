const PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

export function avatarColor(identityHex: string): string {
  const sum = identityHex.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTE[sum % PALETTE.length];
}