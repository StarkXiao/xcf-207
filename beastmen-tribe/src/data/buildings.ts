import type { BuildingConfig, BuildingRequirement, BuildingType, Building, ProductionEstimate, BuildingUpgradeHint, Resources, ResourceType } from '../types';

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
    buildTime: 30,
    upgradeTime: 60,
    requirements: [],
    gridSize: { width: 2, height: 2 },
    adjacencyBonusRules: [
      { targetBuildingType: 'hut', bonusPercent: 5, description: '附近有兽人小屋时，人口增长率+5%' },
      { targetBuildingType: 'farm', bonusPercent: 10, description: '附近有狩猎场时，食物产出+10%' },
    ],
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
    buildTime: 15,
    upgradeTime: 20,
    requirements: [
      { type: 'building', id: 'townhall', level: 1 },
    ],
    gridSize: { width: 1, height: 1 },
    adjacencyBonusRules: [
      { targetBuildingType: 'townhall', bonusPercent: 10, description: '靠近部落大厅时，人口上限额外+10%' },
      { targetBuildingType: 'farm', bonusPercent: 8, description: '靠近狩猎场时，幸福度提升，食物消耗-8%' },
    ],
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
    buildTime: 20,
    upgradeTime: 25,
    requirements: [
      { type: 'building', id: 'townhall', level: 1 },
    ],
    gridSize: { width: 2, height: 1 },
    adjacencyBonusRules: [
      { targetBuildingType: 'townhall', bonusPercent: 15, description: '靠近部落大厅时，食物产出+15%' },
      { targetBuildingType: 'hut', bonusPercent: 5, description: '周围有兽人小屋时，食物产出+5%' },
      { targetBuildingType: 'lumbermill', bonusPercent: 10, description: '靠近伐木场时，狩猎效率提升，食物产出+10%' },
    ],
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
    buildTime: 20,
    upgradeTime: 25,
    requirements: [
      { type: 'building', id: 'townhall', level: 1 },
    ],
    gridSize: { width: 2, height: 1 },
    adjacencyBonusRules: [
      { targetBuildingType: 'quarry', bonusPercent: 10, description: '与采石场相邻时，木材产出+10%' },
      { targetBuildingType: 'smithy', bonusPercent: 15, description: '靠近铁匠铺时，木材供应效率提升，产出+15%' },
    ],
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
    buildTime: 20,
    upgradeTime: 25,
    requirements: [
      { type: 'building', id: 'townhall', level: 1 },
    ],
    gridSize: { width: 2, height: 1 },
    adjacencyBonusRules: [
      { targetBuildingType: 'lumbermill', bonusPercent: 10, description: '与伐木场相邻时，石料产出+10%' },
      { targetBuildingType: 'wall', bonusPercent: 15, description: '靠近防御工事时，采石优先保障，产出+15%' },
    ],
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
    buildTime: 45,
    upgradeTime: 50,
    requirements: [
      { type: 'building', id: 'townhall', level: 2 },
      { type: 'population', amount: 10 },
    ],
    gridSize: { width: 2, height: 2 },
    adjacencyBonusRules: [
      { targetBuildingType: 'smithy', bonusPercent: 20, description: '靠近铁匠铺时，训练速度+20%' },
      { targetBuildingType: 'wall', bonusPercent: 10, description: '靠近防御工事时，战士防御力+10%' },
    ],
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
    buildTime: 40,
    upgradeTime: 45,
    requirements: [
      { type: 'building', id: 'barracks', level: 1 },
      { type: 'day', amount: 5 },
    ],
    gridSize: { width: 2, height: 1 },
    adjacencyBonusRules: [
      { targetBuildingType: 'barracks', bonusPercent: 15, description: '靠近兵营时，铁矿产出+15%' },
      { targetBuildingType: 'lumbermill', bonusPercent: 10, description: '靠近伐木场时，燃料充足，产出+10%' },
      { targetBuildingType: 'quarry', bonusPercent: 10, description: '靠近采石场时，矿石供应稳定，产出+10%' },
    ],
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
    buildTime: 35,
    upgradeTime: 40,
    requirements: [
      { type: 'building', id: 'townhall', level: 2 },
      { type: 'population', amount: 15 },
    ],
    gridSize: { width: 2, height: 1 },
    adjacencyBonusRules: [
      { targetBuildingType: 'townhall', bonusPercent: 10, description: '靠近部落大厅时，交易税费+10%' },
      { targetBuildingType: 'warehouse', bonusPercent: 15, description: '靠近大仓库时，交易规模+15%' },
      { targetBuildingType: 'caravanserai', bonusPercent: 20, description: '靠近商队驿站时，贸易利润+20%' },
    ],
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
    buildTime: 30,
    upgradeTime: 35,
    requirements: [
      { type: 'building', id: 'townhall', level: 1 },
    ],
    gridSize: { width: 1, height: 1 },
    adjacencyBonusRules: [
      { targetBuildingType: 'quarry', bonusPercent: 10, description: '靠近采石场时，防御力+10%' },
      { targetBuildingType: 'barracks', bonusPercent: 15, description: '与兵营相邻时，防御协调+15%' },
      { targetBuildingType: 'wall', bonusPercent: 5, description: '与其他城墙相连时，防御力+5%' },
    ],
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
    buildTime: 40,
    upgradeTime: 45,
    requirements: [
      { type: 'building', id: 'market', level: 1 },
    ],
    gridSize: { width: 2, height: 2 },
    adjacencyBonusRules: [
      { targetBuildingType: 'market', bonusPercent: 10, description: '靠近交易市场时，存储容量+10%' },
      { targetBuildingType: 'farm', bonusPercent: 8, description: '靠近狩猎场时，食物保鲜+8%' },
      { targetBuildingType: 'lumbermill', bonusPercent: 8, description: '靠近伐木场时，木材防潮+8%' },
    ],
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
    buildTime: 50,
    upgradeTime: 55,
    requirements: [
      { type: 'building', id: 'market', level: 2 },
      { type: 'day', amount: 10 },
    ],
    gridSize: { width: 2, height: 2 },
    adjacencyBonusRules: [
      { targetBuildingType: 'market', bonusPercent: 15, description: '靠近交易市场时，商队收益+15%' },
      { targetBuildingType: 'warehouse', bonusPercent: 10, description: '靠近大仓库时，货仓容量+10%' },
    ],
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
    buildTime: 60,
    upgradeTime: 70,
    requirements: [
      { type: 'building', id: 'caravanserai', level: 2 },
      { type: 'population', amount: 30 },
    ],
    gridSize: { width: 2, height: 1 },
    adjacencyBonusRules: [
      { targetBuildingType: 'caravanserai', bonusPercent: 25, description: '靠近商队驿站时，走私利润+25%' },
    ],
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
    buildTime: 35,
    upgradeTime: 40,
    requirements: [
      { type: 'building', id: 'townhall', level: 2 },
      { type: 'population', amount: 12 },
    ],
    gridSize: { width: 1, height: 1 },
    adjacencyBonusRules: [
      { targetBuildingType: 'townhall', bonusPercent: 15, description: '靠近部落大厅时，信仰产出+15%' },
      { targetBuildingType: 'totem_pole', bonusPercent: 10, description: '靠近图腾柱时，信仰共鸣+10%' },
    ],
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
    buildTime: 45,
    upgradeTime: 50,
    requirements: [
      { type: 'building', id: 'totem_altar', level: 2 },
      { type: 'day', amount: 8 },
    ],
    gridSize: { width: 1, height: 2 },
    adjacencyBonusRules: [
      { targetBuildingType: 'totem_altar', bonusPercent: 20, description: '靠近图腾祭坛时，信仰上限+20%' },
      { targetBuildingType: 'shrine', bonusPercent: 15, description: '靠近圣殿时，神圣力量+15%' },
    ],
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
    buildTime: 80,
    upgradeTime: 90,
    requirements: [
      { type: 'building', id: 'totem_pole', level: 3 },
      { type: 'population', amount: 25 },
      { type: 'day', amount: 20 },
    ],
    gridSize: { width: 2, height: 2 },
    adjacencyBonusRules: [
      { targetBuildingType: 'totem_pole', bonusPercent: 25, description: '靠近图腾柱时，信仰产出+25%' },
      { targetBuildingType: 'totem_altar', bonusPercent: 20, description: '靠近图腾祭坛时，神圣共鸣+20%' },
    ],
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

