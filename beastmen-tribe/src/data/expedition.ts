import type { ExpeditionMapConfig, MapNodeType, Resources } from '../types';

export const EXPEDITION_MAPS: ExpeditionMapConfig[] = [
  {
    id: 'dark_forest',
    name: '暗影森林',
    icon: '🌲',
    description: '穿越被黑暗笼罩的森林，搜寻隐藏的宝藏',
    difficulty: 'easy',
    requiredWarriors: 2,
    bonusLoot: { wood: 60, food: 40 },
    nodes: [
      { id: 'df-1', type: 'start', name: '森林入口', icon: '🚪', description: '远征队进入暗影森林', position: 0, difficulty: 'easy' },
      { id: 'df-2', type: 'combat', name: '野兽巢穴', icon: '🐺', description: '一群野狼挡住了去路', position: 1, enemyType: 'wolf', enemyCount: 2, choices: ['fight', 'flee'], difficulty: 'easy' },
      { id: 'df-3', type: 'treasure', name: '古树宝箱', icon: '💎', description: '一棵古老的树洞中藏着宝箱', position: 2, choices: ['explore', 'flee'], difficulty: 'easy' },
      { id: 'df-4', type: 'rest', name: '林间清泉', icon: '💧', description: '一处清澈的泉水，可以稍作休整', position: 3, choices: ['rest', 'explore'], difficulty: 'easy' },
      { id: 'df-5', type: 'combat', name: '哥布林营地', icon: '👺', description: '哥布林在此扎营', position: 4, enemyType: 'goblin', enemyCount: 3, choices: ['fight', 'negotiate'], difficulty: 'easy' },
      { id: 'df-6', type: 'boss', name: '森林守卫', icon: '🌳', description: '远古树精守护着森林深处', position: 5, enemyType: 'troll', enemyCount: 1, choices: ['fight', 'pray'], difficulty: 'normal' },
    ],
  },
  {
    id: 'wasteland',
    name: '荒芜荒原',
    icon: '🏜️',
    description: '跨越危机四伏的荒原，征服最强部落',
    difficulty: 'normal',
    requiredWarriors: 3,
    bonusLoot: { gold: 80, iron: 40 },
    nodes: [
      { id: 'wl-1', type: 'start', name: '荒原入口', icon: '🚪', description: '远征队踏入灼热的荒原', position: 0, difficulty: 'normal' },
      { id: 'wl-2', type: 'trap', name: '流沙陷阱', icon: '⚠️', description: '地面突然塌陷！小心流沙！', position: 1, choices: ['flee', 'explore'], difficulty: 'normal' },
      { id: 'wl-3', type: 'combat', name: '兽人巡逻队', icon: '💀', description: '敌对兽人巡逻队发现了你们', position: 2, enemyType: 'orc', enemyCount: 2, choices: ['fight', 'negotiate', 'flee'], difficulty: 'normal' },
      { id: 'wl-4', type: 'shrine', name: '荒漠神殿', icon: '🏛️', description: '荒漠中的远古神殿', position: 3, choices: ['pray', 'explore'], difficulty: 'normal' },
      { id: 'wl-5', type: 'ambush', name: '伏击！', icon: '🗡️', description: '盗匪从四面八方涌来！', position: 4, enemyType: 'goblin', enemyCount: 4, choices: ['fight', 'flee'], difficulty: 'normal' },
      { id: 'wl-6', type: 'treasure', name: '远古宝藏', icon: '💰', description: '传说中荒原下的远古宝藏', position: 5, choices: ['explore'], difficulty: 'normal' },
      { id: 'wl-7', type: 'boss', name: '荒原霸主', icon: '👹', description: '统治荒原的兽人军阀', position: 6, enemyType: 'orc', enemyCount: 2, choices: ['fight', 'negotiate'], difficulty: 'hard' },
    ],
  },
  {
    id: 'dragon_peak',
    name: '龙脊山脉',
    icon: '🏔️',
    description: '攀登龙脊山脉，挑战远古巨龙',
    difficulty: 'hard',
    requiredWarriors: 4,
    bonusLoot: { gold: 200, iron: 100 },
    nodes: [
      { id: 'dp-1', type: 'start', name: '山脚营地', icon: '🚪', description: '远征队在龙脊山脚扎营', position: 0, difficulty: 'hard' },
      { id: 'dp-2', type: 'combat', name: '山地巨魔', icon: '👾', description: '山中巨魔拦住了去路', position: 1, enemyType: 'troll', enemyCount: 2, choices: ['fight', 'flee'], difficulty: 'hard' },
      { id: 'dp-3', type: 'trap', name: '雪崩！', icon: '❄️', description: '山体崩塌，雪崩涌来！', position: 2, choices: ['flee', 'fight'], difficulty: 'hard' },
      { id: 'dp-4', type: 'shrine', name: '龙祭台', icon: '🐉', description: '远古龙祭台散发着神秘力量', position: 3, choices: ['pray', 'explore'], difficulty: 'hard' },
      { id: 'dp-5', type: 'combat', name: '龙裔守卫', icon: '💀', description: '龙裔战士守护着山峰', position: 4, enemyType: 'orc', enemyCount: 3, choices: ['fight', 'flee'], difficulty: 'hard' },
      { id: 'dp-6', type: 'rest', name: '山间洞穴', icon: '🪨', description: '隐蔽的洞穴可以暂时休整', position: 5, choices: ['rest', 'explore'], difficulty: 'hard' },
      { id: 'dp-7', type: 'ambush', name: '龙息突袭', icon: '🔥', description: '巨龙的烈焰从天而降！', position: 6, enemyType: 'dragon', enemyCount: 1, choices: ['fight', 'flee'], difficulty: 'epic' },
      { id: 'dp-8', type: 'boss', name: '远古巨龙', icon: '🐉', description: '龙脊山真正的统治者', position: 7, enemyType: 'dragon', enemyCount: 1, choices: ['fight', 'pray'], difficulty: 'epic' },
    ],
  },
  {
    id: 'abyss_gate',
    name: '深渊之门',
    icon: '🕳️',
    description: '踏入深渊，面对未知的恐惧与终极宝藏',
    difficulty: 'epic',
    requiredWarriors: 5,
    bonusLoot: { gold: 400, iron: 200, food: 300 },
    nodes: [
      { id: 'ag-1', type: 'start', name: '深渊入口', icon: '🚪', description: '远征队踏入深渊之门', position: 0, difficulty: 'epic' },
      { id: 'ag-2', type: 'combat', name: '深渊猎手', icon: '👹', description: '深渊中的猎手追踪着你们', position: 1, enemyType: 'orc', enemyCount: 3, choices: ['fight', 'flee'], difficulty: 'epic' },
      { id: 'ag-3', type: 'trap', name: '暗影陷阱', icon: '🌀', description: '暗影结界封锁了道路', position: 2, choices: ['fight', 'flee', 'explore'], difficulty: 'epic' },
      { id: 'ag-4', type: 'shrine', name: '混沌祭坛', icon: '🔮', description: '混沌力量的祭坛散发着诡异光芒', position: 3, choices: ['pray', 'explore'], difficulty: 'epic' },
      { id: 'ag-5', type: 'combat', name: '暗影军团', icon: '⚔️', description: '暗影军团排山倒海般涌来', position: 4, enemyType: 'troll', enemyCount: 3, choices: ['fight', 'flee'], difficulty: 'epic' },
      { id: 'ag-6', type: 'rest', name: '庇护所', icon: '✨', description: '深渊中一处神圣的庇护所', position: 5, choices: ['rest', 'pray'], difficulty: 'epic' },
      { id: 'ag-7', type: 'ambush', name: '死亡围攻', icon: '💀', description: '四面楚歌，敌人从暗影中杀出！', position: 6, enemyType: 'orc', enemyCount: 4, choices: ['fight', 'flee'], difficulty: 'epic' },
      { id: 'ag-8', type: 'treasure', name: '深渊宝库', icon: '💎', description: '传说中深渊尽头的终极宝库', position: 7, choices: ['explore'], difficulty: 'epic' },
      { id: 'ag-9', type: 'boss', name: '深渊之主', icon: '😈', description: '深渊的统治者，终极挑战！', position: 8, enemyType: 'dragon', enemyCount: 2, choices: ['fight', 'pray'], difficulty: 'epic' },
    ],
  },
];

