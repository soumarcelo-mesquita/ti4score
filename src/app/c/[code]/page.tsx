'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useControllerGame } from '@/lib/sync';
import { useNow } from '@/lib/useNow';
import {
  elapsed, formatDuration, normalizeCode, scores, uid, CUSTOM_CARD_TYPES,
  type CustomCardType,
  type Action, type ExtraKey, type GameState, type Player, type PublicObjective,
} from '@/lib/game';
import { OBJECTIVES, getObjective, type ObjectiveKind } from '@/data/objectives';
import { FACTIONS, getFaction } from '@/data/factions';
import { PLAYER_COLORS, colorHex } from '@/data/colors';
import { FactionToken } from '@/components/FactionToken';
import { ObjectiveCard } from '@/components/ObjectiveCard';

type Tab = 'pontos' | 'objetivos' | 'partida';
type Dispatch = (a: Action) => void;

export default function ControllerPage() {
  const params = useParams<{ code: string }>();
  const code = normalizeCode(params.code ?? '');
  const { state, dispatch, status, skew } = useControllerGame(code);
  const [tab, setTab] = useState<Tab>('pontos');
  const [editingPlayers, setEditingPlayers] = useState(false);

  if (!state) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-2xl font-bold tracking-[0.3em] text-amber-300">{code}</p>
        <p className="text-slate-400">
          {status === 'connecting' ? 'Conectando…' : 'Procurando a TV… Deixe a página do placar aberta na TV.'}
        </p>
        <Link href="/" className="text-sm text-sky-400 underline">Voltar</Link>
      </main>
    );
  }

  if (state.players.length === 0 || editingPlayers) {
    return (
      <SetupForm
        state={state}
        onCancel={state.players.length ? () => setEditingPlayers(false) : undefined}
        onSubmit={(a) => {
          dispatch(a);
          setEditingPlayers(false);
        }}
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col pb-20">
      <Header state={state} code={code} status={status} skew={skew} />
      <div className="flex-1 px-3 py-3">
        {tab === 'pontos' && <PointsTab state={state} dispatch={dispatch} />}
        {tab === 'objetivos' && <ObjectivesTab state={state} dispatch={dispatch} />}
        {tab === 'partida' && <GameTab state={state} dispatch={dispatch} skew={skew} onEditPlayers={() => setEditingPlayers(true)} />}
      </div>
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-3 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
        {([
          ['pontos', 'Pontos'],
          ['objetivos', 'Objetivos'],
          ['partida', 'Partida'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`font-display py-4 text-xs font-bold uppercase tracking-widest ${tab === id ? 'text-amber-300' : 'text-slate-500'}`}
          >
            {label}
          </button>
        ))}
      </nav>
    </main>
  );
}

/* ───────────── Header ───────────── */

function Header({ state, code, status, skew }: { state: GameState; code: string; status: string; skew: number }) {
  const lines = scores(state);
  const dot = status === 'online' ? 'bg-emerald-400' : status === 'connecting' ? 'bg-amber-400' : 'bg-red-500';
  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-3 pb-2 pt-3 backdrop-blur">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span className="font-display tracking-[0.25em] text-slate-300">{code}</span>
          {status === 'offline' && <span className="text-red-400">TV desconectada</span>}
        </span>
        <span>
          Rodada {state.round} · <Clock state={state} skew={skew} />
        </span>
      </div>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
        {lines.map((l) => (
          <div key={l.player.id} className="flex shrink-0 items-center gap-1.5">
            <FactionToken player={l.player} size={26} />
            <span className="font-display text-lg font-black" style={{ color: colorHex(l.player.color) }}>
              {l.total}
            </span>
          </div>
        ))}
        <span className="ml-auto shrink-0 self-center text-xs text-slate-500">meta {state.target}</span>
      </div>
    </header>
  );
}

