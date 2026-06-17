import type { EnemyConfig, Faction, FactionType } from '../types';
import { FACTIONS } from './factions';

export const ENEMIES: Record<string, EnemyConfig> = {
  goblin: {
    id: 'goblin',
    name: '哥布林',
    icon: '👺',
    attack: 5,
    defense: 2,
    hp: 25,
    count: 3,
    reward: { food: 20, gold: 5 },
  },
  wolf: {
    id: 'wolf',
    name: '野狼',
    icon: '🐺',
    attack: 8,
    defense: 3,
    hp: 35,
    count: 4,
    reward: { food: 40, wood: 10 },
  },
  troll: {
    id: 'troll',
    name: '山地巨魔',
    icon: '👾',
    attack: 12,
    defense: 8,
    hp: 80,
    count: 2,
    reward: { stone: 50, iron: 10 },
  },
  orc: {
    id: 'orc',
    name: '敌对兽人',
    icon: '💀',
    attack: 15,
    defense: 10,
    hp: 100,
    count: 3,
    reward: { gold: 60, iron: 20, food: 50 },
  },
  dragon: {
    id: 'dragon',
    name: '远古巨龙',
    icon: '🐉',
    attack: 40,
    defense: 25,
    hp: 300,
    count: 1,
    reward: { gold: 200, iron: 80, food: 150 },
  },
};

export const FACTION_ENEMY_TYPES: Record<FactionType, string> = {
  bloodtooth: 'orc',
  shadowfang: 'wolf',
  ironclaw: 'troll',
  moonscar: 'dragon',
  sunhorn: 'goblin',
};

const calculateHostilityModifier = (factions: Record<FactionType, Faction>): {
  invasionChance: number;
  strengthMod: number;
  sourceFaction?: FactionType;
} => {
  let totalHostility = 0;
  let mostHostile: FactionType | null = null;
  let maxHostility = 0;

  for (const faction of Object.values(factions)) {
    const hostility = Math.max(0, -faction.reputation);
    totalHostility += hostility;
    if (hostility > maxHostility) {
      maxHostility = hostility;
      mostHostile = faction.id;
    }
  }

  const invasionChance = Math.min(0.8, 0.3 + totalHostility * 0.008);
  const strengthMod = 1 + totalHostility * 0.005;

  return {
    invasionChance,
    strengthMod,
    sourceFaction: mostHostile || undefined,
  };
};

export const getInvasionDiplomacyInfo = (factions: Record<FactionType, Faction>) => {
  const mod = calculateHostilityModifier(factions);
  return {
    invasionChance: Math.round(mod.invasionChance * 100),
    strengthMod: Math.round((mod.strengthMod - 1) * 100),
    hostileCount: Object.values(factions).filter((f) => f.reputation < 0).length,
    mostHostile: mod.sourceFaction ? FACTIONS[mod.sourceFaction].name : null,
  };
};

export const generateInvasion = (wave: number, factions?: Record<FactionType, Faction>) => {
  const enemyPool: string[] = [];
  if (wave >= 1) enemyPool.push('goblin');
  if (wave >= 3) enemyPool.push('wolf');
  if (wave >= 5) enemyPool.push('troll');
  if (wave >= 8) enemyPool.push('orc');
  if (wave >= 12) enemyPool.push('dragon');

  let enemyType: string;
  let scale = 1 + wave * 0.1;
  let sourceName = '';
  let sourceIcon = '';

  if (factions) {
    const hostility = calculateHostilityModifier(factions);
    scale *= hostility.strengthMod;

    if (hostility.sourceFaction && hostility.sourceFaction !== 'sunhorn') {
      const factionEnemy = FACTION_ENEMY_TYPES[hostility.sourceFaction];
      if (enemyPool.includes(factionEnemy) || wave >= 3) {
        enemyType = factionEnemy;
        sourceName = FACTIONS[hostility.sourceFaction].name;
        sourceIcon = FACTIONS[hostility.sourceFaction].icon;
      } else {
        enemyType = enemyPool[Math.floor(Math.random() * enemyPool.length)];
      }
    } else {
      enemyType = enemyPool[Math.floor(Math.random() * enemyPool.length)];
    }
  } else {
    enemyType = enemyPool[Math.floor(Math.random() * enemyPool.length)];
  }

  const base = ENEMIES[enemyType];

  return {
    type: enemyType,
    name: sourceName ? `${sourceName}的${base.name}` : base.name,
    icon: sourceIcon || base.icon,
    attack: Math.floor(base.attack * scale),
    defense: Math.floor(base.defense * scale),
    hp: Math.floor(base.hp * scale),
    maxHp: Math.floor(base.hp * scale),
    count: Math.max(1, Math.floor(base.count * (1 + wave * 0.05))),
    reward: Object.fromEntries(
      Object.entries(base.reward).map(([k, v]) => [k, Math.floor((v as number) * scale)])
    ),
    sourceFaction: sourceName || null,
  };
};
