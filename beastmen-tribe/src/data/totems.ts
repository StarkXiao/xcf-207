import type {
  TotemConfig,
  TotemType,
  BlessingEffect,
  BlessingType,
  TotemOffer,
  TotemState,
  TotemUnlocked,
  BuildingType,
} from '../types';

export const BASE_FAITH_PER_SECOND = 0.1;
export const DEFAULT_MAX_FAITH = 500;

export const TOTEM_OFFERS: TotemOffer[] = [
  {
    id: 'offer_food',
    totemId: 'ancestor',
    name: '食物献祭',
    icon: '🍖',
    description: '向祖先献上丰足的食物',
    faithReward: 25,
    resourceCost: { food: 50 },
    cooldown: 30,
  },
  {
    id: 'offer_wood',
    totemId: 'wolf',
    name: '木材献祭',
    icon: '🪵',
    description: '献上优质木材用于雕刻图腾',
    faithReward: 20,
    resourceCost: { wood: 50 },
    cooldown: 25,
  },
  {
    id: 'offer_stone',
    totemId: 'bear',
    name: '石料献祭',
    icon: '⛰️',
    description: '献上坚固石料用于建造圣殿',
    faithReward: 30,
    resourceCost: { stone: 40 },
    cooldown: 35,
  },
  {
    id: 'offer_gold',
    totemId: 'sun',
    name: '黄金献祭',
    icon: '💰',
    description: '献上闪耀黄金取悦太阳',
    faithReward: 60,
    resourceCost: { gold: 30 },
    cooldown: 60,
  },
  {
    id: 'offer_iron',
    totemId: 'eagle',
    name: '兵器献祭',
    icon: '⚔️',
    description: '献上精良兵器彰显武勇',
    faithReward: 50,
    resourceCost: { iron: 20 },
    cooldown: 50,
  },
  {
    id: 'offer_blood',
    totemId: 'snake',
    name: '血祭仪式',
    icon: '🩸',
    description: '古老的血祭，获取强大力量',
    faithReward: 100,
    resourceCost: { food: 100, iron: 10, gold: 20 },
    cooldown: 120,
  },
  {
    id: 'offer_harvest',
    totemId: 'moon',
    name: '丰收献祭',
    icon: '🌾',
    description: '献上丰收果实祈求月神庇佑',
    faithReward: 75,
    resourceCost: { food: 80, wood: 40, stone: 30 },
    cooldown: 90,
  },
  {
    id: 'offer_crow',
    totemId: 'crow',
    name: '暗影献祭',
    icon: '🦴',
    description: '向乌鸦之神献上稀有贡品',
    faithReward: 90,
    resourceCost: { gold: 50, iron: 25, stone: 30 },
    cooldown: 100,
  },
];

export const BLESSINGS: Record<BlessingType, BlessingEffect> = {
  war_banner: {
    type: 'war_banner',
    name: '战旗高扬',
    description: '所有战士攻击力+25%，持续180秒',
    icon: '🚩',
    duration: 180,
    effects: [{ type: 'attack_boost', value: 0.25 }],
    faithCost: 80,
    requires: { totem: 'wolf', building: 'totem_altar', minFaith: 80 },
  },
  iron_skin: {
    type: 'iron_skin',
    name: '钢铁之躯',
    description: '所有战士防御力+30%，生命值+20%，持续180秒',
    icon: '🛡️',
    duration: 180,
    effects: [
      { type: 'defense_boost', value: 0.3 },
      { type: 'hp_boost', value: 0.2 },
    ],
    faithCost: 100,
    requires: { totem: 'bear', building: 'totem_altar', minFaith: 100 },
  },
  bloodlust: {
    type: 'bloodlust',
    name: '嗜血狂暴',
    description: '狂战士攻击力+40%，生命+30%，持续180秒',
    icon: '🩸',
    duration: 180,
    effects: [
      { type: 'attack_boost', value: 0.4, target: 'berserker' },
      { type: 'hp_boost', value: 0.3, target: 'berserker' },
    ],
    faithCost: 120,
    requires: { totem: 'snake', building: 'shrine', minFaith: 120 },
  },
  ancestor_guidance: {
    type: 'ancestor_guidance',
    name: '先祖指引',
    description: '经验获取+50%，战士训练速度+30%，持续300秒',
    icon: '👁️',
    duration: 300,
    effects: [
      { type: 'exp_bonus', value: 0.5 },
      { type: 'train_speed', value: 0.3 },
    ],
    faithCost: 90,
    requires: { totem: 'ancestor', building: 'totem_pole', minFaith: 90 },
  },
  fertility: {
    type: 'fertility',
    name: '大地丰产',
    description: '人口增长速度+100%，忠诚度+15，持续300秒',
    icon: '🌱',
    duration: 300,
    effects: [
      { type: 'population_growth', value: 1.0 },
      { type: 'loyalty_boost', value: 15 },
    ],
    faithCost: 70,
    requires: { totem: 'moon', building: 'totem_pole', minFaith: 70 },
  },
  harvest: {
    type: 'harvest',
    name: '丰收祝福',
    description: '所有资源产出+30%，食物消耗-20%，持续300秒',
    icon: '🌾',
    duration: 300,
    effects: [
      { type: 'production_boost', value: 0.3 },
      { type: 'food_consumption', value: -0.2 },
    ],
    faithCost: 85,
    requires: { totem: 'sun', building: 'shrine', minFaith: 85 },
  },
  shield_of_faith: {
    type: 'shield_of_faith',
    name: '信仰之盾',
    description: '城墙防御力+60%，所有战士防御+15%，持续180秒',
    icon: '🛡️',
    duration: 180,
    effects: [
      { type: 'wall_defense', value: 0.6 },
      { type: 'defense_boost', value: 0.15 },
    ],
    faithCost: 110,
    requires: { totem: 'eagle', building: 'totem_altar', minFaith: 110 },
  },
  storm_call: {
    type: 'storm_call',
    name: '暴风召唤',
    description: '猎手攻击力+35%，远征战利品+40%，持续240秒',
    icon: '🌪️',
    duration: 240,
    effects: [
      { type: 'attack_boost', value: 0.35, target: 'archer' },
      { type: 'loot_bonus', value: 0.4 },
    ],
    faithCost: 130,
    requires: { totem: 'crow', building: 'shrine', minFaith: 130 },
  },
};

