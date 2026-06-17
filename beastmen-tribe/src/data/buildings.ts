import type { BuildingConfig } from '../types';

export const BUILDINGS: Record<string, BuildingConfig> = {
  townhall: {
    id: 'townhall',
    name: '部落大厅',
    description: '部落的核心建筑，升级可解锁更多建筑和功能',
    icon: '🏛️',
    baseCost: { wood: 200, stone: 150, gold: 50 },
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
    description: '训练战士的场所，升级可训练更强兵种',
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
  warehouse: {
    id: 'warehouse',
    name: '大仓库',
    description: '增加资源存储上限，每级大幅提升容量',
    icon: '🏚️',
    baseCost: { wood: 120, stone: 80, gold: 30 },
    baseStorageCapacity: { food: 200, wood: 200, stone: 200, gold: 100, iron: 50 },
    maxLevel: 10,
    upgradeMultiplier: 1.7,
    requires: 'townhall',
  },
  caravanserai: {
    id: 'caravanserai',
    name: '商队驿站',
    description: '解锁商队长途贸易系统，提升货仓容量和最大商队数量',
    icon: '🐪',
    baseCost: { wood: 150, stone: 100, gold: 80 },
    maxLevel: 5,
    upgradeMultiplier: 1.8,
    requires: 'market',
  },
  smugglers_den: {
    id: 'smugglers_den',
    name: '走私者巢穴',
    description: '解锁黑市交易系统，可进行高风险高回报的非法交易',
    icon: '🌑',
    baseCost: { wood: 200, stone: 150, gold: 150, iron: 50 },
    maxLevel: 3,
    upgradeMultiplier: 2.0,
    requires: 'caravanserai',
  },
  totem_altar: {
    id: 'totem_altar',
    name: '图腾祭坛',
    description: '信仰的起点，每秒产出信仰值，解锁基础图腾',
    icon: '🗿',
    baseCost: { wood: 100, stone: 150, gold: 50 },
    maxLevel: 5,
    upgradeMultiplier: 1.7,
    requires: 'townhall',
  },
  totem_pole: {
    id: 'totem_pole',
    name: '图腾柱',
    description: '承载部落记忆，增加信仰上限，解锁进阶图腾',
    icon: '🎋',
    baseCost: { wood: 200, stone: 100, gold: 80 },
    maxLevel: 5,
    upgradeMultiplier: 1.8,
    requires: 'totem_altar',
  },
  shrine: {
    id: 'shrine',
    name: '圣殿',
    description: '神圣的宗教建筑，大幅提升信仰产出与上限，解锁高级图腾',
    icon: '⛩️',
    baseCost: { stone: 300, gold: 200, iron: 50, wood: 200 },
    maxLevel: 5,
    upgradeMultiplier: 2.0,
    requires: 'totem_pole',
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

export const getBuildingStorageCapacity = (type: string, level: number): Partial<Record<string, number>> => {
  const config = BUILDINGS[type];
  if (!config || !config.baseStorageCapacity) return {};
  const capacity: Partial<Record<string, number>> = {};
  const multiplier = 1 + (level - 1) * 0.5;
  for (const [resource, amount] of Object.entries(config.baseStorageCapacity)) {
    capacity[resource] = Math.floor((amount as number) * multiplier);
  }
  return capacity;
};
