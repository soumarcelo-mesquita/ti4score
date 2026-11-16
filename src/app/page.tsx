'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { newRoomCode, normalizeCode } from '@/lib/game';

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [lastCode, setLastCode] = useState<string | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read localStorage after mount
      setLastCode(localStorage.getItem('ti4score:lastCode'));
    } catch {
      /* ignore */
    }
  }, []);

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalizeCode(code);
    if (c) router.push(`/c/${c}`);
  };

  return (
    <main className="starfield flex flex-1 flex-col items-center justify-center gap-10 px-4 py-12">
      <div className="text-center">
        <p className="font-display text-sm uppercase tracking-[0.4em] text-amber-400/80">Twilight Imperium IV</p>
        <h1 className="font-display mt-2 text-4xl font-black text-white sm:text-5xl">Placar Galáctico</h1>
        <p className="mt-3 text-slate-400">A TV mostra o placar; os celulares controlam.</p>
      </div>

      <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-amber-500/30 bg-slate-950/80 p-6">
          <h2 className="font-display text-lg font-bold text-amber-300">Na TV</h2>
          <p className="mt-1 text-sm text-slate-400">Abre o placar em tela cheia com um QR code para os jogadores.</p>
          <button
            onClick={() => router.push(`/tv/${newRoomCode()}`)}
            className="mt-5 w-full rounded-lg bg-amber-500 px-4 py-3 font-semibold text-slate-950 hover:bg-amber-400"
          >
            Nova partida
          </button>
          {lastCode && (
            <button
              onClick={() => router.push(`/tv/${lastCode}`)}
              className="mt-3 w-full rounded-lg border border-amber-500/40 px-4 py-3 font-semibold text-amber-200 hover:bg-amber-500/10"
            >
              Retomar partida {lastCode}
            </button>
          )}
        </section>

        <section className="rounded-2xl border border-sky-500/30 bg-slate-950/80 p-6">
          <h2 className="font-display text-lg font-bold text-sky-300">No celular</h2>
          <p className="mt-1 text-sm text-slate-400">Digite o código que aparece na TV (ou escaneie o QR).</p>
          <form onSubmit={join} className="mt-5 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              placeholder="CÓDIGO"
              autoCapitalize="characters"
              className="font-display min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-center text-lg tracking-[0.3em] text-white outline-none focus:border-sky-400"
            />
            <button className="rounded-lg bg-sky-500 px-4 py-3 font-semibold text-slate-950 hover:bg-sky-400">Entrar</button>
          </form>
        </section>
      </div>
    </main>
  );
}
