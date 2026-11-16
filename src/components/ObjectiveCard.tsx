'use client';

import { useEffect, useState } from 'react';
import { getObjective, type ObjectiveDef } from '@/data/objectives';
import { factionImage } from '@/data/factions';
import { colorHex } from '@/data/colors';
import type { Player } from '@/lib/game';

export type CardKind = 'stage1' | 'stage2' | 'secret' | 'custom';

/** Optional blank-frame illustration; probed once per kind. */
const artCache = new Map<CardKind, Promise<boolean>>();
function probeArt(kind: CardKind): Promise<boolean> {
  let p = artCache.get(kind);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = artUrl(kind);
    });
    artCache.set(kind, p);
  }
  return p;
}
function artUrl(kind: CardKind) {
  return `/img/objectives/${kind}.webp`;
}

function useArt(kind: CardKind) {
  const [has, setHas] = useState(false);
  useEffect(() => {
    let alive = true;
    void probeArt(kind).then((ok) => alive && setHas(ok));
    return () => {
      alive = false;
    };
  }, [kind]);
  return has;
}

export interface ObjectiveCardProps {
  kind: CardKind;
  def?: ObjectiveDef;
  name?: string;
  text?: string;
  points: number;
  scorers?: Player[];
  className?: string;
}

export function ObjectiveCard({ kind, def, name, text, points, scorers = [], className = '' }: ObjectiveCardProps) {
  const hasArt = useArt(kind);
  const title = def?.name ?? name ?? 'Objetivo';
  const body = def?.text ?? text ?? '';
  const phase = def?.phase ?? 'status';
  const many = scorers.length > 4;

  return (
    <div
      className={`objcard ${hasArt ? 'has-art' : ''} ${className}`}
      data-kind={kind}
      style={hasArt ? { backgroundImage: `url(${artUrl(kind)})` } : undefined}
    >
      <div className="objcard-title">{title}</div>
      <div className="objcard-band objcard-deco" />
      <div className="objcard-phase" data-phase={phase}>
        {phase === 'action' ? 'Action Phase' : phase === 'agenda' ? 'Agenda Phase' : 'Status Phase'}
      </div>
      <div className="objcard-panel starfield objcard-deco" />
      <div className="objcard-text" style={scorers.length ? { bottom: many ? '45%' : '38%' } : undefined}>
        {body}
      </div>
      {scorers.length > 0 && (
        <div className="objcard-tokens">
          {scorers.map((p) => (
            <span key={p.id} className="objcard-token" style={{ ['--pc' as string]: colorHex(p.color) }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={factionImage(p.factionId)} alt={p.name} />
            </span>
          ))}
        </div>
      )}
      <div className="objcard-vp objcard-deco-ring">{points}</div>
      <div className="objcard-vplabel">{points === 1 ? 'Victory Point' : 'Victory Points'}</div>
    </div>
  );
}

export function ObjectiveCardById({ defId, ...rest }: Omit<ObjectiveCardProps, 'def' | 'kind'> & { defId: string | null; kind: CardKind }) {
  return <ObjectiveCard def={getObjective(defId)} {...rest} />;
}

export function EmptySlot({ label = '?' }: { label?: string }) {
  return <div className="objslot h-full">{label}</div>;
}
