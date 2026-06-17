import type {
  RiskEvent,
  RiskEventType,
  TradeRoute,
  RouteDifficulty,
  ResourceType,
  PriceFluctuation,
} from '../types';

export const RISK_EVENTS: Record<RiskEventType, RiskEvent> = {
  bandit_attack: {
    id: 'bandit_attack',
    name: '强盗袭击',
    icon: '🗡️',
    description: '一群强盗伏击了商队，试图抢夺货物',
    baseChance: 0.15,
    resourceLossPercent: { food: 0.3, gold: 0.4, iron: 0.5, wood: 0.2, stone: 0.1 },
    goldLoss: 20,
    warriorCasualtyChance: 0.3,
    reputationChange: -5,
    difficultyModifier: { safe: 0.5, normal: 1, dangerous: 1.5, deadly: 2 }
  },
  storm: {
    id: 'storm',
    name: '暴风雨',
    icon: '⛈️',
    description: '猛烈的暴风雨延缓了行程并损坏了部分货物',
    baseChance: 0.12,
    resourceLossPercent: { food: 0.4, wood: 0.3, gold: 0.1, stone: 0.1, iron: 0.1 },
    goldLoss: 10,
    warriorCasualtyChance: 0.1,
    reputationChange: 0,
    difficultyModifier: { safe: 0.8, normal: 1, dangerous: 1.3, deadly: 1.8 }
  },
  landslide: {
    id: 'landslide',
    name: '山体滑坡',
    icon: '🏔️',
    description: '山路发生滑坡阻塞了道路，商队被迫绕行',
    baseChance: 0.08,
    resourceLossPercent: { food: 0.2, wood: 0.1, stone: 0.1, gold: 0.1, iron: 0.2 },
    goldLoss: 15,
    warriorCasualtyChance: 0.2,
    reputationChange: 0,
    difficultyModifier: { safe: 0.3, normal: 1, dangerous: 1.8, deadly: 2.5 }
  },
  beast_attack: {
    id: 'beast_attack',
    name: '野兽袭击',
    icon: '🐺',
    description: '凶猛的野兽攻击了商队',
    baseChance: 0.1,
    resourceLossPercent: { food: 0.5, gold: 0.2, wood: 0.1, stone: 0.1, iron: 0.1 },
    goldLoss: 5,
    warriorCasualtyChance: 0.4,
    reputationChange: -3,
    difficultyModifier: { safe: 0.4, normal: 1, dangerous: 1.6, deadly: 2.2 }
  },
  customs_check: {
    id: 'customs_check',
    name: '海关检查',
    icon: '🛃',
    description: '边境关卡要求缴纳通行税',
    baseChance: 0.2,
    resourceLossPercent: { gold: 0.15 },
    goldLoss: 30,
    warriorCasualtyChance: 0,
    reputationChange: 0,
    difficultyModifier: { safe: 0.5, normal: 1, dangerous: 1.5, deadly: 2 }
  },
  plague: {
    id: 'plague',
    name: '瘟疫',
    icon: '☠️',
    description: '商队成员染上了瘟疫',
    baseChance: 0.05,
    resourceLossPercent: { food: 0.3, gold: 0.2, wood: 0.1, stone: 0.1, iron: 0.1 },
    goldLoss: 25,
    warriorCasualtyChance: 0.5,
    reputationChange: -10,
    difficultyModifier: { safe: 0.2, normal: 1, dangerous: 2, deadly: 3 }
  },
  betrayal: {
    id: 'betrayal',
    name: '背叛',
    icon: '💔',
    description: '商队中出现了叛徒，企图私吞货物',
    baseChance: 0.03,
    resourceLossPercent: { gold: 0.6, food: 0.2, iron: 0.3, wood: 0.1, stone: 0.1 },
    goldLoss: 50,
    warriorCasualtyChance: 0.2,
    reputationChange: -15,
    difficultyModifier: { safe: 0.1, normal: 1, dangerous: 2.5, deadly: 4 }
  }
};

