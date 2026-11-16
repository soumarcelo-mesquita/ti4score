'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useHostGame } from '@/lib/sync';
import { useNow } from '@/lib/useNow';
import { elapsed, formatDuration, normalizeCode, PHASES, scores, EXTRAS, type GameState, type ScoreLine } from '@/lib/game';
import { getObjective } from '@/data/objectives';
import { getFaction } from '@/data/factions';
import { colorHex } from '@/data/colors';
import { FactionToken } from '@/components/FactionToken';
import { ObjectiveCard, EmptySlot } from '@/components/ObjectiveCard';
import { QrCode } from '@/components/QrCode';

export default function TvPage() {
  const params = useParams<{ code: string }>();
  const code = normalizeCode(params.code ?? '');
  const { state, status } = useHostGame(code);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window is only available after mount
    setOrigin(window.location.origin);
    try {
      localStorage.setItem('ti4score:lastCode', code);
    } catch {
      /* ignore */
    }
  }, [code]);

  const controlUrl = origin ? `${origin}/c/${code}` : '';

  if (!state) return <main className="flex-1 bg-black" />;

  if (state.players.length === 0) {
    return (
      <main className="starfield flex h-screen flex-col items-center justify-center gap-8 overflow-hidden text-center">
        <p className="font-display text-xl uppercase tracking-[0.5em] text-amber-400/80">Twilight Imperium IV</p>
        <h1 className="font-display text-6xl font-black text-white">Placar Galáctico</h1>
        {controlUrl && <QrCode value={controlUrl} size={300} />}
        <div>
          <p className="text-2xl text-slate-300">Escaneie com o celular para configurar a partida</p>
          <p className="mt-2 text-lg text-slate-500">{controlUrl}</p>
          <p className="font-display mt-4 text-5xl font-bold tracking-[0.3em] text-amber-300">{code}</p>
        </div>
        <StatusDot status={status} />
      </main>
    );
  }

  return <Scoreboard state={state} code={code} controlUrl={controlUrl} status={status} />;
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'online' ? 'bg-emerald-400' : status === 'connecting' ? 'bg-amber-400' : 'bg-red-500';
  const label = status === 'online' ? 'conectado' : status === 'connecting' ? 'conectando…' : 'sem conexão';
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-400">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} /> {label}
    </span>
  );
}

function Scoreboard({ state, code, controlUrl, status }: { state: GameState; code: string; controlUrl: string; status: string }) {
  const now = useNow(1000);
  const lines = useMemo(() => scores(state), [state]);
  const ranked = useMemo(
    () =>
      lines
        .map((l, seat) => ({ ...l, seat }))
        .sort((a, b) => b.total - a.total || a.seat - b.seat),
    [lines],
  );
  const total = elapsed(state.clock, now);
  const roundTime = total - state.clock.roundStart;
  const running = state.clock.runningSince !== null;
  const playersById = new Map(state.players.map((p) => [p.id, p]));

  const stage1 = state.objectives.filter((o) => o.kind === 'stage1');
  const stage2 = state.objectives.filter((o) => o.kind === 'stage2');
  const custom = state.objectives.filter((o) => o.kind === 'custom');
  const cols = Math.max(5, stage1.length, stage2.length);

  const renderRow = (list: typeof stage1, kind: 'stage1' | 'stage2' | 'custom', slots: number) => (
    <div className="grid min-h-0 flex-1 gap-[1vw]" style={{ gridTemplateColumns: `repeat(${slots}, minmax(0, 1fr))` }}>
      {list.map((o) => (
        <div key={o.uid} className="flex min-h-0 items-center justify-center">
          <ObjectiveCard
            kind={kind}
            def={getObjective(o.defId)}
            name={o.name}
            text={o.text}
            points={o.points}
            scorers={o.scoredBy.map((id) => playersById.get(id)).filter((p) => !!p)}
            className="h-full"
          />
        </div>
      ))}
      {Array.from({ length: Math.max(0, slots - list.length) }).map((_, i) => (
        <div key={`e${i}`} className="flex min-h-0 items-center justify-center">
          {kind !== 'custom' && <EmptySlot label={kind === 'stage1' ? 'I' : 'II'} />}
        </div>
      ))}
    </div>
  );

  return (
    <main className="starfield flex h-screen flex-col gap-[1.2vh] overflow-hidden px-[1.5vw] py-[1.5vh]">
      {/* Header */}
      <header className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div>
            <p className="font-display text-[1.1vw] uppercase tracking-[0.35em] text-slate-500">Rodada</p>
            <p className="font-display text-[3.4vw] font-black leading-none text-white">{state.round}</p>
          </div>
          <div className="flex gap-2">
            {PHASES.map((p) => (
              <span
                key={p.id}
                className={`font-display rounded-md px-[0.9vw] py-[0.6vh] text-[1.05vw] font-bold uppercase ${
                  state.phase === p.id ? 'bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,.6)]' : 'text-slate-600'
                }`}
              >
                {p.label}
              </span>
            ))}
          </div>
        </div>

        <div className="text-center">
          <p className={`font-display text-[3.4vw] font-black leading-none tabular-nums ${running ? 'text-white' : 'text-slate-500'}`}>
            {formatDuration(total)}
          </p>
          <p className="font-display text-[1vw] uppercase tracking-[0.2em] text-slate-500">
            {running ? `rodada ${formatDuration(roundTime)}` : 'pausado'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-display text-[1.1vw] uppercase tracking-[0.3em] text-slate-500">Meta</p>
            <p className="font-display text-[2.4vw] font-black leading-none text-amber-300">{state.target} PV</p>
            <p className="font-display mt-1 text-[0.9vw] tracking-[0.3em] text-slate-500">{code}</p>
          </div>
          {controlUrl && <QrCode value={controlUrl} size={Math.round(typeof window !== 'undefined' ? window.innerWidth * 0.05 : 90)} />}
        </div>
      </header>

      {/* Victory track */}
      <VictoryTrack lines={lines} target={state.target} />

      {/* Body */}
      <div className="flex min-h-0 flex-1 gap-[1.5vw]">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-[1vh]">
          <RowLabel color="text-amber-400">Estágio I</RowLabel>
          {renderRow(stage1, 'stage1', cols)}
          <RowLabel color="text-blue-400">Estágio II</RowLabel>
          {renderRow(stage2, 'stage2', cols)}
          {custom.length > 0 && (
            <>
              <RowLabel color="text-teal-400">Outros</RowLabel>
              {renderRow(custom, 'custom', Math.max(cols, custom.length))}
            </>
          )}
        </section>

        <aside className="flex w-[29vw] min-h-0 flex-col gap-[0.8vh]">
          {ranked.map((l, i) => (
            <StandingRow key={l.player.id} line={l} rank={i + 1} state={state} />
          ))}
          <div className="mt-auto flex justify-end">
            <StatusDot status={status} />
          </div>
        </aside>
      </div>
    </main>
  );
}

function RowLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return <h2 className={`font-display text-[1vw] font-bold uppercase tracking-[0.35em] ${color}`}>{children}</h2>;
}

