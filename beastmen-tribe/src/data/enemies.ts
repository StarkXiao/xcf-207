import type { EnemyConfig } from '../types';

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

export const generateInvasion = (wave: number) => {
  const enemyPool: string[] = [];
  if (wave >= 1) enemyPool.push('goblin');
  if (wave >= 3) enemyPool.push('wolf');
  if (wave >= 5) enemyPool.push('troll');
  if (wave >= 8) enemyPool.push('orc');
  if (wave >= 12) enemyPool.push('dragon');

  const enemyType = enemyPool[Math.floor(Math.random() * enemyPool.length)];
  const base = ENEMIES[enemyType];
  const scale = 1 + wave * 0.1;

  return {
    type: enemyType,
    name: base.name,
    icon: base.icon,
    attack: Math.floor(base.attack * scale),
    defense: Math.floor(base.defense * scale),
    hp: Math.floor(base.hp * scale),
    maxHp: Math.floor(base.hp * scale),
    count: Math.max(1, Math.floor(base.count * (1 + wave * 0.05))),
    reward: Object.fromEntries(
      Object.entries(base.reward).map(([k, v]) => [k, Math.floor((v as number) * scale)])
    ),
  };
};