export const TRADE_ROUTES: TradeRoute[] = [
  {
    id: 'ironclaw_route',
    name: '铁爪贸易线',
    icon: '⚒️',
    description: '通往铁爪部落的安全贸易路线，以铁矿和石料闻名',
    destination: '铁爪部落',
    destinationFaction: 'ironclaw',
    distance: 100,
    travelTime: 60,
    difficulty: 'safe',
    riskEvents: ['bandit_attack', 'storm', 'customs_check'],
    resourceDemand: ['food', 'wood'],
    resourceSupply: ['iron', 'stone'],
    priceBonus: 0.15,
    unlockDay: 5,
    unlocked: false
  },
  {
    id: 'shadowfang_route',
    name: '影牙商道',
    icon: '🌙',
    description: '穿越阴影森林的贸易路线，充满未知危险',
    destination: '影牙部落',
    destinationFaction: 'shadowfang',
    distance: 150,
    travelTime: 90,
    difficulty: 'normal',
    riskEvents: ['beast_attack', 'bandit_attack', 'storm', 'betrayal'],
    resourceDemand: ['stone', 'gold'],
    resourceSupply: ['wood', 'food'],
    priceBonus: 0.25,
    riskReductionBuilding: 'caravanserai',
    unlockDay: 10,
    requiredReputation: 30,
    unlocked: false
  },
  {
    id: 'sunhorn_route',
    name: '太阳之路',
    icon: '☀️',
    description: '通往富饶的太阳角部落的繁荣商路',
    destination: '太阳角部落',
    destinationFaction: 'sunhorn',
    distance: 180,
    travelTime: 100,
    difficulty: 'normal',
    riskEvents: ['storm', 'customs_check', 'plague'],
    resourceDemand: ['iron', 'wood'],
    resourceSupply: ['food', 'gold'],
    priceBonus: 0.3,
    unlockDay: 15,
    requiredReputation: 40,
    unlocked: false
  },
  {
    id: 'moonscar_route',
    name: '月痕险途',
    icon: '🌕',
    description: '穿越险峻山脉的危险贸易路线',
    destination: '月痕部落',
    destinationFaction: 'moonscar',
    distance: 220,
    travelTime: 120,
    difficulty: 'dangerous',
    riskEvents: ['landslide', 'beast_attack', 'storm', 'bandit_attack'],
    resourceDemand: ['food', 'stone'],
    resourceSupply: ['iron', 'gold'],
    priceBonus: 0.45,
    riskReductionBuilding: 'caravanserai',
    unlockDay: 20,
    requiredReputation: 50,
    unlocked: false
  },
  {
    id: 'bloodtooth_route',
    name: '血牙绝路',
    icon: '🦷',
    description: '最危险的贸易路线，但利润也最丰厚',
    destination: '血牙部落',
    destinationFaction: 'bloodtooth',
    distance: 300,
    travelTime: 150,
    difficulty: 'deadly',
    riskEvents: ['bandit_attack', 'beast_attack', 'betrayal', 'plague', 'landslide'],
    resourceDemand: ['gold', 'iron', 'food'],
    resourceSupply: ['gold', 'stone', 'iron'],
    priceBonus: 0.7,
    riskReductionBuilding: 'caravanserai',
    unlockDay: 30,
    requiredReputation: 70,
    unlocked: false
  },
  {
    id: 'coastal_route',
    name: '海岸商路',
    icon: '🏖️',
    description: '沿着海岸线的安全贸易路线',
    destination: '海岸集市',
    distance: 120,
    travelTime: 75,
    difficulty: 'safe',
    riskEvents: ['storm', 'customs_check'],
    resourceDemand: ['stone', 'iron'],
    resourceSupply: ['food', 'wood'],
    priceBonus: 0.2,
    unlockDay: 8,
    unlocked: false
  }
];

export const BASE_PRICES: Record<ResourceType, number> = {
  food: 5,
  wood: 4,
  stone: 6,
  gold: 10,
  iron: 15
};

export const createInitialPriceFluctuations = (): Record<ResourceType, PriceFluctuation> => {
  const resources: ResourceType[] = ['food', 'wood', 'stone', 'gold', 'iron'];
  const fluctuations: Partial<Record<ResourceType, PriceFluctuation>> = {};
  
  for (const resource of resources) {
    fluctuations[resource] = {
      resource,
      currentMultiplier: 1,
      trend: 'stable',
      volatility: 0.1,
      nextUpdateAt: Date.now() + 60000
    };
  }
  
  return fluctuations as Record<ResourceType, PriceFluctuation>;
};

