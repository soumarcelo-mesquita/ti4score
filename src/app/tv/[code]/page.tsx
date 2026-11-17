'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useHostGame } from '@/lib/sync';
import { useNow } from '@/lib/useNow';
import { elapsed, formatDuration, normalizeCode, scores, type GameState, type ScoreLine } from '@/lib/game';
import { getObjective } from '@/data/objectives';
import { getFaction } from '@/data/factions';
import { colorHex } from '@/data/colors';
import { FactionToken } from '@/components/FactionToken';
import { ObjectiveCard, EmptySlot } from '@/components/ObjectiveCard';
import { QrCode } from '@/components/QrCode';
import { PlayerHand } from '@/components/TableColumn';

export default function TvPage() {
  const params = useParams<{ code: string }>();
  const code = normalizeCode(params.code ?? '');
  const { state, status, error } = useHostGame(code);
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

  if (!state) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 bg-black px-8 text-center">
        {status === 'error' ? (
          <>
            <p className="font-display text-3xl font-bold text-red-400">Não foi possível acessar o Supabase</p>
            <p className="max-w-3xl text-lg text-slate-400">{error}</p>
            <p className="text-slate-500">Verifique se a tabela <code>scoreboards</code> foi criada (supabase/migrations).</p>
          </>
        ) : (
          <p className="text-slate-500">Carregando partida…</p>
        )}
      </main>
    );
  }

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
  const twoCols = state.players.length >= 5;

  const stage1 = state.objectives.filter((o) => o.kind === 'stage1');
  const stage2 = state.objectives.filter((o) => o.kind === 'stage2');
  const stage2Slots = Math.max(5, stage2.length);
  const cols = Math.max(5, stage1.length, stage2Slots);

  const renderRow = (list: typeof stage1, kind: 'stage1' | 'stage2', slots: number, extra: typeof stage1 = []) => (
    <div className="grid min-h-0 flex-1 gap-[0.4vw]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {list.map((o) => (
        <div key={o.uid} className="flex min-h-0 items-center justify-center">
          <ObjectiveCard
            kind={o.kind}
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
          <EmptySlot label={kind === 'stage1' ? 'I' : 'II'} />
        </div>
      ))}
      {extra.map((o) => (
        <div key={o.uid} className="flex min-h-0 items-center justify-center">
          <ObjectiveCard
            kind={o.kind}
            def={getObjective(o.defId)}
            name={o.name}
            text={o.text}
            points={o.points}
            scorers={o.scoredBy.map((id) => playersById.get(id)).filter((p) => !!p)}
            className="h-full"
          />
        </div>
      ))}
    </div>
  );

  return (
    <main className="starfield flex h-screen flex-col gap-[0.8vh] overflow-hidden px-[1.2vw] py-[1vh]">
      {/* Top row: round · points track · clock */}
      <div className="flex items-stretch gap-[0.6vw]">
        <div className="flex w-[6.5vw] shrink-0 flex-col items-center justify-center rounded-md border border-slate-700/60 bg-slate-900/60">
          <p className="font-display text-[0.7vw] uppercase tracking-[0.3em] text-slate-500">Rodada</p>
          <p className="font-display text-[2.6vw] font-black leading-none text-white">{state.round}</p>
        </div>
        <div className="min-w-0 flex-1">
          <VictoryTrack lines={lines} target={state.target} />
        </div>
        <div className="flex w-[10vw] shrink-0 flex-col items-center justify-center rounded-md border border-slate-700/60 bg-slate-900/60">
          <p className={`font-display text-[2vw] font-black leading-none tabular-nums ${running ? 'text-white' : 'text-slate-500'}`}>
            {formatDuration(total)}
          </p>
          <p className="font-display mt-[0.4vh] text-[0.65vw] uppercase tracking-[0.2em] text-slate-500">
            {running ? `rodada ${formatDuration(roundTime)}` : 'pausado'}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 gap-[1vw]">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-[0.8vh]">
          {renderRow(stage1, 'stage1', Math.max(5, stage1.length))}
          {renderRow(stage2, 'stage2', stage2Slots)}
        </section>

        <aside className="flex w-[27vw] min-h-0 flex-col gap-[0.6vh]">
          <div
            className="grid min-h-0 flex-1 gap-[0.4vw]"
            style={
              twoCols
                ? { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridTemplateRows: `repeat(${Math.ceil(ranked.length / 2)}, minmax(0, 1fr))` }
                : { gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: `repeat(${ranked.length}, minmax(0, 1fr))` }
            }
          >
            {ranked.map((l) => (
              <StandingRow key={l.player.id} line={l} state={state} twoCols={twoCols} />
            ))}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-[0.6vw]">
            <div className="text-right">
              <p className="font-display text-[0.8vw] tracking-[0.3em] text-slate-400">{code}</p>
              <StatusDot status={status} />
            </div>
            {controlUrl && <QrCode value={controlUrl} size={Math.round(typeof window !== 'undefined' ? window.innerWidth * 0.032 : 60)} />}
          </div>
        </aside>
      </div>
    </main>
  );
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
            className={`relative flex h-[8vh] flex-col items-center justify-center rounded-md border ${
              isGoal ? 'border-amber-400/70 bg-amber-500/10' : 'border-slate-700/60 bg-slate-900/60'
            }`}
          >
            <span
              className={`font-display absolute left-[0.4vw] top-[0.2vh] text-[0.8vw] font-bold ${isGoal ? 'text-amber-300' : 'text-slate-500'}`}
            >
              {n}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-[0.25vw] px-[0.3vw] pl-[1.4vw]">
              {here.map((l) => (
                <FactionToken key={l.player.id} player={l.player} size={here.length > 4 ? 22 : here.length > 2 ? 30 : 40} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StandingRow({ line, state, twoCols }: { line: ScoreLine & { seat: number }; state: GameState; twoCols: boolean }) {
  const { player, total } = line;
  const hex = colorHex(player.color);
  const faction = getFaction(player.factionId);
  const won = total >= state.target;

  return (
    <div
      className={`relative flex min-h-0 gap-[0.5vw] overflow-hidden rounded-lg border bg-slate-950/80 px-[0.5vw] py-[0.6vh] ${
        won ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,.45)]' : 'border-slate-800'
      }`}
      style={{ borderLeft: `0.3vw solid ${hex}` }}
    >
      {/* Identity + score */}
      <div className={`flex shrink-0 flex-col ${twoCols ? 'w-[40%]' : 'w-[38%]'}`}>
        <p className={`truncate font-bold leading-tight text-white ${twoCols ? 'text-[1vw]' : 'text-[1.15vw]'}`}>{player.name}</p>
        <p className="line-clamp-2 text-[0.6vw] leading-tight text-slate-400">{faction?.name}</p>
        {twoCols ? (
          <>
            <div className="mt-[0.6vh] flex items-end gap-[0.4vw]">
              <span className="font-display text-[2.6vw] font-black leading-none tabular-nums" style={{ color: hex, textShadow: `0 0 18px ${hex}88` }}>
                {total}
              </span>
              {won && <span className="font-display mb-[0.3vh] text-[0.6vw] font-bold uppercase text-amber-300">Vitória!</span>}
            </div>
            <FactionToken player={player} size={30} className="mt-auto" />
          </>
        ) : (
          <div className="mt-auto flex items-end gap-[0.4vw]">
            <FactionToken player={player} size={36} className="mb-[0.2vh]" />
            <span className="font-display text-[3vw] font-black leading-none tabular-nums" style={{ color: hex, textShadow: `0 0 18px ${hex}88` }}>
              {total}
            </span>
            {won && <span className="font-display mb-[0.3vh] text-[0.6vw] font-bold uppercase text-amber-300">Vitória!</span>}
          </div>
        )}
      </div>
      {/* Scored secrets, action cards and supports */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PlayerHand state={state} playerId={player.id} />
      </div>
    </div>
  );
}
