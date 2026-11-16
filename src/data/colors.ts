export interface PlayerColor {
  id: string;
  label: string;
  hex: string;
}

/** The eight plastic colours of TI4 (+PoK). */
export const PLAYER_COLORS: PlayerColor[] = [
  { id: 'red', label: 'Vermelho', hex: '#ef4444' },
  { id: 'blue', label: 'Azul', hex: '#3b82f6' },
  { id: 'green', label: 'Verde', hex: '#22c55e' },
  { id: 'yellow', label: 'Amarelo', hex: '#facc15' },
  { id: 'purple', label: 'Roxo', hex: '#a855f7' },
  { id: 'black', label: 'Preto', hex: '#94a3b8' },
  { id: 'orange', label: 'Laranja', hex: '#f97316' },
  { id: 'pink', label: 'Rosa', hex: '#ec4899' },
];

export function colorHex(id: string): string {
  return PLAYER_COLORS.find((c) => c.id === id)?.hex ?? '#94a3b8';
}
