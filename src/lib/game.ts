import { getObjective, KIND_POINTS } from '@/data/objectives';

export type Phase = 'strategy' | 'action' | 'status' | 'agenda';

export const PHASES: { id: Phase; label: string }[] = [
  { id: 'strategy', label: 'Estratégia' },
  { id: 'action', label: 'Ação' },
  { id: 'status', label: 'Status' },
  { id: 'agenda', label: 'Agenda' },
];

export function phaseLabel(p: Phase): string {
  return PHASES.find((x) => x.id === p)?.label ?? p;
}

export interface Player {
  id: string;
  name: string;
  factionId: string;
  color: string;
}

/** Type of a custom VP card (Imperial Rider is an action card). */
export type CustomCardType = 'action' | 'law' | 'relic' | 'other';

export const CUSTOM_CARD_TYPES: { id: CustomCardType; label: string }[] = [
  { id: 'action', label: 'Carta de ação' },
  { id: 'law', label: 'Lei' },
  { id: 'relic', label: 'Relíquia' },
  { id: 'other', label: 'Outro' },
];

export interface PublicObjective {
  uid: string;
  /** Catalogue id; null for a custom objective. */
  defId: string | null;
  kind: 'stage1' | 'stage2' | 'custom';
  /** Only for custom cards. */
  name?: string;
  text?: string;
  cardType?: CustomCardType;
  points: number;
  scoredBy: string[];
}

export interface ScoredSecret {
  uid: string;
  playerId: string;
  /** Catalogue id; null = "secret not listed". */
  defId: string | null;
}

export type ExtraKey = 'custodians' | 'imperial' | 'other';

export const EXTRAS: { key: ExtraKey; label: string; short: string }[] = [
  { key: 'custodians', label: 'Custódios (Mecatol)', short: 'Custódios' },
  { key: 'imperial', label: 'Imperial', short: 'Imperial' },
  { key: 'other', label: 'Outros (leis, relíquias…)', short: 'Outros' },
];

export type Extras = Record<ExtraKey, number>;

/** A Support for the Throne note: each player owns one (their colour) and may give it away. */
export interface Support {
  uid: string;
  /** Owner of the note (its colour). */
  fromId: string;
  /** Player who holds it and gains the point. */
  toId: string;
}

export interface Law {
  uid: string;
  name: string;
  /** Player elected by the law, if any. */
  electedPlayerId: string | null;
  /** Free text for planet / other elected outcome. */
  electedText: string;
}

export interface Clock {
  /** Host epoch ms when the clock was last started; null when paused. */
  runningSince: number | null;
  /** Elapsed ms accumulated before `runningSince`. */
  accumulated: number;
  /** Game-elapsed ms at which the current round started. */
  roundStart: number;
}

export interface GameState {
  v: 1;
  players: Player[];
  target: number;
  round: number;
  phase: Phase;
  speakerId: string | null;
  clock: Clock;
  objectives: PublicObjective[];
  secrets: ScoredSecret[];
  extras: Record<string, Extras>;
  supports: Support[];
  laws: Law[];
}

export const EMPTY_EXTRAS: Extras = { custodians: 0, imperial: 0, other: 0 };

export function initialState(): GameState {
  return {
    v: 1,
    players: [],
    target: 10,
    round: 1,
    phase: 'strategy',
    speakerId: null,
    clock: { runningSince: null, accumulated: 0, roundStart: 0 },
    objectives: [],
    secrets: [],
    extras: {},
    supports: [],
    laws: [],
  };
}

/** Fill fields added after a game was saved. */
export function normalizeState(s: GameState): GameState {
  // Older saves stored Imperial Rider as kind 'action' with a catalogue id.
  const objectives = (s.objectives ?? []).map((o) =>
    (o.kind as string) === 'action'
      ? { ...o, kind: 'custom' as const, defId: null, name: o.name ?? 'Imperial Rider', cardType: 'action' as const }
      : o,
  );
  return { ...initialState(), ...s, objectives, supports: s.supports ?? [], laws: s.laws ?? [] };
}