export const NODE_MARCH_TIME: Record<string, number> = {
  easy: 8,
  normal: 12,
  hard: 16,
  epic: 20,
};

export const LOOT_TABLES: Record<string, Partial<Resources>[]> = {
  combat_easy: [
    { food: 20, gold: 5 },
    { wood: 15, food: 10 },
    { gold: 8, iron: 3 },
  ],
  combat_normal: [
    { food: 40, gold: 15 },
    { iron: 10, gold: 20 },
    { stone: 30, gold: 10 },
  ],
  combat_hard: [
    { gold: 50, iron: 25 },
    { gold: 40, food: 60 },
    { iron: 30, gold: 35, stone: 20 },
  ],
  combat_epic: [
    { gold: 120, iron: 60, food: 80 },
    { gold: 100, iron: 80 },
    { gold: 150, iron: 40, food: 100 },
  ],
  treasure_easy: [
    { gold: 30, wood: 20 },
    { food: 50, gold: 15 },
    { wood: 40, stone: 25 },
  ],
  treasure_normal: [
    { gold: 60, iron: 15 },
    { gold: 50, stone: 40 },
    { iron: 20, gold: 45, wood: 30 },
  ],
  treasure_hard: [
    { gold: 100, iron: 40 },
    { gold: 80, iron: 30, food: 50 },
  ],
  treasure_epic: [
    { gold: 200, iron: 80 },
    { gold: 180, iron: 60, food: 100 },
  ],
  trap: [
    {},
    { gold: 5 },
    {},
  ],
  shrine: [
    { gold: 20 },
    { iron: 15 },
    { gold: 30, iron: 10 },
  ],
  ambush_easy: [
    { food: 15, gold: 10 },
    { gold: 12, wood: 10 },
  ],
  ambush_normal: [
    { gold: 30, iron: 10 },
    { food: 35, gold: 20 },
  ],
  ambush_hard: [
    { gold: 60, iron: 25 },
    { gold: 50, food: 40 },
  ],
  ambush_epic: [
    { gold: 100, iron: 50 },
    { gold: 80, iron: 40, food: 60 },
  ],
};

export const EXP_GAIN: Record<string, number> = {
  easy: 10,
  normal: 20,
  hard: 40,
  epic: 80,
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#4caf50',
  normal: '#ff9800',
  hard: '#e53935',
  epic: '#9c27b0',
};

export const DIFFICULTY_NAMES: Record<string, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
  epic: '史诗',
};

export const rollLoot = (type: MapNodeType, difficulty: string): Partial<Resources> => {
  const key = type === 'boss' ? `combat_${difficulty}` : `${type}_${difficulty}`;
  const table = LOOT_TABLES[key] || LOOT_TABLES[`combat_${difficulty}`] || [{}];
  return table[Math.floor(Math.random() * table.length)];
};

export const getExpeditionMap = (mapId: string): ExpeditionMapConfig | undefined => {
  return EXPEDITION_MAPS.find((m) => m.id === mapId);
};