function VictoryTrack({ lines, target }: { lines: ScoreLine[]; target: number }) {
  const cells = Array.from({ length: target + 1 }, (_, i) => i);
  return (
    <div className="grid gap-[0.3vw]" style={{ gridTemplateColumns: `repeat(${target + 1}, minmax(0, 1fr))` }}>
      {cells.map((n) => {
        const here = lines.filter((l) => Math.min(target, Math.max(0, l.total)) === n);
        const isGoal = n === target;
        return (
          <div
            key={n}
            className={`relative flex h-[9vh] flex-col items-center justify-center rounded-md border ${
              isGoal ? 'border-amber-400/70 bg-amber-500/10' : 'border-slate-700/60 bg-slate-900/60'
            }`}
          >
            <span
              className={`font-display absolute left-[0.4vw] top-[0.2vh] text-[1vw] font-bold ${isGoal ? 'text-amber-300' : 'text-slate-500'}`}
            >
              {n}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-[0.3vw] px-[0.3vw] pt-[1.4vh]">
              {here.map((l) => (
                <FactionToken key={l.player.id} player={l.player} size={here.length > 4 ? 24 : here.length > 2 ? 30 : 38} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StandingRow({ line, rank, state }: { line: ScoreLine & { seat: number }; rank: number; state: GameState }) {
  const { player, total } = line;
  const hex = colorHex(player.color);
  const faction = getFaction(player.factionId);
  const won = total >= state.target;
  const secrets = state.secrets.filter((s) => s.playerId === player.id);
  const parts: string[] = [];
  if (line.publicPts) parts.push(`Públicos ${line.publicPts}`);
  if (line.secretPts) parts.push(`Secretos ${line.secretPts}`);
  for (const e of EXTRAS) if (line.extras[e.key]) parts.push(`${e.short} ${line.extras[e.key]}`);
  const compact = state.players.length > 6;

  return (
    <div
      className={`relative flex min-h-0 flex-1 items-center gap-[0.8vw] rounded-lg border bg-slate-950/80 px-[0.8vw] ${
        won ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,.45)]' : 'border-slate-800'
      }`}
      style={{ borderLeft: `0.4vw solid ${hex}` }}
    >
      <span className="font-display w-[1.6vw] text-center text-[1.2vw] font-bold text-slate-500">{rank}</span>
      <FactionToken player={player} size={compact ? 38 : 50} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[1.35vw] font-bold leading-tight text-white">{player.name}</p>
          {state.speakerId === player.id && (
            <span className="font-display rounded bg-slate-200 px-1.5 text-[0.7vw] font-bold uppercase text-slate-900">Orador</span>
          )}
          {won && <span className="font-display text-[0.8vw] font-bold uppercase text-amber-300">Vitória!</span>}
        </div>
        <p className="truncate text-[0.85vw] text-slate-400">{faction?.name}</p>
        {!compact && (parts.length > 0 || secrets.length > 0) && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {secrets.map((s) => (
              <span key={s.uid} className="rounded bg-red-500/15 px-1.5 text-[0.75vw] font-semibold text-red-300">
                {getObjective(s.defId)?.name ?? 'Secreto'}
              </span>
            ))}
            {parts.length > 0 && <span className="text-[0.75vw] text-slate-500">{parts.join(' · ')}</span>}
          </div>
        )}
      </div>
      <span className="font-display text-[3vw] font-black tabular-nums" style={{ color: hex, textShadow: `0 0 18px ${hex}88` }}>
        {total}
      </span>
    </div>
  );
}