export const getRiskChance = (
  event: RiskEvent,
  routeDifficulty: RouteDifficulty,
  hasCaravanserai: boolean,
  warriorCount: number
): number => {
  const difficultyMod = event.difficultyModifier?.[routeDifficulty] ?? 1;
  const caravanseraiMod = hasCaravanserai ? 0.7 : 1;
  const warriorMod = Math.max(0.5, 1 - warriorCount * 0.05);
  return event.baseChance * difficultyMod * caravanseraiMod * warriorMod;
};

export const calculateRoutePriceBonus = (
  route: TradeRoute,
  _priceFluctuations: Record<ResourceType, PriceFluctuation>,
  factions: any
): number => {
  let bonus = route.priceBonus;
  
  const faction = route.destinationFaction ? factions[route.destinationFaction] : null;
  if (faction) {
    if (faction.stance === 'ally') bonus += 0.2;
    else if (faction.stance === 'friendly') bonus += 0.1;
    else if (faction.stance === 'enemy') bonus -= 0.15;
  }
  
  return bonus;
};

export const generateBlackMarketOffer = (
  priceFluctuations: Record<ResourceType, PriceFluctuation>,
  _day: number
): any => {
  const resources: ResourceType[] = ['food', 'wood', 'stone', 'gold', 'iron'];
  const giveResource = resources[Math.floor(Math.random() * resources.length)];
  let receiveResource = resources[Math.floor(Math.random() * resources.length)];
  while (receiveResource === giveResource) {
    receiveResource = resources[Math.floor(Math.random() * resources.length)];
  }

  const isBuy = Math.random() > 0.5;
  const baseAmount = Math.floor(Math.random() * 100) + 50;
  const blackMarketMultiplier = 0.5 + Math.random() * 0.5;
  
  const givePrice = BASE_PRICES[giveResource];
  const receivePrice = BASE_PRICES[receiveResource];
  const ratio = (receivePrice / givePrice) * blackMarketMultiplier * 
    (isBuy ? (1 / priceFluctuations[giveResource].currentMultiplier) : priceFluctuations[receiveResource].currentMultiplier);

  return {
    id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    tradeOffer: {
      id: `trade-bm-${Date.now()}`,
      type: isBuy ? 'buy' : 'sell',
      give: {
        resource: isBuy ? receiveResource : giveResource,
        amount: Math.floor(baseAmount * (isBuy ? ratio : 1))
      },
      receive: {
        resource: isBuy ? giveResource : receiveResource,
        amount: Math.floor(baseAmount * (isBuy ? 1 : ratio))
      },
      stock: Math.floor(Math.random() * 3) + 1,
      basePrice: Math.floor(givePrice * baseAmount),
      currentPriceMultiplier: blackMarketMultiplier,
      isBlackMarket: true,
      expiresAt: Date.now() + 120000
    },
    riskLevel: Math.random() > 0.7 ? 3 : Math.random() > 0.4 ? 2 : 1,
    detectionChance: 0.1 + Math.random() * 0.3,
    reputationPenalty: 10 + Math.floor(Math.random() * 20),
    expiresAt: Date.now() + 120000,
    isDiscovered: false
  };
};

export const getInitialTradeRoutes = (day: number, factions: any): TradeRoute[] => {
  return TRADE_ROUTES.map(route => {
    const faction = route.destinationFaction ? factions[route.destinationFaction] : null;
    const reputation = faction?.reputation ?? 0;
    const unlocked = day >= route.unlockDay && 
      (!route.requiredReputation || reputation >= route.requiredReputation);
    
    return { ...route, unlocked };
  });
};

export const getDifficultyColor = (difficulty: RouteDifficulty): string => {
  switch (difficulty) {
    case 'safe': return '#22c55e';
    case 'normal': return '#eab308';
    case 'dangerous': return '#f97316';
    case 'deadly': return '#ef4444';
  }
};

export const getDifficultyName = (difficulty: RouteDifficulty): string => {
  switch (difficulty) {
    case 'safe': return '安全';
    case 'normal': return '普通';
    case 'dangerous': return '危险';
    case 'deadly': return '致命';
  }
};

export const NEGOTIATION_CONFIG = {
  maxAttempts: 3,
  baseSuccessChance: 0.6,
  moodDecayPerAttempt: 0.15,
  maxPriceImprovement: 0.25,
  minPriceImprovement: 0.05
};

export const CARAVAN_CONFIG = {
  baseWarriorRequirement: 2,
  baseCargoCapacity: 200,
  caravanseraiCapacityBonus: 100,
  maxCaravansBase: 1,
  maxCaravansPerCaravanserai: 1
};
