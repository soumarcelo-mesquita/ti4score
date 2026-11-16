'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { initialState, reduce, type Action, type GameState } from '@/lib/game';

/**
 * Sync model: the TV page is the host and owns the authoritative state
 * (persisted in its localStorage). Phones send actions over a Supabase
 * Realtime broadcast channel; the host applies them and broadcasts the
 * full state back. No database table is needed.
 */

interface StateMsg {
  state: GameState;
  /** Host clock when sent — lets controllers correct their clock skew. */
  sentAt: number;
}

const HEARTBEAT_MS = 10_000;
const STALE_MS = 25_000;

function channelName(code: string) {
  return `ti4score:${code}`;
}

function storageKey(code: string) {
  return `ti4score:game:${code}`;
}

function loadSaved(code: string): GameState | null {
  try {
    const raw = localStorage.getItem(storageKey(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    return parsed?.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function save(code: string, state: GameState) {
  try {
    localStorage.setItem(storageKey(code), JSON.stringify(state));
  } catch {
    /* storage unavailable — the game still runs, just not across reloads */
  }
}

export type LinkStatus = 'connecting' | 'online' | 'offline';

export function useHostGame(code: string) {
  const [state, setState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<LinkStatus>('connecting');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const stateRef = useRef<GameState | null>(null);

  const broadcast = useCallback(() => {
    const ch = channelRef.current;
    if (!ch || !stateRef.current) return;
    const msg: StateMsg = { state: stateRef.current, sentAt: Date.now() };
    void ch.send({ type: 'broadcast', event: 'state', payload: msg });
  }, []);

  const dispatch = useCallback(
    (action: Action) => {
      setState((prev) => {
        const next = reduce(prev ?? initialState(), action, Date.now());
        stateRef.current = next;
        return next;
      });
    },
    [],
  );

  // Load saved game once.
  useEffect(() => {
    const saved = loadSaved(code) ?? initialState();
    stateRef.current = saved;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setState(saved);
  }, [code]);

  // Persist + broadcast on every change.
  useEffect(() => {
    if (!state) return;
    save(code, state);
    broadcast();
  }, [code, state, broadcast]);

  useEffect(() => {
    const ch = supabase.channel(channelName(code), { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'action' }, ({ payload }) => dispatch(payload as Action))
      .on('broadcast', { event: 'hello' }, () => broadcast())
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          setStatus('online');
          broadcast();
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          setStatus('offline');
        }
      });
    channelRef.current = ch;
    const beat = setInterval(broadcast, HEARTBEAT_MS);
    return () => {
      clearInterval(beat);
      channelRef.current = null;
      void supabase.removeChannel(ch);
    };
  }, [code, dispatch, broadcast]);

  return { state, dispatch, status };
}

export function useControllerGame(code: string) {
  const [state, setState] = useState<GameState | null>(null);
  const [lastSeen, setLastSeen] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [skew, setSkew] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const ch = supabase.channel(channelName(code), { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'state' }, ({ payload }) => {
      const msg = payload as StateMsg;
      setState(msg.state);
      setSkew(Date.now() - msg.sentAt);
      setLastSeen(Date.now());
    }).subscribe((s) => {
      if (s === 'SUBSCRIBED') {
        setSubscribed(true);
        void ch.send({ type: 'broadcast', event: 'hello', payload: {} });
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
        setSubscribed(false);
      }
    });
    channelRef.current = ch;
    const tick = setInterval(() => setNow(Date.now()), 5_000);
    return () => {
      clearInterval(tick);
      channelRef.current = null;
      void supabase.removeChannel(ch);
    };
  }, [code]);

  const dispatch = useCallback((action: Action) => {
    void channelRef.current?.send({ type: 'broadcast', event: 'action', payload: action });
  }, []);

  const status: LinkStatus = !subscribed
    ? 'connecting'
    : lastSeen && now - lastSeen < STALE_MS
      ? 'online'
      : 'offline';

  return { state, dispatch, status, skew };
}
