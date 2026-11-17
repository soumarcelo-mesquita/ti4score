'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { initialState, normalizeState, reduce, type Action, type GameState } from '@/lib/game';

/**
 * Sync model: each game is one row in the Supabase `scoreboards` table
 * (code, state jsonb, version). Any client — TV or phone — applies an action
 * with the shared reducer and writes the new state with a compare-and-swap on
 * `version`; on a conflict it re-reads the row and tries again. Every client
 * subscribes to the row through Realtime, so the TV is no longer required for
 * phones to keep scoring, and the game survives any device going away.
 */

const TABLE = 'scoreboards';
const MAX_RETRIES = 5;

export type LinkStatus = 'connecting' | 'online' | 'offline' | 'missing' | 'error';

interface Row {
  state: GameState;
  version: number;
}

/** Game saved by the previous localStorage-only version, used to seed the row once. */
function legacyLocalGame(code: string): GameState | null {
  try {
    const raw = localStorage.getItem(`ti4score:game:${code}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    return parsed?.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchRow(code: string): Promise<{ row: Row | null; error: string | null }> {
  const { data, error } = await supabase.from(TABLE).select('state, version').eq('code', code).maybeSingle();
  if (error) return { row: null, error: error.message };
  return { row: data ? { state: normalizeState(data.state as GameState), version: data.version as number } : null, error: null };
}

/**
 * @param create when true (the TV), a missing game is created; phones only join existing games.
 */
export function useGame(code: string, { create }: { create: boolean }) {
  const [state, setState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<LinkStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const rowRef = useRef<Row | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const accept = useCallback((row: Row) => {
    // Ignore stale echoes (e.g. a Realtime event older than our own write).
    if (rowRef.current && row.version < rowRef.current.version) return;
    rowRef.current = row;
    setState(row.state);
  }, []);

  const refresh = useCallback(async () => {
    const { row, error: err } = await fetchRow(code);
    if (err) {
      setError(err);
      setStatus('error');
      return null;
    }
    if (row) accept(row);
    return row;
  }, [code, accept]);

  // Initial load (and creation for the TV).
  useEffect(() => {
    let alive = true;
    rowRef.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the code changes
    setState(null);
    (async () => {
      let { row, error: err } = await fetchRow(code);
      if (!alive) return;
      if (err) {
        setError(err);
        setStatus('error');
        return;
      }
      if (!row && create) {
        const seed = legacyLocalGame(code) ?? initialState();
        const ins = await supabase.from(TABLE).upsert({ code, state: seed, version: 0 }, { onConflict: 'code', ignoreDuplicates: true });
        if (!alive) return;
        if (ins.error) {
          setError(ins.error.message);
          setStatus('error');
          return;
        }
        ({ row, error: err } = await fetchRow(code));
        if (!alive) return;
      }
      if (!row) {
        setStatus('missing');
        return;
      }
      accept(row);
    })();
    return () => {
      alive = false;
    };
  }, [code, create, accept]);

  // Live updates.
  useEffect(() => {
    const ch = supabase
      .channel(`scoreboard-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `code=eq.${code}` }, (payload) => {
        const n = payload.new as { state?: GameState; version?: number } | undefined;
        if (n?.state && typeof n.version === 'number') {
          accept({ state: normalizeState(n.state), version: n.version });
          setStatus((s) => (s === 'missing' ? 'online' : s));
        }
      })
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          setStatus((prev) => (prev === 'missing' || prev === 'error' ? prev : 'online'));
          void refresh(); // catch up on anything missed while (re)connecting
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          setStatus((prev) => (prev === 'missing' || prev === 'error' ? prev : 'offline'));
        }
      });

    // Phones sleep: re-read the row when the page comes back.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      void supabase.removeChannel(ch);
    };
  }, [code, accept, refresh]);

  const apply = useCallback(
    async (action: Action) => {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const cur = rowRef.current ?? (await refresh());
        if (!cur) return;
        const next = reduce(cur.state, action, Date.now());
        setState(next); // optimistic
        const { data, error: err } = await supabase
          .from(TABLE)
          .update({ state: next, version: cur.version + 1, updated_at: new Date().toISOString() })
          .eq('code', code)
          .eq('version', cur.version)
          .select('state, version')
          .maybeSingle();
        if (err) {
          setError(err.message);
          setStatus('error');
          return;
        }
        if (data) {
          accept({ state: normalizeState(data.state as GameState), version: data.version as number });
          return;
        }
        // Someone else wrote first: reload and replay the action on top of theirs.
        rowRef.current = null;
        await refresh();
      }
      await refresh();
    },
    [code, accept, refresh],
  );

  // Serialise writes from this device so quick taps don't conflict with each other.
  const dispatch = useCallback(
    (action: Action) => {
      queueRef.current = queueRef.current.then(() => apply(action)).catch(() => undefined);
    },
    [apply],
  );

  return { state, dispatch, status, error, skew: 0 };
}

/** TV: creates the game if it does not exist yet. */
export function useHostGame(code: string) {
  return useGame(code, { create: true });
}

/** Phone: joins an existing game only. */
export function useControllerGame(code: string) {
  return useGame(code, { create: false });
}