function Clock({ state, skew }: { state: GameState; skew: number }) {
  const now = useNow(1000);
  return <span className="tabular-nums">{formatDuration(elapsed(state.clock, now - skew))}</span>;
}

/* ───────────── Pontos ───────────── */

function Stepper({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        className="h-9 w-9 rounded-lg bg-slate-800 text-lg font-bold text-slate-200 disabled:opacity-30"
      >
        −
      </button>
      <span className="font-display w-7 text-center text-lg font-bold tabular-nums">{value}</span>
      <button onClick={() => onChange(value + 1)} className="h-9 w-9 rounded-lg bg-slate-800 text-lg font-bold text-slate-200">
        +
      </button>
    </div>
  );
}

function PointsTab({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const lines = scores(state);
  const [secretFor, setSecretFor] = useState<Player | null>(null);
  const [supportFor, setSupportFor] = useState<Player | null>(null);
  const playerById = new Map(state.players.map((x) => [x.id, x]));
  const setExtra = (playerId: string, key: ExtraKey, value: number) => dispatch({ type: 'setExtra', playerId, key, value });

  return (
    <div className="flex flex-col gap-3">
      {lines.map((l) => {
        const p = l.player;
        const hex = colorHex(p.color);
        const mySecrets = state.secrets.filter((s) => s.playerId === p.id);
        return (
          <section key={p.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3" style={{ borderLeft: `4px solid ${hex}` }}>
            <div className="flex items-center gap-3">
              <FactionToken player={p} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{p.name}</p>
                <p className="truncate text-xs text-slate-400">
                  {getFaction(p.factionId)?.name} · públicos {l.publicPts}
                </p>
              </div>
              <span className="font-display text-3xl font-black" style={{ color: hex }}>{l.total}</span>
            </div>

            <div className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-slate-300">Secretos</span>
                {mySecrets.map((s) => (
                  <button
                    key={s.uid}
                    onClick={() => confirm(`Remover "${getObjective(s.defId)?.name ?? 'Secreto'}" de ${p.name}?`) && dispatch({ type: 'removeSecret', uid: s.uid })}
                    className="rounded-md bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-300"
                  >
                    {getObjective(s.defId)?.name ?? 'Secreto'} ✕
                  </button>
                ))}
                {mySecrets.length < 3 && (
                  <button onClick={() => setSecretFor(p)} className="rounded-md border border-red-500/40 px-2 py-1 text-xs font-semibold text-red-300">
                    + Secreto
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-slate-300">Apoio ao Trono</span>
                {state.supports
                  .filter((s) => s.toId === p.id)
                  .map((s) => {
                    const from = playerById.get(s.fromId);
                    if (!from) return null;
                    return (
                      <button
                        key={s.uid}
                        onClick={() => confirm(`Devolver o Apoio ao Trono de ${from.name}?`) && dispatch({ type: 'removeSupport', uid: s.uid })}
                        className="flex items-center gap-1 rounded-md py-0.5 pl-0.5 pr-2 text-xs font-semibold text-white"
                        style={{ background: `${colorHex(from.color)}33` }}
                      >
                        <FactionToken player={from} size={20} /> {from.name} ✕
                      </button>
                    );
                  })}
                <button onClick={() => setSupportFor(p)} className="rounded-md border border-sky-500/40 px-2 py-1 text-xs font-semibold text-sky-300">
                  + Apoio
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  role="radio"
                  aria-checked={l.extras.custodians > 0}
                  onClick={() => setExtra(p.id, 'custodians', l.extras.custodians ? 0 : 1)}
                  className="flex items-center gap-2 text-slate-300"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      l.extras.custodians ? 'border-amber-400' : 'border-slate-600'
                    }`}
                  >
                    {l.extras.custodians > 0 && <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />}
                  </span>
                  Custódios
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-slate-300">Imperial</span>
                  <Stepper value={l.extras.imperial} onChange={(v) => setExtra(p.id, 'imperial', v)} />
                </div>
              </div>
              <Row label="Outros (leis, relíquias…)">
                <Stepper value={l.extras.other} min={-20} onChange={(v) => setExtra(p.id, 'other', v)} />
              </Row>
            </div>
          </section>
        );
      })}

      {supportFor && (
        <Sheet title={`Apoio ao Trono para ${supportFor.name}`} onClose={() => setSupportFor(null)}>
          <p className="mb-3 text-sm text-slate-400">De quem é a nota (cor) que {supportFor.name} recebeu?</p>
          <div className="flex flex-col gap-2">
            {state.players
              .filter((x) => x.id !== supportFor.id)
              .map((from) => {
                const holder = state.supports.find((s) => s.fromId === from.id);
                const holderName = holder ? playerById.get(holder.toId)?.name : null;
                const already = holder?.toId === supportFor.id;
                return (
                  <button
                    key={from.id}
                    disabled={already}
                    onClick={() => {
                      dispatch({ type: 'giveSupport', fromId: from.id, toId: supportFor.id });
                      setSupportFor(null);
                    }}
                    className="flex items-center gap-3 rounded-lg bg-slate-900 px-3 py-2.5 text-left disabled:opacity-40"
                    style={{ borderLeft: `4px solid ${colorHex(from.color)}` }}
                  >
                    <FactionToken player={from} size={30} />
                    <span className="flex-1 font-semibold text-white">{from.name}</span>
                    {holderName && <span className="text-xs text-slate-400">{already ? 'já recebeu' : `está com ${holderName}`}</span>}
                  </button>
                );
              })}
          </div>
        </Sheet>
      )}

      {secretFor && (
        <Picker
          title={`Secreto de ${secretFor.name}`}
          kind="secret"
          exclude={state.secrets.map((s) => s.defId).filter((x): x is string => !!x)}
          extraOption="Secreto não listado"
          onPick={(defId) => {
            dispatch({ type: 'addSecret', playerId: secretFor.id, defId });
            setSecretFor(null);
          }}
          onClose={() => setSecretFor(null)}
        />
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-300">{label}</span>
      {children}
    </div>
  );
}

/* ───────────── Objetivos ───────────── */

function ObjectivesTab({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const [picker, setPicker] = useState<ObjectiveKind | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const groups: { kind: PublicObjective['kind']; label: string; color: string }[] = [
    { kind: 'stage1', label: 'Estágio I', color: 'text-amber-400' },
    { kind: 'stage2', label: 'Estágio II', color: 'text-blue-400' },
    { kind: 'custom', label: 'Cartas personalizadas', color: 'text-teal-400' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => {
        const list = state.objectives.filter((o) => o.kind === g.kind);
        if (g.kind === 'custom' && list.length === 0) return null;
        return (
          <section key={g.kind}>
            <h2 className={`font-display mb-2 text-xs font-bold uppercase tracking-[0.3em] ${g.color}`}>{g.label}</h2>
            <div className="flex flex-col gap-2">
              {list.length === 0 && <p className="text-sm text-slate-500">Nenhum revelado ainda.</p>}
              {list.map((o) => (
                <ObjectiveRow key={o.uid} o={o} players={state.players} dispatch={dispatch} />
              ))}
            </div>
          </section>
        );
      })}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setPicker('stage1')} className="rounded-lg bg-amber-500 py-3 font-semibold text-slate-950">
          Revelar Estágio I
        </button>
        <button onClick={() => setPicker('stage2')} className="rounded-lg bg-blue-500 py-3 font-semibold text-white">
          Revelar Estágio II
        </button>
        <button onClick={() => setCustomOpen(true)} className="col-span-2 rounded-lg border border-teal-500/50 py-3 font-semibold text-teal-300">
          Personalizado
        </button>
      </div>

      {picker && (
        <Picker
          title={picker === 'stage1' ? 'Revelar Estágio I' : 'Revelar Estágio II'}
          kind={picker}
          exclude={state.objectives.map((o) => o.defId).filter((x): x is string => !!x)}
          onPick={(defId) => {
            if (defId) dispatch({ type: 'reveal', defId });
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {customOpen && (
        <CustomObjectiveForm
          onClose={() => setCustomOpen(false)}
          onSubmit={(name, cardType, points) => {
            dispatch({ type: 'addCustom', name, cardType, points });
            setCustomOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ObjectiveRow({ o, players, dispatch }: { o: PublicObjective; players: Player[]; dispatch: Dispatch }) {
  const def = getObjective(o.defId);
  const name = def?.name ?? o.name ?? 'Objetivo';
  const accent = o.kind === 'stage1' ? 'border-amber-500/40' : o.kind === 'stage2' ? 'border-blue-500/40' : 'border-teal-500/40';
  const typeLabel = CUSTOM_CARD_TYPES.find((t) => t.id === o.cardType)?.label;
  return (
    <div className={`rounded-xl border ${accent} bg-slate-900/70 p-3`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold uppercase text-white">
            {name} <span className="text-slate-400">· {o.points} PV</span>
          </p>
          <p className="mt-0.5 text-sm text-slate-400">{def?.text ?? typeLabel ?? o.text}</p>
        </div>
        <button
          onClick={() => confirm(`Remover "${name}" da mesa?`) && dispatch({ type: 'removeObjective', uid: o.uid })}
          className="px-1 text-slate-600"
          aria-label="Remover"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {players.map((p) => {
          const on = o.scoredBy.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => dispatch({ type: 'toggleScore', uid: o.uid, playerId: p.id })}
              className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm font-semibold transition ${
                on ? 'bg-slate-100 text-slate-900' : 'bg-slate-800/80 text-slate-400 opacity-70'
              }`}
            >
              <FactionToken player={p} size={26} />
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Picker({
  title, kind, exclude, extraOption, onPick, onClose,
}: {
  title: string;
  kind: ObjectiveKind;
  exclude: string[];
  extraOption?: string;
  onPick: (defId: string | null) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const options = useMemo(
    () =>
      OBJECTIVES.filter(
        (o) => o.kind === kind && !exclude.includes(o.id) && `${o.name} ${o.text}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [kind, exclude, q],
  );
  const previewDef = getObjective(preview);

  return (
    <Sheet title={title} onClose={onClose}>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar…"
        className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-sky-400"
      />
      {previewDef ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-56">
            <ObjectiveCard kind={previewDef.kind} def={previewDef} points={previewDef.kind === 'stage2' ? 2 : 1} />
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <button onClick={() => setPreview(null)} className="rounded-lg border border-slate-700 py-3 text-slate-300">
              Voltar
            </button>
            <button onClick={() => onPick(previewDef.id)} className="rounded-lg bg-emerald-500 py-3 font-semibold text-slate-950">
              Confirmar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {extraOption && (
            <button onClick={() => onPick(null)} className="rounded-lg border border-dashed border-slate-600 px-3 py-3 text-left text-slate-300">
              {extraOption}
            </button>
          )}
          {options.map((o) => (
            <button key={o.id} onClick={() => setPreview(o.id)} className="rounded-lg bg-slate-900 px-3 py-2.5 text-left">
              <p className="font-display text-sm font-bold uppercase text-white">
                {o.name}
                {o.kind === 'secret' && (
                  <span className={`ml-2 text-[10px] ${o.phase === 'action' ? 'text-red-400' : o.phase === 'agenda' ? 'text-sky-300' : 'text-slate-400'}`}>
                    {o.phase === 'action' ? 'Ação' : o.phase === 'agenda' ? 'Agenda' : 'Status'}
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-400">{o.text}</p>
            </button>
          ))}
          {options.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Nada encontrado.</p>}
        </div>
      )}
    </Sheet>
  );
}

const CUSTOM_PRESETS: { name: string; cardType: CustomCardType; points: number }[] = [
  { name: 'Imperial Rider', cardType: 'action', points: 1 },
];

function CustomObjectiveForm({
  onSubmit, onClose,
}: {
  onSubmit: (name: string, cardType: CustomCardType, points: number) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [cardType, setCardType] = useState<CustomCardType>('action');
  const [points, setPoints] = useState(1);
  return (
    <Sheet title="Carta personalizada" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {CUSTOM_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setName(p.name);
                setCardType(p.cardType);
                setPoints(p.points);
              }}
              className="rounded-full border border-red-500/50 px-3 py-1.5 text-sm font-semibold text-red-300"
            >
              {p.name}
            </button>
          ))}
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Título da carta" className={inputCls} />
        <div>
          <p className="mb-1.5 text-sm text-slate-300">Tipo</p>
          <div className="grid grid-cols-2 gap-2">
            {CUSTOM_CARD_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setCardType(t.id)}
                className={`rounded-lg py-2.5 text-sm font-semibold ${cardType === t.id ? 'bg-teal-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <Row label="Pontos">
          <Stepper value={points} min={-5} onChange={(v) => setPoints(v === 0 ? (points > 0 ? -1 : 1) : Math.min(10, v))} />
        </Row>
        <button
          disabled={!name.trim()}
          onClick={() => onSubmit(name.trim(), cardType, points)}
          className="rounded-lg bg-teal-500 py-3 font-semibold text-slate-950 disabled:opacity-40"
        >
          Adicionar
        </button>
      </div>
    </Sheet>
  );
}

/* ───────────── Partida ───────────── */

function GameTab({ state, dispatch, skew, onEditPlayers }: { state: GameState; dispatch: Dispatch; skew: number; onEditPlayers: () => void }) {
  const now = useNow(1000) - skew;
  const running = state.clock.runningSince !== null;
  const total = elapsed(state.clock, now);
  return (
    <div className="flex flex-col gap-4">
      <Card title="Rodada">
        <Row label="Rodada atual">
          <Stepper value={state.round} min={1} onChange={(round) => dispatch({ type: 'setRound', round })} />
        </Row>
        <button
          onClick={() => dispatch({ type: 'setRound', round: state.round + 1 })}
          className="mt-3 w-full rounded-lg bg-amber-500 py-3 font-semibold text-slate-950"
        >
          Próxima rodada →
        </button>
      </Card>

      <Card title="Tempo de jogo">
        <p className="font-display text-center text-4xl font-black tabular-nums text-white">{formatDuration(total)}</p>
        <p className="mb-3 text-center text-xs text-slate-500">rodada {formatDuration(total - state.clock.roundStart)}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => dispatch({ type: running ? 'clockPause' : 'clockStart' })}
            className={`rounded-lg py-3 font-semibold ${running ? 'bg-slate-700 text-white' : 'bg-emerald-500 text-slate-950'}`}
          >
            {running ? 'Pausar' : total > 0 ? 'Continuar' : 'Iniciar'}
          </button>
          <button
            onClick={() => confirm('Zerar o cronômetro?') && dispatch({ type: 'clockReset' })}
            className="rounded-lg border border-slate-700 py-3 text-slate-300"
          >
            Zerar
          </button>
        </div>
      </Card>

      <Card title="Configuração">
        <Row label="Meta de pontos">
          <div className="flex gap-1">
            {[10, 14].map((t) => (
              <button
                key={t}
                onClick={() => dispatch({ type: 'setTarget', target: t })}
                className={`h-9 rounded-lg px-4 font-semibold ${state.target === t ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </Row>
        <button onClick={onEditPlayers} className="mt-4 w-full rounded-lg border border-slate-700 py-3 text-slate-200">
          Editar jogadores
        </button>
        <button
          onClick={() => confirm('Começar uma nova partida com os mesmos jogadores? Pontos, objetivos e tempo serão apagados.') && dispatch({ type: 'newGame' })}
          className="mt-2 w-full rounded-lg border border-red-500/40 py-3 text-red-300"
        >
          Nova partida
        </button>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <h2 className="font-display mb-3 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-white">{title}</h2>
        <button onClick={onClose} className="px-2 text-2xl text-slate-400" aria-label="Fechar">
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );
}

/* ───────────── Setup ───────────── */

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-sky-400';

function SetupForm({ state, onSubmit, onCancel }: { state: GameState; onSubmit: (a: Action) => void; onCancel?: () => void }) {
  const [players, setPlayers] = useState<Player[]>(() =>
    state.players.length
      ? state.players
      : Array.from({ length: 6 }, (_, i) => ({ id: uid(), name: '', factionId: '', color: PLAYER_COLORS[i].id })),
  );
  const [target, setTarget] = useState(state.target);

  const setCount = (n: number) =>
    setPlayers((prev) => {
      if (n <= prev.length) return prev.slice(0, n);
      const used = new Set(prev.map((p) => p.color));
      const extra = Array.from({ length: n - prev.length }, () => {
        const color = PLAYER_COLORS.find((c) => !used.has(c.id))?.id ?? 'black';
        used.add(color);
        return { id: uid(), name: '', factionId: '', color };
      });
      return [...prev, ...extra];
    });

  const update = (i: number, patch: Partial<Player>) =>
    setPlayers((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const ready = players.every((p) => p.name.trim() && p.factionId);
  const dupFactions = new Set(players.map((p) => p.factionId).filter((f, i, a) => f && a.indexOf(f) !== i));

  return (
    <main className="flex flex-col gap-4 px-3 py-4 pb-10">
      <h1 className="font-display text-lg font-bold uppercase tracking-widest text-white">Jogadores</h1>
      <Row label="Quantidade">
        <Stepper value={players.length} min={3} onChange={(n) => setCount(Math.min(8, n))} />
      </Row>
      <Row label="Meta">
        <div className="flex gap-1">
          {[10, 14].map((t) => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className={`h-9 rounded-lg px-4 font-semibold ${target === t ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
            >
              {t} PV
            </button>
          ))}
        </div>
      </Row>

      {players.map((p, i) => (
        <section key={p.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3" style={{ borderLeft: `4px solid ${colorHex(p.color)}` }}>
          <div className="flex items-center gap-2">
            <span className="font-display w-5 text-sm font-bold text-slate-500">{i + 1}</span>
            <input value={p.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Nome" className={inputCls} />
          </div>
          <select
            value={p.factionId}
            onChange={(e) => update(i, { factionId: e.target.value })}
            className={`${inputCls} mt-2 ${dupFactions.has(p.factionId) ? 'border-red-500' : ''}`}
          >
            <option value="">Facção…</option>
            {FACTIONS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
                {f.set === 'pok' ? ' (PoK)' : f.set === 'te' ? ' (TE)' : ''}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-1.5">
            {PLAYER_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => update(i, { color: c.id })}
                title={c.label}
                aria-label={c.label}
                className={`h-7 flex-1 rounded-md ${p.color === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-50'}`}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </section>
      ))}

      <button
        disabled={!ready}
        onClick={() =>
          onSubmit({
            type: 'setup',
            players: players.map((p) => ({ ...p, name: p.name.trim() })),
            target,
            speakerId: null,
          })
        }
        className="rounded-lg bg-amber-500 py-3.5 font-semibold text-slate-950 disabled:opacity-40"
      >
        {state.players.length ? 'Salvar' : 'Começar partida'}
      </button>
      {!ready && <p className="text-center text-xs text-slate-500">Preencha nome e facção de todos.</p>}
      {onCancel && (
        <button onClick={onCancel} className="py-2 text-sm text-slate-400">
          Cancelar
        </button>
      )}
    </main>
  );
}
