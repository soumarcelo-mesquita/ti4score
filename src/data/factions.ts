import factionsJson from './factions-list.json';

export interface Faction {
  id: string;
  name: string;
  set: 'base' | 'pok' | 'te';
}

interface RawFaction {
  id: string;
  tileId: number;
  name: string;
}

export const FACTIONS: Faction[] = (factionsJson.factions as RawFaction[])
  .map((f) => ({
    id: f.id,
    name: f.name.replace(/^The /, ''),
    set: (f.tileId >= 92 ? 'te' : f.tileId >= 52 ? 'pok' : 'base') as Faction['set'],
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const BY_ID = new Map(FACTIONS.map((f) => [f.id, f]));

export function getFaction(id: string | null | undefined): Faction | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function factionImage(id: string): string {
  return `/img/factions/ti_${id}.png`;
}
