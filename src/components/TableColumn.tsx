import { getObjective } from '@/data/objectives';
import { colorHex } from '@/data/colors';
import type { GameState } from '@/lib/game';

/** Hue of the blue Support for the Throne art; other colours are hue-rotated from it. */
const SUPPORT_BASE_HUE = 202;
const COLOR_HUE: Record<string, number> = {
  red: 0, blue: 202, green: 130, yellow: 52, purple: 275, orange: 26, pink: 325,
};

function supportFilter(color: string): string {
  if (color === 'black') return 'grayscale(1) brightness(.75)';
  const hue = COLOR_HUE[color] ?? SUPPORT_BASE_HUE;
  return `hue-rotate(${hue - SUPPORT_BASE_HUE}deg) saturate(1.25)`;
}

/** Beyond this many cards a hand is laid out in two columns. */
const HAND_SINGLE_COLUMN_MAX = 8;

/** Scored secrets, VP action cards and received Support for the Throne notes of one player. */
export function PlayerHand({ state, playerId }: { state: GameState; playerId: string }) {
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const secrets = state.secrets.filter((s) => s.playerId === playerId);
  const customs = state.objectives.filter((o) => o.kind === 'custom' && o.scoredBy.includes(playerId));
  const supports = state.supports.filter((s) => s.toId === playerId && byId.has(s.fromId));
  const extras = state.extras[playerId] ?? { custodians: 0, imperial: 0, other: 0 };
  const custodians = (extras.custodians ?? 0) > 0;
  const imperial = extras.imperial ?? 0;
  const other = extras.other ?? 0;
  const count = secrets.length + customs.length + supports.length + (custodians ? 1 : 0) + (imperial ? 1 : 0) + (other ? 1 : 0);
  if (count === 0) return null;

  // Every card must stay visible: rows shrink to share the available height
  // (titles drop to one line when short, see .stackcard-mini), and a very full
  // hand splits into two columns.
  const cols = count > HAND_SINGLE_COLUMN_MAX ? 2 : 1;
  const rows = Math.ceil(count / cols);

  return (
    <div
      className="hand"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 2.5vw))` }}
    >
      {custodians && (
        <div className="stackcard stackcard-mini stackcard-custodians">
          <div className="stackcard-body">
            <span className="stackcard-title">Custodians</span>
          </div>
        </div>
      )}
      {imperial !== 0 && (
        <div className="stackcard stackcard-mini stackcard-imperial">
          <div className="stackcard-body">
            <span className="stackcard-title">Imperial</span>
          </div>
          {imperial !== 1 && <span className="stackcard-pts">+{imperial}</span>}
        </div>
      )}
      {secrets.map((s) => (
        <div key={s.uid} className="stackcard stackcard-mini">
          <div className="stackcard-art" style={{ backgroundImage: 'url(/img/objectives/secret.webp)' }} />
          <div className="stackcard-body">
            <span className="stackcard-title text-red-200">{getObjective(s.defId)?.name ?? 'Secret Objective'}</span>
          </div>
        </div>
      ))}
      {customs.map((o) => (
        <div key={o.uid} className={`stackcard stackcard-mini stackcard-${o.cardType ?? 'other'}`}>
          {(o.cardType === 'action' || o.cardType === 'relic') && (
            <div className="stackcard-art" style={{ backgroundImage: `url(/img/objectives/${o.cardType}.webp)` }} />
          )}
          <div className="stackcard-body">
            <span className="stackcard-title">{o.name ?? 'Carta'}</span>
          </div>
          {o.points !== 1 && <span className="stackcard-pts">{o.points > 0 ? `+${o.points}` : o.points}</span>}
        </div>
      ))}
      {other !== 0 && (
        <div className="stackcard stackcard-mini stackcard-other">
          <div className="stackcard-body">
            <span className="stackcard-title">Outros</span>
          </div>
          <span className="stackcard-pts">{other > 0 ? `+${other}` : other}</span>
        </div>
      )}
      {supports.map((s) => {
        const from = byId.get(s.fromId)!;
        return (
          <div key={s.uid} className="stackcard stackcard-mini">
            <div
              className="stackcard-art"
              style={{ backgroundImage: 'url(/img/objectives/support.webp)', filter: supportFilter(from.color) }}
            />
            <div className="stackcard-body">
              <span className="stackcard-title">
                Support <span style={{ color: colorHex(from.color) }}>· {from.name}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
