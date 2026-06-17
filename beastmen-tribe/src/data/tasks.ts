import type { TaskConfig } from '../types';

export const TASK_CONFIGS: TaskConfig[] = [
  {
    id: 'collect_food_1',
    name: '粮仓充盈',
    description: '收集大量食物确保部落过冬',
    icon: '🌾',
    goal: { type: 'collect_resource', target: 'food', amount: 200 },
    stages: [
      { index: 0, requiredProgress: 50, reward: { food: 30 }, bonusLoyalty: 2 },
      { index: 1, requiredProgress: 120, reward: { food: 60, wood: 20 }, bonusLoyalty: 3 },
      { index: 2, requiredProgress: 200, reward: { food: 100, gold: 30 }, bonusLoyalty: 5 },
    ],
    failurePenalty: { food: -50 },
    penaltyLoyalty: -3,
    duration: 2,
  },
  {
    id: 'collect_wood_1',
    name: '伐木季节',
    description: '为即将到来的建筑工程储备木材',
    icon: '🪓',
    goal: { type: 'collect_resource', target: 'wood', amount: 150 },
    stages: [
      { index: 0, requiredProgress: 40, reward: { wood: 25 }, bonusLoyalty: 2 },
      { index: 1, requiredProgress: 90, reward: { wood: 50, stone: 15 }, bonusLoyalty: 3 },
      { index: 2, requiredProgress: 150, reward: { wood: 80, iron: 10 }, bonusLoyalty: 5 },
    ],
    failurePenalty: { wood: -40 },
    penaltyLoyalty: -3,
    duration: 2,
  },
  {
    id: 'collect_stone_1',
    name: '石料开采',
    description: '采集石料加固部落防御',
    icon: '⛏️',
    goal: { type: 'collect_resource', target: 'stone', amount: 100 },
    stages: [
      { index: 0, requiredProgress: 30, reward: { stone: 20 }, bonusLoyalty: 2 },
      { index: 1, requiredProgress: 60, reward: { stone: 40, gold: 15 }, bonusLoyalty: 3 },
      { index: 2, requiredProgress: 100, reward: { stone: 60, iron: 10 }, bonusLoyalty: 5 },
    ],
    failurePenalty: { stone: -30 },
    penaltyLoyalty: -3,
    duration: 2,
  },
  {
    id: 'train_grunts',
    name: '征兵令',
    description: '训练兽人步兵扩充军力',
    icon: '⚔️',
    goal: { type: 'train_warriors', target: 'grunt', amount: 5 },
    stages: [
      { index: 0, requiredProgress: 2, reward: { food: 50 }, bonusLoyalty: 2 },
      { index: 1, requiredProgress: 4, reward: { gold: 40, iron: 10 }, bonusLoyalty: 3 },
      { index: 2, requiredProgress: 5, reward: { gold: 60, iron: 20 }, bonusLoyalty: 5 },
    ],
    failurePenalty: { gold: -30 },
    penaltyLoyalty: -4,
    duration: 2,
  },
  {
    id: 'win_battles_1',
    name: '抵御入侵',
    description: '成功击退入侵者保卫部落',
    icon: '🛡️',
    goal: { type: 'win_battles', amount: 2 },
    stages: [
      { index: 0, requiredProgress: 1, reward: { gold: 30 }, bonusLoyalty: 3 },
      { index: 1, requiredProgress: 2, reward: { gold: 60, iron: 15 }, bonusLoyalty: 5 },
    ],
    failurePenalty: { gold: -40 },
    penaltyLoyalty: -5,
    duration: 3,
  },
  {
    id: 'build_farms',
    name: '农耕发展',
    description: '建设农场保障食物供给',
    icon: '🏠',
    goal: { type: 'build_buildings', target: 'farm', amount: 2 },
    stages: [
      { index: 0, requiredProgress: 1, reward: { food: 60 }, bonusLoyalty: 2 },
      { index: 1, requiredProgress: 2, reward: { food: 100, wood: 30 }, bonusLoyalty: 4 },
    ],
    failurePenalty: { food: -60 },
    penaltyLoyalty: -3,
    duration: 2,
  },
  {
    id: 'upgrade_buildings',
    name: '扩建升级',
    description: '升级部落建筑提升实力',
    icon: '🔧',
    goal: { type: 'upgrade_buildings', amount: 3 },
    stages: [
      { index: 0, requiredProgress: 1, reward: { stone: 30, wood: 30 }, bonusLoyalty: 2 },
      { index: 1, requiredProgress: 2, reward: { gold: 40, iron: 10 }, bonusLoyalty: 3 },
      { index: 2, requiredProgress: 3, reward: { gold: 60, iron: 20 }, bonusLoyalty: 5 },
    ],
    failurePenalty: { stone: -30 },
    penaltyLoyalty: -3,
    duration: 3,
  },
  {
    id: 'expedition_1',
    name: '探索未知',
    description: '派遣远征队探索新领地',
    icon: '🗡️',
    goal: { type: 'expedition_complete', amount: 1 },
    stages: [
      { index: 0, requiredProgress: 1, reward: { gold: 80, iron: 15 }, bonusLoyalty: 5 },
    ],
    failurePenalty: { gold: -50 },
    penaltyLoyalty: -5,
    duration: 3,
  },
  {
    id: 'trade_1',
    name: '商业拓展',
    description: '通过交易获取稀缺资源',
    icon: '🏪',
    goal: { type: 'trade_count', amount: 3 },
    stages: [
      { index: 0, requiredProgress: 1, reward: { gold: 20 }, bonusLoyalty: 2 },
      { index: 1, requiredProgress: 2, reward: { gold: 40 }, bonusLoyalty: 3 },
      { index: 2, requiredProgress: 3, reward: { gold: 70, iron: 10 }, bonusLoyalty: 5 },
    ],
    failurePenalty: { gold: -25 },
    penaltyLoyalty: -2,
    duration: 2,
  },
  {
    id: 'research_1',
    name: '知识传承',
    description: '研究新科技推动部落进步',
    icon: '🔬',
    goal: { type: 'research_complete', amount: 1 },
    stages: [
      { index: 0, requiredProgress: 1, reward: { gold: 60, iron: 15 }, bonusLoyalty: 5 },
    ],
    failurePenalty: { gold: -40 },
    penaltyLoyalty: -4,
    duration: 3,
  },
  {
    id: 'reach_population',
    name: '人丁兴旺',
    description: '吸引更多族民加入部落',
    icon: '👥',
    goal: { type: 'reach_population', amount: 15 },
    stages: [
      { index: 0, requiredProgress: 10, reward: { food: 40 }, bonusLoyalty: 2 },
      { index: 1, requiredProgress: 13, reward: { food: 60, gold: 20 }, bonusLoyalty: 3 },
      { index: 2, requiredProgress: 15, reward: { food: 80, gold: 40 }, bonusLoyalty: 5 },
    ],
    failurePenalty: { food: -40 },
    penaltyLoyalty: -3,
    duration: 3,
  },
  {
    id: 'reach_loyalty',
    name: '万众一心',
    description: '提升部落忠诚度稳固统治',
    icon: '❤️',
    goal: { type: 'reach_loyalty', amount: 85 },
    stages: [
      { index: 0, requiredProgress: 70, reward: { gold: 20 }, bonusLoyalty: 3 },
      { index: 1, requiredProgress: 80, reward: { gold: 40, food: 40 }, bonusLoyalty: 4 },
      { index: 2, requiredProgress: 85, reward: { gold: 60, iron: 15 }, bonusLoyalty: 6 },
    ],
    failurePenalty: { gold: -30 },
    penaltyLoyalty: -4,
    duration: 3,
  },
];