export const checkBuildingRequirements = (
  type: BuildingType,
  buildings: Building[],
  day: number,
  population: number
): { met: boolean; missing: BuildingRequirement[] } => {
  const config = BUILDINGS[type];
  if (!config || !config.requirements || config.requirements.length === 0) {
    return { met: true, missing: [] };
  }

  const missing: BuildingRequirement[] = [];

  for (const req of config.requirements) {
    let isMet: boolean;

    switch (req.type) {
      case 'building': {
        const building = buildings.find(
          (b) => b.type === req.id && !b.isBuilding
        );
        isMet = !!building && building.level >= (req.level || 1);
        break;
      }
      case 'day':
        isMet = day >= (req.amount || 0);
        break;
      case 'population':
        isMet = population >= (req.amount || 0);
        break;
      case 'tech':
        isMet = true;
        break;
      default:
        isMet = true;
    }

    if (!isMet) {
      missing.push(req);
    }
  }

  return { met: missing.length === 0, missing };
};

export const getBuildTime = (type: BuildingType): number => {
  const config = BUILDINGS[type];
  return config?.buildTime || 30;
};

export const getUpgradeTime = (type: BuildingType, currentLevel: number): number => {
  const config = BUILDINGS[type];
  if (!config) return 30;
  const baseTime = config.upgradeTime || 30;
  return Math.floor(baseTime * Math.pow(1.2, currentLevel - 1));
};

