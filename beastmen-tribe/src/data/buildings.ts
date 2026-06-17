import type { BuildingConfig } from '../types';

export const BUILDINGS: Record<string, BuildingConfig> = {
  townhall: {
    id: 'townhall',
    name: '部落大厅',
    description: '部落的核心建筑，升级可解锁更多建筑和功能',
    icon: '🏛️',
    baseCost: { wood: 0, stone: 0, gold: 0 },
    maxLevel: 10,
    upgradeMultiplier: 1.8,
    baseCapacity: 100,
  },
  hut: {
    id: 'hut',
    name: '兽人小屋',
    description: '增加部落人口上限，每级+5人口',
    icon: '🛖',
    baseCost: { wood: 50, stone: 20 },
    maxLevel: 5,
    upgradeMultiplier: 1.5,
    baseCapacity: 5,
  },
  farm: {
    id: 'farm',
    name: '狩猎场',
    description: '持续产出食物资源',
    icon: '🍖',
    baseCost: { wood: 80, stone: 30 },
    baseProduction: { food: 2 },
    maxLevel: 8,
    upgradeMultiplier: 1.6,
  },
  lumbermill: {
    id: 'lumbermill',
    name: '伐木场',
    description: '持续产出木材资源',
    icon: '🪵',
    baseCost: { wood: 40, stone: 60 },
    baseProduction: { wood: 2 },
    maxLevel: 8,
    upgradeMultiplier: 1.6,
  },
  quarry: {
    id: 'quarry',
    name: '采石场',
    description: '持续产出石料资源',
    icon: '⛏️',
    baseCost: { wood: 80, stone: 40 },
    baseProduction: { stone: 1.5 },
    maxLevel: 8,
    upgradeMultiplier: 1.6,
  },
  barracks: {
    id: 'barracks',
    name: '兵营',
    description: '训练战士的场所，升级可解锁更强兵种',
    icon: '⚔️',
    baseCost: { wood: 150, stone: 100, gold: 30 },
    maxLevel: 6,
    upgradeMultiplier: 2,
    requires: 'townhall',
  },
  smithy: {
    id: 'smithy',
    name: '铁匠铺',
    description: '产出铁矿，提升战士攻击力',
    icon: '🔨',
    baseCost: { wood: 120, stone: 150, gold: 50 },
    baseProduction: { iron: 0.5 },
    maxLevel: 6,
    upgradeMultiplier: 1.8,
    requires: 'barracks',
  },
  market: {
    id: 'market',
    name: '交易市场',
    description: '与其他部落进行资源交易',
    icon: '🏪',
    baseCost: { wood: 100, stone: 80, gold: 80 },
    maxLevel: 5,
    upgradeMultiplier: 1.7,
    requires: 'townhall',
  },
  wall: {
    id: 'wall',
    name: '防御工事',
    description: '提升部落防御力，抵御外敌入侵',
    icon: '🧱',
    baseCost: { wood: 60, stone: 150 },
    maxLevel: 10,
    upgradeMultiplier: 1.5,
    baseCapacity: 10,
  },
};

export const getBuildingCost = (type: string, level: number): Partial<Record<string, number>> => {
  const config = BUILDINGS[type];
  if (!config) return {};
  const cost: Partial<Record<string, number>> = {};
  const multiplier = Math.pow(config.upgradeMultiplier, level);
  for (const [resource, amount] of Object.entries(config.baseCost)) {
    cost[resource] = Math.floor((amount as number) * multiplier);
  }
  return cost;
};

export const getBuildingProduction = (type: string, level: number): Partial<Record<string, number>> => {
  const config = BUILDINGS[type];
  if (!config || !config.baseProduction) return {};
  const production: Partial<Record<string, number>> = {};
  for (const [resource, amount] of Object.entries(config.baseProduction)) {
    production[resource] = (amount as number) * level;
  }
  return production;
};
