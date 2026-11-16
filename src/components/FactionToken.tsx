import { factionImage, getFaction } from '@/data/factions';
import { colorHex } from '@/data/colors';
import type { Player } from '@/lib/game';

/** Round faction icon ringed with the player's colour. */
export function FactionToken({ player, size = 40, className = '' }: { player: Player; size?: number; className?: string }) {
  const faction = getFaction(player.factionId);
  const hex = colorHex(player.color);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 ${className}`}
      style={{ width: size, height: size, boxShadow: `0 0 0 ${Math.max(2, size / 14)}px ${hex}, 0 0 ${size / 3}px ${hex}88` }}
      title={`${player.name}${faction ? ` — ${faction.name}` : ''}`}
    >
      {faction ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={factionImage(faction.id)} alt={faction.name} className="h-[80%] w-[80%] object-contain" />
      ) : (
        <span className="font-display text-xs font-bold" style={{ color: hex }}>
          {player.name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}