export const TOTEMS: Record<TotemType, TotemConfig> = {
  wolf: {
    id: 'wolf',
    name: '狼图腾',
    description: '狩猎之神的化身，提升战士攻击力与资源采集',
    icon: '🐺',
    tier: 1,
    baseCost: { wood: 150, stone: 100 },
    faithCost: 50,
    requires: { building: 'totem_altar' },
    effects: [
      { type: 'attack_boost', value: 0.08 },
      { type: 'production_boost', value: 0.05, target: 'farm' },
    ],
    blessingEffect: BLESSINGS.war_banner,
  },
  bear: {
    id: 'bear',
    name: '熊图腾',
    description: '力量之神的化身，提升防御与生命值',
    icon: '🐻',
    tier: 1,
    baseCost: { wood: 120, stone: 180 },
    faithCost: 60,
    requires: { building: 'totem_altar' },
    effects: [
      { type: 'defense_boost', value: 0.1 },
      { type: 'hp_boost', value: 0.08 },
    ],
    blessingEffect: BLESSINGS.iron_skin,
  },
  eagle: {
    id: 'eagle',
    name: '鹰图腾',
    description: '天空之神的化身，提升远程与侦查能力',
    icon: '🦅',
    tier: 2,
    baseCost: { wood: 200, stone: 150, gold: 50 },
    faithCost: 100,
    requires: { totem: 'wolf', building: 'totem_altar' },
    effects: [
      { type: 'attack_boost', value: 0.12, target: 'archer' },
      { type: 'wall_defense', value: 0.15 },
    ],
    blessingEffect: BLESSINGS.shield_of_faith,
  },
  snake: {
    id: 'snake',
    name: '蛇图腾',
    description: '重生与力量的象征，激发狂暴潜力',
    icon: '🐍',
    tier: 2,
    baseCost: { wood: 180, stone: 120, gold: 80, iron: 20 },
    faithCost: 120,
    requires: { totem: 'bear', building: 'totem_pole' },
    effects: [
      { type: 'attack_boost', value: 0.15, target: 'berserker' },
      { type: 'hp_boost', value: 0.1, target: 'berserker' },
      { type: 'loot_bonus', value: 0.1 },
    ],
    blessingEffect: BLESSINGS.bloodlust,
  },
  crow: {
    id: 'crow',
    name: '乌鸦图腾',
    description: '智慧与预言的使者，带来远征战利',
    icon: '🦅',
    tier: 3,
    baseCost: { gold: 150, iron: 40, stone: 200 },
    faithCost: 180,
    requires: { totem: 'eagle', building: 'shrine', faith: 200 },
    effects: [
      { type: 'loot_bonus', value: 0.2 },
      { type: 'exp_bonus', value: 0.15 },
      { type: 'attack_boost', value: 0.1, target: 'archer' },
    ],
    blessingEffect: BLESSINGS.storm_call,
  },
  sun: {
    id: 'sun',
    name: '太阳图腾',
    description: '光明与丰饶之神，带来繁荣与丰收',
    icon: '☀️',
    tier: 2,
    baseCost: { stone: 200, gold: 100, wood: 150 },
    faithCost: 140,
    requires: { building: 'totem_pole', faith: 100 },
    effects: [
      { type: 'production_boost', value: 0.1 },
      { type: 'loyalty_boost', value: 0.05 },
    ],
    blessingEffect: BLESSINGS.harvest,
  },
  moon: {
    id: 'moon',
    name: '月亮图腾',
    description: '夜晚与繁衍之神，庇佑人口增长',
    icon: '🌙',
    tier: 2,
    baseCost: { stone: 180, gold: 80, food: 100 },
    faithCost: 130,
    requires: { building: 'totem_pole', faith: 100 },
    effects: [
      { type: 'population_growth', value: 0.3 },
      { type: 'food_consumption', value: -0.1 },
    ],
    blessingEffect: BLESSINGS.fertility,
  },
  ancestor: {
    id: 'ancestor',
    name: '祖先图腾',
    description: '先祖英灵的庇佑，传承智慧与经验',
    icon: '🏺',
    tier: 4,
    baseCost: { gold: 300, iron: 80, stone: 300, wood: 200 },
    faithCost: 250,
    requires: { totem: 'sun', totem2: 'moon', building: 'shrine', faith: 300 } as any,
    effects: [
      { type: 'exp_bonus', value: 0.2 },
      { type: 'train_speed', value: 0.15 },
      { type: 'hp_boost', value: 0.05 },
      { type: 'attack_boost', value: 0.05 },
    ],
    blessingEffect: BLESSINGS.ancestor_guidance,
  },
};

