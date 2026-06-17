import type { TribeEventConfig } from '../types';

export const TRIBE_EVENTS: TribeEventConfig[] = [
  {
    id: 'harvest_blessing',
    name: '丰收祝福',
    description: '祖灵赐予丰收，食物大幅增加！',
    icon: '🌾',
    effects: [
      { type: 'food_change', value: 80 },
      { type: 'loyalty_change', value: 5 },
    ],
    minDay: 1,
    weight: 8,
  },
  {
    id: 'wandering_clan',
    name: '流浪部族',
    description: '一支流浪部族请求加入你的部落。',
    icon: '🚶',
    effects: [
      { type: 'migration', value: 3 },
      { type: 'food_change', value: -20 },
    ],
    minDay: 3,
    weight: 6,
  },
  {
    id: 'plague_outbreak',
    name: '瘟疫爆发',
    description: '疾病在部落中蔓延，人口和忠诚下降！',
    icon: '☠️',
    effects: [
      { type: 'plague', value: 2 },
      { type: 'loyalty_change', value: -15 },
    ],
    minDay: 5,
    maxLoyalty: 60,
    weight: 3,
  },
  {
    id: 'great_feast',
    name: '盛大宴会',
    description: '举办盛大宴会庆祝，消耗食物但大幅提升忠诚！',
    icon: '🎉',
    effects: [
      { type: 'food_change', value: -60 },
      { type: 'festival', value: 20 },
    ],
    minDay: 2,
    minLoyalty: 30,
    weight: 5,
  },
  {
    id: 'iron_deposit',
    name: '铁矿发现',
    description: '矿工发现了新的铁矿脉！',
    icon: '⛏️',
    effects: [
      { type: 'resource_change', value: 30, resource: 'iron' },
      { type: 'loyalty_change', value: 3 },
    ],
    minDay: 4,
    weight: 4,
  },
  {
    id: 'raider_raid',
    name: '盗匪劫掠',
    description: '盗匪趁夜袭击了部落，抢走部分资源！',
    icon: '🗡️',
    effects: [
      { type: 'resource_change', value: -40, resource: 'food' },
      { type: 'resource_change', value: -20, resource: 'gold' },
      { type: 'loyalty_change', value: -10 },
    ],
    minDay: 6,
    maxLoyalty: 70,
    weight: 4,
  },
  {
    id: 'war_drums',
    name: '战鼓激昂',
    description: '战争号角响彻部落，征兵效率大幅提升！',
    icon: '🥁',
    effects: [
      { type: 'recruit_boost', value: 0.5 },
      { type: 'loyalty_change', value: 8 },
    ],
    minDay: 5,
    minLoyalty: 40,
    weight: 5,
  },
  {
    id: 'drought',
    name: '旱灾降临',
    description: '持续的干旱导致食物减产，忠诚下降！',
    icon: '☀️',
    effects: [
      { type: 'food_change', value: -50 },
      { type: 'loyalty_change', value: -12 },
    ],
    minDay: 8,
    maxLoyalty: 65,
    weight: 3,
  },
  {
    id: 'trade_caravan',
    name: '商队到访',
    description: '远方商队带来丰厚物资！',
    icon: '🐪',
    effects: [
      { type: 'resource_change', value: 40, resource: 'gold' },
      { type: 'resource_change', value: 20, resource: 'wood' },
      { type: 'loyalty_change', value: 5 },
    ],
    minDay: 3,
    weight: 6,
  },
  {
    id: 'shaman_vision',
    name: '巫医预言',
    description: '巫医的神秘预言增强了部落的信心！',
    icon: '🔮',
    effects: [
      { type: 'loyalty_change', value: 15 },
      { type: 'recruit_boost', value: 0.3 },
    ],
    minDay: 7,
    minLoyalty: 35,
    weight: 4,
  },
  {
    id: 'deserters',
    name: '部落逃亡',
    description: '不满的族人趁夜逃离了部落！',
    icon: '🏃',
    effects: [
      { type: 'population_change', value: -3 },
      { type: 'loyalty_change', value: -5 },
    ],
    minDay: 5,
    maxLoyalty: 40,
    weight: 3,
  },
  {
    id: 'new_born',
    name: '婴儿潮',
    description: '部落迎来了一批新生儿，人丁兴旺！',
    icon: '👶',
    effects: [
      { type: 'population_change', value: 2 },
      { type: 'loyalty_change', value: 5 },
    ],
    minDay: 4,
    minLoyalty: 50,
    weight: 5,
  },
  {
    id: 'gold_vein',
    name: '金矿脉发现',
    description: '矿工在山中发现了金矿脉！',
    icon: '✨',
    effects: [
      { type: 'resource_change', value: 60, resource: 'gold' },
      { type: 'loyalty_change', value: 6 },
    ],
    minDay: 10,
    weight: 3,
  },
  {
    id: 'beast_attack',
    name: '野兽袭击',
    description: '猛兽袭击了部落外围，造成了一些损失！',
    icon: '🐻',
    effects: [
      { type: 'population_change', value: -1 },
      { type: 'resource_change', value: -25, resource: 'food' },
      { type: 'loyalty_change', value: -8 },
    ],
    minDay: 3,
    weight: 5,
  },
];

export const triggerRandomEvent = (
  day: number,
  loyalty: number,
  population: number
): TribeEventConfig | null => {
  if (population <= 0) return null;

  const eligible = TRIBE_EVENTS.filter((e) => {
    if (day < e.minDay) return false;
    if (e.minLoyalty !== undefined && loyalty < e.minLoyalty) return false;
    if (e.maxLoyalty !== undefined && loyalty > e.maxLoyalty) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const event of eligible) {
    roll -= event.weight;
    if (roll <= 0) return event;
  }

  return eligible[eligible.length - 1];
};
