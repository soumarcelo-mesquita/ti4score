export type ObjectiveKind = 'stage1' | 'stage2' | 'secret';
export type ScorePhase = 'status' | 'action' | 'agenda';

export interface ObjectiveDef {
  id: string;
  name: string;
  kind: ObjectiveKind;
  phase: ScorePhase;
  set: 'base' | 'pok';
  /** Card text (Codex Ω wording where it applies). */
  text: string;
}

type Raw = [name: string, text: string];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

function deck(kind: ObjectiveKind, set: ObjectiveDef['set'], phase: ScorePhase, cards: Raw[]): ObjectiveDef[] {
  return cards.map(([name, text]) => ({ id: slug(name), name, kind, phase, set, text }));
}

// Source: twilight-imperium.fandom.com/wiki/Objectives (list provided by the group).
export const OBJECTIVES: ObjectiveDef[] = [
  // ── Stage I ──
  ...deck('stage1', 'base', 'status', [
    ['Corner the Market', 'Control 4 planets that each have the same planet trait.'],
    ['Develop Weaponry', 'Own 2 unit upgrade technologies.'],
    ['Diversify Research', 'Own 2 technologies in each of 2 colors.'],
    ['Erect a Monument', 'Spend 8 resources.'],
    ['Expand Borders', 'Control 6 planets in non-home systems.'],
    ['Found Research Outposts', 'Control 3 planets that have technology specialties.'],
    ['Intimidate Council', "Have 1 or more ships in 2 systems that are adjacent to Mecatol Rex's System."],
    ['Lead from the Front', 'Spend a total of 3 tokens from your tactic and/or strategy pools.'],
    ['Negotiate Trade Routes', 'Spend 5 trade goods.'],
    ['Sway the Council', 'Spend 8 influence.'],
  ]),
  ...deck('stage1', 'pok', 'status', [
    ['Amass Wealth', 'Spend 3 influence, 3 resources, and 3 trade goods.'],
    ['Build Defenses', 'Have 4 or more structures.'],
    ['Discover Lost Outposts', 'Control 2 planets that have attachments.'],
    ['Engineer a Marvel', 'Have your flagship or a war sun on the game board.'],
    ['Explore Deep Space', 'Have units in 3 systems that do not contain planets.'],
    ['Improve Infrastructure', 'Have structures on 3 planets outside of your home system.'],
    ['Make History', 'Have units in 2 systems that contain legendary planets, Mecatol Rex, or anomalies.'],
    ['Populate the Outer Rim', 'Have units in 3 systems on the edge of the game board other than your home system.'],
    ['Push Boundaries', 'Control more planets than each of 2 of your neighbors.'],
    ['Raise a Fleet', 'Have 5 or more non-fighter ships in 1 system.'],
  ]),

  // ── Stage II ──
  ...deck('stage2', 'base', 'status', [
    ['Centralize Galactic Trade', 'Spend 10 trade goods.'],
    ['Conquer the Weak', "Control 1 planet that is in another player's home system."],
    ['Form Galactic Brain Trust', 'Control 5 planets that have technology specialties.'],
    ['Found a Golden Age', 'Spend 16 resources.'],
    ['Galvanize the People', 'Spend a total of 6 tokens from your tactic and/or strategy pools.'],
    ['Manipulate Galactic Law', 'Spend 16 influence.'],
    ['Master the Sciences', 'Own 2 technologies in each of 4 colors.'],
    ['Revolutionize Warfare', 'Own 3 unit upgrade technologies.'],
    ['Subdue the Galaxy', 'Control 11 planets in non-home systems.'],
    ['Unify the Colonies', 'Control 6 planets that each have the same planet trait.'],
  ]),
  ...deck('stage2', 'pok', 'status', [
    ['Achieve Supremacy', "Have your flagship or a war sun in another player's home system or the Mecatol Rex system."],
    ['Become a Legend', 'Have units in 4 systems that contain legendary planets, Mecatol Rex, or anomalies.'],
    ['Command an Armada', 'Have 8 or more non-fighter ships in 1 system.'],
    ['Construct Massive Cities', 'Have 7 or more structures.'],
    ['Control the Borderlands', 'Have units in 5 systems on the edge of the game board other than your home system.'],
    ['Hold Vast Reserves', 'Spend 6 influence, 6 resources, and 6 trade goods.'],
    ['Patrol Vast Territories', 'Have units in 5 systems that do not contain planets.'],
    ['Protect the Border', 'Have structures on 5 planets outside of your home system.'],
    ['Reclaim Ancient Monuments', 'Control 3 planets that have attachments.'],
    ['Rule Distant Lands', "Control 2 planets that are each in or adjacent to a different, other player's home system."],
  ]),

  // ── Secret: action phase ──
  ...deck('secret', 'base', 'action', [
    ['Destroy Their Greatest Ship', "Destroy another player's war sun or flagship."],
    ['Make an Example of Their World', "Destroy the last of a player's ground forces on a planet during the bombardment step."],
    ['Spark a Rebellion', 'Win a combat against a player who has the most victory points.'],
    ['Turn Their Fleets to Dust', "Destroy the last of a player's non-fighter ships in the active system during the space cannon offense step."],
    ['Unveil Flagship', 'Win a space combat in a system that contains your flagship. You cannot score this objective if your flagship is destroyed in the combat.'],
  ]),
  ...deck('secret', 'pok', 'action', [
    ['Become a Martyr', 'Lose control of a planet in a home system.'],
    ['Betray a Friend', 'Win a combat against a player whose promissory note you had in your play area at the start of your tactical action.'],
    ['Brave the Void', 'Win a combat in an anomaly.'],
    ['Darken the Skies', "Win a combat in another player's home system."],
    ['Demonstrate Your Power', 'Have 3 or more non-fighter ships in the active system at the end of a space combat.'],
    ['Fight With Precision', "Destroy the last of a player's fighters in the active system during the anti-fighter barrage step."],
    ['Prove Endurance', 'Be the last player to pass during a game round.'],
  ]),
  // ── Secret: status phase ──
  ...deck('secret', 'base', 'status', [
    ['Adapt New Strategies', 'Own 2 faction technologies. (Valefar Assimilator technologies do not count toward this objective.)'],
    ['Become the Gatekeeper', 'Have 1 or more ships in a system that contains an alpha wormhole and 1 or more ships in a system that contains a beta wormhole.'],
    ['Control the Region', 'Have 1 or more ships in 6 systems.'],
    ['Cut Supply Lines', "Have 1 or more ships in the same system as another player's space dock."],
    ['Establish a Perimeter', 'Have 4 PDS units on the game board.'],
    ['Forge an Alliance', 'Control 4 cultural planets.'],
    ['Form a Spy Network', 'Discard 5 Action Cards.'],
    ['Fuel the War Machine', 'Have 3 space docks on the game board.'],
    ['Gather a Mighty Fleet', 'Have 5 dreadnoughts on the game board.'],
    ['Learn the Secrets of the Cosmos', 'Have 1 or more ships in 3 systems that are each adjacent to an anomaly.'],
    ['Master the Laws of Physics', 'Own 4 technologies of the same color.'],
    ['Mine Rare Metals', 'Control 4 hazardous planets.'],
    ['Monopolize Production', 'Control 4 industrial planets.'],
    ['Occupy the Seat of the Empire', 'Control Mecatol Rex and have 3 or more ships in its system.'],
    ['Threaten Enemies', "Have 1 or more ships in a system that is adjacent to another player's home system."],
  ]),
  ...deck('secret', 'pok', 'status', [
    ['Defy Space and Time', 'Have units in the wormhole nexus.'],
    ['Destroy Heretical Works', 'Purge 2 of your relic fragments of any type.'],
    ['Establish Hegemony', 'Control planets that have a combined influence value of at least 12.'],
    ['Foster Cohesion', 'Be neighbors with all other players.'],
    ['Hoard Raw Materials', 'Control planets that have a combined resource value of at least 12.'],
    ['Mechanize the Military', 'Have 1 mech on each of 4 planets.'],
    ['Occupy the Fringe', 'Have 9 or more ground forces on a planet that does not contain 1 of your space docks.'],
    ['Produce en Masse', 'Have units with a combined PRODUCTION value of at least 8 in a single system.'],
    ['Seize an Icon', 'Control a legendary planet.'],
    ['Stake Your Claim', 'Control a planet in a system that contains a planet controlled by another player.'],
    ['Strengthen Bonds', "Have another player's promissory note in your play area."],
  ]),
  // ── Secret: agenda phase ──
  ...deck('secret', 'pok', 'agenda', [
    ['Dictate Policy', 'There are 3 or more laws in play.'],
    ['Drive the Debate', 'You or a planet you control are elected by an agenda.'],
  ]),

];

export const KIND_POINTS: Record<ObjectiveKind, number> = { stage1: 1, stage2: 2, secret: 1 };

const BY_ID = new Map(OBJECTIVES.map((x) => [x.id, x]));

export function getObjective(id: string | null | undefined): ObjectiveDef | undefined {
  return id ? BY_ID.get(id) : undefined;
}