export const getProductionEstimate = (
  type: BuildingType,
  currentLevel: number
): ProductionEstimate => {
  const current = getBuildingProduction(type, currentLevel);
  const next = getBuildingProduction(type, currentLevel + 1);
  const gain: Partial<Resources> = {};
  const gainPercent: Partial<Record<ResourceType, number>> = {};

  for (const key of Object.keys(next) as ResourceType[]) {
    const curr = current[key] || 0;
    const nxt = next[key] || 0;
    gain[key] = nxt - curr;
    gainPercent[key] = curr > 0 ? ((nxt - curr) / curr) * 100 : 100;
  }

  return { current, next, gain, gainPercent };
};

export const getUnlockableBuildings = (
  buildings: Building[],
  day: number,
  population: number,
  unlockedBuildings: BuildingType[]
): BuildingType[] => {
  const unlockable: BuildingType[] = [];

  for (const type of Object.keys(BUILDINGS) as BuildingType[]) {
    if (unlockedBuildings.includes(type)) continue;

    const { met } = checkBuildingRequirements(type, buildings, day, population);
    if (met) {
      unlockable.push(type);
    }
  }

  return unlockable;
};

export const getUpgradeHints = (
  buildings: Building[],
  resources: Resources
): BuildingUpgradeHint[] => {
  const hints: BuildingUpgradeHint[] = [];

  for (const building of buildings) {
    if (building.isBuilding) continue;

    const config = BUILDINGS[building.type];
    if (!config || building.level >= config.maxLevel) continue;

    const cost = getBuildingCost(building.type, building.level);
    let canAfford = true;
    for (const [res, amount] of Object.entries(cost)) {
      if ((resources[res as keyof Resources] || 0) < (amount as number)) {
        canAfford = false;
        break;
      }
    }

    const production = getBuildingProduction(building.type, building.level);
    const nextProduction = getBuildingProduction(building.type, building.level + 1);
    const productionGain: Partial<Resources> = {};
    for (const key of Object.keys(nextProduction) as ResourceType[]) {
      productionGain[key] = (nextProduction[key] || 0) - (production[key] || 0);
    }

    hints.push({
      buildingId: building.id,
      buildingType: building.type,
      currentLevel: building.level,
      nextLevel: building.level + 1,
      canAfford,
      productionGain,
      cost,
    });
  }

  return hints.sort((a, b) => {
    if (a.canAfford && !b.canAfford) return -1;
    if (!a.canAfford && b.canAfford) return 1;
    return 0;
  });
};

export const getRequirementDescription = (req: BuildingRequirement): string => {
  switch (req.type) {
    case 'building': {
      const buildingName = BUILDINGS[req.id!]?.name || req.id;
      return `需要 ${buildingName} Lv.${req.level || 1}`;
    }
    case 'day':
      return `需要第 ${req.amount} 天`;
    case 'population':
      return `需要 ${req.amount} 人口`;
    case 'tech':
      return `需要科技: ${req.id}`;
    default:
      return '未知条件';
  }
};