export const getTotemCost = (totemId: TotemType, level: number): Partial<Record<string, number>> => {
  const config = TOTEMS[totemId];
  if (!config) return {};
  const multiplier = Math.pow(1.6, level);
  const cost: Partial<Record<string, number>> = {};
  for (const [resource, amount] of Object.entries(config.baseCost)) {
    cost[resource] = Math.floor((amount as number) * multiplier);
  }
  return cost;
};

export const getTotemFaithCost = (totemId: TotemType, level: number): number => {
  const config = TOTEMS[totemId];
  if (!config) return 0;
  return Math.floor(config.faithCost * Math.pow(1.5, level));
};

export const getTotemEffectBonus = (
  unlockedTotems: { totemId: TotemType; activated: boolean; level: number }[],
  effectType: string,
  target?: string
): number => {
  let bonus = 0;
  for (const unlocked of unlockedTotems) {
    if (!unlocked.activated) continue;
    const config = TOTEMS[unlocked.totemId];
    if (!config) continue;
    for (const effect of config.effects) {
      if (effect.type === effectType) {
        if (!effect.target || effect.target === target) {
          bonus += effect.value * (1 + (unlocked.level - 1) * 0.3);
        }
      }
    }
  }
  return bonus;
};

export const getBlessingBonus = (
  activeBlessings: { effects: { type: string; value: number; target?: string }[] }[],
  effectType: string,
  target?: string
): number => {
  let bonus = 0;
  for (const blessing of activeBlessings) {
    for (const effect of blessing.effects) {
      if (effect.type === effectType) {
        if (!effect.target || effect.target === target) {
          bonus += effect.value;
        }
      }
    }
  }
  return bonus;
};

export const createInitialTotemState = (): TotemState => ({
  faith: 0,
  maxFaith: DEFAULT_MAX_FAITH,
  unlockedTotems: [],
  activeBlessings: [],
  availableBlessings: [],
  offers: TOTEM_OFFERS,
  offerCooldowns: {},
  accumulation: {
    lastTick: Date.now(),
    perSecond: BASE_FAITH_PER_SECOND,
  },
  totalFaithGained: 0,
  totalOfferings: 0,
  totalBlessings: 0,
});

export const getFaithPerSecond = (
  buildings: { type: BuildingType; level: number; isBuilding: boolean }[],
  unlockedTotems: { totemId: TotemType; activated: boolean; level: number }[]
): number => {
  let base = BASE_FAITH_PER_SECOND;
  const altar = buildings.filter((b) => b.type === 'totem_altar' && !b.isBuilding);
  for (const a of altar) {
    base += 0.15 * a.level;
  }
  const pole = buildings.filter((b) => b.type === 'totem_pole' && !b.isBuilding);
  for (const p of pole) {
    base += 0.1 * p.level;
  }
  const shrine = buildings.filter((b) => b.type === 'shrine' && !b.isBuilding);
  for (const s of shrine) {
    base += 0.25 * s.level;
  }
  base += getTotemEffectBonus(unlockedTotems, 'faith_gain');
  return base;
};