export type Action =
  | { type: 'setup'; players: Player[]; target: number; speakerId: string | null }
  | { type: 'updatePlayer'; player: Player }
  | { type: 'setTarget'; target: number }
  | { type: 'reveal'; defId: string }
  | { type: 'addCustom'; name: string; cardType: CustomCardType; points: number }
  | { type: 'removeObjective'; uid: string }
  | { type: 'toggleScore'; uid: string; playerId: string }
  | { type: 'addSecret'; playerId: string; defId: string | null }
  | { type: 'removeSecret'; uid: string }
  | { type: 'setExtra'; playerId: string; key: ExtraKey; value: number }
  | { type: 'giveSupport'; fromId: string; toId: string }
  | { type: 'removeSupport'; uid: string }
  | { type: 'addLaw'; name: string; electedPlayerId: string | null; electedText: string }
  | { type: 'removeLaw'; uid: string }
  | { type: 'setSpeaker'; playerId: string }
  | { type: 'setRound'; round: number }
  | { type: 'setPhase'; phase: Phase }
  | { type: 'nextPhase' }
  | { type: 'clockStart' }
  | { type: 'clockPause' }
  | { type: 'clockReset' }
  | { type: 'newGame' };

let uidCounter = 0;
export function uid(): string {
  uidCounter += 1;
  return `${Date.now().toString(36)}${uidCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function elapsed(clock: Clock, now: number): number {
  return clock.accumulated + (clock.runningSince !== null ? Math.max(0, now - clock.runningSince) : 0);
}

function startRound(state: GameState, round: number, now: number): GameState {
  return {
    ...state,
    round: Math.max(1, round),
    phase: 'strategy',
    clock: { ...state.clock, roundStart: elapsed(state.clock, now) },
  };
}

/** Pure reducer; `now` is the host clock so every timer stamp comes from one machine. */
export function reduce(prev: GameState, action: Action, now: number): GameState {
  const state = normalizeState(prev);
  switch (action.type) {
    case 'setup': {
      const extras: Record<string, Extras> = {};
      for (const p of action.players) extras[p.id] = { ...EMPTY_EXTRAS, ...state.extras[p.id] };
      return {
        ...state,
        players: action.players,
        target: action.target,
        speakerId: action.speakerId,
        extras,
        objectives: state.objectives.map((o) => ({
          ...o,
          scoredBy: o.scoredBy.filter((id) => action.players.some((p) => p.id === id)),
        })),
        secrets: state.secrets.filter((s) => action.players.some((p) => p.id === s.playerId)),
        supports: state.supports.filter(
          (s) => action.players.some((p) => p.id === s.fromId) && action.players.some((p) => p.id === s.toId),
        ),
        laws: state.laws.map((l) =>
          l.electedPlayerId && !action.players.some((p) => p.id === l.electedPlayerId) ? { ...l, electedPlayerId: null } : l,
        ),
      };
    }
    case 'updatePlayer':
      return { ...state, players: state.players.map((p) => (p.id === action.player.id ? action.player : p)) };
    case 'setTarget':
      return { ...state, target: action.target };
    case 'reveal': {
      const def = getObjective(action.defId);
      if (!def || def.kind === 'secret' || state.objectives.some((o) => o.defId === def.id)) return state;
      return {
        ...state,
        objectives: [
          ...state.objectives,
          { uid: uid(), defId: def.id, kind: def.kind, points: KIND_POINTS[def.kind], scoredBy: [] },
        ],
      };
    }
    case 'addCustom':
      return {
        ...state,
        objectives: [
          ...state.objectives,
          { uid: uid(), defId: null, kind: 'custom', name: action.name, cardType: action.cardType, points: action.points, scoredBy: [] },
        ],
      };
    case 'removeObjective':
      return { ...state, objectives: state.objectives.filter((o) => o.uid !== action.uid) };
    case 'toggleScore':
      return {
        ...state,
        objectives: state.objectives.map((o) =>
          o.uid !== action.uid
            ? o
            : {
                ...o,
                scoredBy: o.scoredBy.includes(action.playerId)
                  ? o.scoredBy.filter((id) => id !== action.playerId)
                  : [...o.scoredBy, action.playerId],
              },
        ),
      };
    case 'addSecret':
      if (action.defId && state.secrets.some((s) => s.defId === action.defId)) return state;
      return { ...state, secrets: [...state.secrets, { uid: uid(), playerId: action.playerId, defId: action.defId }] };
    case 'removeSecret':
      return { ...state, secrets: state.secrets.filter((s) => s.uid !== action.uid) };
    case 'setExtra': {
      const extras = { ...state.extras };
      if (action.key === 'custodians' && action.value > 0) {
        // Only one player can take the Custodians token.
        for (const id of Object.keys(extras)) extras[id] = { ...extras[id], custodians: 0 };
      }
      const min = action.key === 'other' ? -20 : 0;
      const max = action.key === 'custodians' ? 1 : 20;
      extras[action.playerId] = {
        ...EMPTY_EXTRAS,
        ...extras[action.playerId],
        [action.key]: Math.min(max, Math.max(min, action.value)),
      };
      return { ...state, extras };
    }
    case 'giveSupport':
      if (action.fromId === action.toId) return state;
      // A note can only be in one play area at a time.
      return {
        ...state,
        supports: [
          ...state.supports.filter((s) => s.fromId !== action.fromId),
          { uid: uid(), fromId: action.fromId, toId: action.toId },
        ],
      };
    case 'removeSupport':
      return { ...state, supports: state.supports.filter((s) => s.uid !== action.uid) };
    case 'addLaw':
      return {
        ...state,
        laws: [...state.laws, { uid: uid(), name: action.name, electedPlayerId: action.electedPlayerId, electedText: action.electedText }],
      };
    case 'removeLaw':
      return { ...state, laws: state.laws.filter((l) => l.uid !== action.uid) };
    case 'setSpeaker':
      return { ...state, speakerId: action.playerId };
    case 'setRound':
      return action.round === state.round ? state : startRound(state, action.round, now);
    case 'setPhase':
      return { ...state, phase: action.phase };
    case 'nextPhase': {
      const custodiansTaken = Object.values(state.extras).some((e) => e.custodians > 0);
      if (state.phase === 'strategy') return { ...state, phase: 'action' };
      if (state.phase === 'action') return { ...state, phase: 'status' };
      if (state.phase === 'status' && custodiansTaken) return { ...state, phase: 'agenda' };
      return startRound(state, state.round + 1, now);
    }
    case 'clockStart':
      return state.clock.runningSince !== null ? state : { ...state, clock: { ...state.clock, runningSince: now } };
    case 'clockPause':
      return state.clock.runningSince === null
        ? state
        : { ...state, clock: { ...state.clock, runningSince: null, accumulated: elapsed(state.clock, now) } };
    case 'clockReset':
      return { ...state, clock: { runningSince: null, accumulated: 0, roundStart: 0 } };
    case 'newGame':
      return { ...initialState(), players: state.players, target: state.target, speakerId: state.speakerId,
        extras: Object.fromEntries(state.players.map((p) => [p.id, { ...EMPTY_EXTRAS }])), supports: [], laws: [] };
  }
}

export interface ScoreLine {
  player: Player;
  total: number;
  publicPts: number;
  secretPts: number;
  supportPts: number;
  extras: Extras;
}

export function scores(state: GameState): ScoreLine[] {
  return state.players.map((player) => {
    const publicPts = state.objectives
      .filter((o) => o.scoredBy.includes(player.id))
      .reduce((sum, o) => sum + o.points, 0);
    const secretPts = state.secrets.filter((s) => s.playerId === player.id).length;
    const supportPts = (state.supports ?? []).filter((s) => s.toId === player.id).length;
    const stored = state.extras[player.id] ?? {};
    const extras: Extras = {
      custodians: stored.custodians ?? 0,
      imperial: stored.imperial ?? 0,
      other: stored.other ?? 0,
    };
    const total = publicPts + secretPts + supportPts + extras.custodians + extras.imperial + extras.other;
    return { player, total, publicPts, secretPts, supportPts, extras };
  });
}

export function formatDuration(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newRoomCode(): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}