export const TASK_CHAIN_CONFIGS: {
  id: string;
  name: string;
  icon: string;
  taskIds: string[];
  chainReward: Partial<import('../types').Resources>;
  chainBonusLoyalty: number;
}[] = [
  {
    id: 'chain_prosperity',
    name: '繁荣之路',
    icon: '🌟',
    taskIds: ['collect_food_1', 'build_farms', 'reach_population'],
    chainReward: { gold: 150, food: 200 },
    chainBonusLoyalty: 10,
  },
  {
    id: 'chain_military',
    name: '铁血征途',
    icon: '⚔️',
    taskIds: ['train_grunts', 'win_battles_1', 'expedition_1'],
    chainReward: { iron: 40, gold: 120 },
    chainBonusLoyalty: 8,
  },
  {
    id: 'chain_development',
    name: '文明曙光',
    icon: '🏛️',
    taskIds: ['collect_stone_1', 'upgrade_buildings', 'research_1'],
    chainReward: { stone: 120, gold: 100, iron: 20 },
    chainBonusLoyalty: 10,
  },
  {
    id: 'chain_commerce',
    name: '商道通达',
    icon: '💰',
    taskIds: ['collect_wood_1', 'trade_1', 'reach_loyalty'],
    chainReward: { gold: 200, wood: 80 },
    chainBonusLoyalty: 8,
  },
];

export const TASK_REFRESH_INTERVAL = 2;

export const MAX_ACTIVE_CHAINS = 2;

export function selectRandomChains(count: number): typeof TASK_CHAIN_CONFIGS[number][] {
  const shuffled = [...TASK_CHAIN_CONFIGS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