export const getMaxFaith = (
  buildings: { type: BuildingType; level: number; isBuilding: boolean }[]
): number => {
  let max = DEFAULT_MAX_FAITH;
  const altar = buildings.filter((b) => b.type === 'totem_altar' && !b.isBuilding);
  for (const a of altar) {
    max += 200 * a.level;
  }
  const pole = buildings.filter((b) => b.type === 'totem_pole' && !b.isBuilding);
  for (const p of pole) {
    max += 150 * p.level;
  }
  const shrine = buildings.filter((b) => b.type === 'shrine' && !b.isBuilding);
  for (const s of shrine) {
    max += 400 * s.level;
  }
  return max;
};

export const canUnlockTotem = (
  totemId: TotemType,
  unlockedTotems: TotemUnlocked[],
  buildings: { type: BuildingType; level: number; isBuilding: boolean }[],
  currentFaith: number
): { canUnlock: boolean; reason?: string } => {
  const config = TOTEMS[totemId];
  if (!config) return { canUnlock: false, reason: '未知图腾' };
  if (unlockedTotems.some((t) => t.totemId === totemId)) {
    return { canUnlock: false, reason: '已解锁该图腾' };
  }
  if (config.requires?.building) {
    const hasBuilding = buildings.some(
      (b) => b.type === config.requires!.building && !b.isBuilding
    );
    if (!hasBuilding) {
      const buildingNames: Record<string, string> = {
        totem_altar: '图腾祭坛',
        totem_pole: '图腾柱',
        shrine: '圣殿',
      };
      return { canUnlock: false, reason: `需要建造${buildingNames[config.requires.building]}` };
    }
  }
  if (config.requires?.totem) {
    const hasTotem = unlockedTotems.some((t) => t.totemId === config.requires!.totem);
    if (!hasTotem) {
      return { canUnlock: false, reason: `需要先解锁${TOTEMS[config.requires.totem].name}` };
    }
  }
  const reqAny = config.requires as any;
  if (reqAny?.totem2) {
    const hasTotem2 = unlockedTotems.some((t) => t.totemId === reqAny.totem2);
    if (!hasTotem2) {
      const reqTotemConfig = TOTEMS[reqAny.totem2 as TotemType];
      return { canUnlock: false, reason: `需要先解锁${reqTotemConfig?.name || '前置图腾'}` };
    }
  }
  if (config.requires?.faith && currentFaith < config.requires.faith) {
    return { canUnlock: false, reason: `信仰值不足（需要${config.requires.faith}）` };
  }
  return { canUnlock: true };
};

export const canActivateBlessing = (
  blessingType: BlessingType,
  unlockedTotems: TotemUnlocked[],
  buildings: { type: BuildingType; level: number; isBuilding: boolean }[],
  currentFaith: number
): { canActivate: boolean; reason?: string } => {
  const blessing = BLESSINGS[blessingType];
  if (!blessing) return { canActivate: false, reason: '未知祝福' };
  if (blessing.requires?.totem) {
    const totemUnlocked = unlockedTotems.find((t) => t.totemId === blessing.requires!.totem);
    if (!totemUnlocked || !totemUnlocked.activated) {
      return { canActivate: false, reason: `需要激活${TOTEMS[blessing.requires.totem].name}` };
    }
  }
  if (blessing.requires?.building) {
    const hasBuilding = buildings.some(
      (b) => b.type === blessing.requires!.building && !b.isBuilding
    );
    if (!hasBuilding) {
      const buildingNames: Record<string, string> = {
        totem_altar: '图腾祭坛',
        totem_pole: '图腾柱',
        shrine: '圣殿',
      };
      return { canActivate: false, reason: `需要建造${buildingNames[blessing.requires.building]}` };
    }
  }
  if (blessing.requires?.minFaith && currentFaith < blessing.requires.minFaith) {
    return { canActivate: false, reason: `信仰值不足（需要${blessing.requires.minFaith}）` };
  }
  if (currentFaith < blessing.faithCost) {
    return { canActivate: false, reason: `信仰值不足（需要${blessing.faithCost}）` };
  }
  return { canActivate: true };
};

export const getAvailableBlessings = (
  unlockedTotems: TotemUnlocked[]
): BlessingType[] => {
  const available: BlessingType[] = [];
  for (const unlocked of unlockedTotems) {
    if (!unlocked.activated) continue;
    const config = TOTEMS[unlocked.totemId as TotemType];
    if (config?.blessingEffect) {
      available.push(config.blessingEffect.type);
    }
  }
  return available;
};
