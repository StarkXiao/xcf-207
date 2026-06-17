import type {
  BuildingType,
  WarriorType,
  MilestoneConfig,
  MilestoneRedDot,
  Building,
  GameState,
} from '../types';

export const MILESTONES: MilestoneConfig[] = [
  {
    id: 'th_1',
    townhallLevel: 1,
    name: '部落初建',
    description: '你的部落刚刚建立，开始积累资源吧！',
    icon: '🌱',
    unlockBuildings: [
      'townhall',
      'hut',
      'farm',
      'lumbermill',
      'quarry',
      'wall',
    ],
    unlockWarriors: ['grunt'],
    unlockPanels: ['population', 'building'],
    triggerEvents: [],
    redDots: [],
    rewards: {},
  },
  {
    id: 'th_2',
    townhallLevel: 2,
    name: '部落雏形',
    description: '部落大厅升级到2级，军事和贸易系统开启！',
    icon: '🏗️',
    unlockBuildings: [
      'barracks',
      'market',
      'totem_altar',
    ],
    unlockWarriors: [],
    unlockPanels: ['warrior', 'trade', 'totem'],
    triggerEvents: ['military_era_begins'],
    redDots: [
      { type: 'panel', target: 'warrior', message: '兵营已解锁，可以训练战士了！' },
      { type: 'panel', target: 'trade', message: '交易市场已开启，快去看看有什么好东西！' },
      { type: 'panel', target: 'totem', message: '图腾祭坛已解锁，开始积累信仰吧！' },
    ],
    rewards: { gold: 100, food: 100 },
  },
  {
    id: 'th_3',
    townhallLevel: 3,
    name: '军事崛起',
    description: '部落大厅3级，战士科技和夜袭防御解锁！',
    icon: '⚔️',
    unlockBuildings: [
      'smithy',
      'warehouse',
    ],
    unlockWarriors: ['archer'],
    unlockPanels: ['tech', 'nightRaid'],
    triggerEvents: ['smithy_opening'],
    redDots: [
      { type: 'panel', target: 'tech', message: '科技树已解锁，研究可获得永久加成！' },
      { type: 'panel', target: 'nightRaid', message: '夜袭防御系统启动，注意防范夜间入侵！' },
      { type: 'building', target: 'smithy', message: '铁匠铺已解锁，可以升级武器装备！' },
    ],
    rewards: { iron: 50, gold: 150 },
  },
  {
    id: 'th_4',
    townhallLevel: 4,
    name: '远征之路',
    description: '部落大厅4级，远征探险和任务系统开启！',
    icon: '🗺️',
    unlockBuildings: [],
    unlockWarriors: ['shaman'],
    unlockPanels: ['expedition', 'task'],
    triggerEvents: ['expedition_unlock'],
    redDots: [
      { type: 'panel', target: 'expedition', message: '远征系统开启，派兵探索获取丰厚战利品！' },
      { type: 'panel', target: 'task', message: '委托任务系统开放，完成任务获取奖励！' },
      { type: 'warrior', target: 'shaman', message: '巫医萨满已可训练，能治疗友军！' },
    ],
    rewards: { food: 200, gold: 200, wood: 200 },
  },
  {
    id: 'th_5',
    townhallLevel: 5,
    name: '商路开拓',
    description: '部落大厅5级，商队贸易和仓储管理解锁！',
    icon: '🐪',
    unlockBuildings: [
      'caravanserai',
      'totem_pole',
    ],
    unlockWarriors: [],
    unlockPanels: ['caravan', 'storage'],
    triggerEvents: ['trade_route_opens'],
    redDots: [
      { type: 'panel', target: 'caravan', message: '商队驿站开放，派遣商队进行长途贸易！' },
      { type: 'panel', target: 'storage', message: '仓储管理系统上线，合理分配资源！' },
      { type: 'building', target: 'totem_pole', message: '图腾柱已解锁，可获得更多信仰！' },
    ],
    rewards: { gold: 300, stone: 200 },
  },
  {
    id: 'th_6',
    townhallLevel: 6,
    name: '外交纪元',
    description: '部落大厅6级，外交系统和高级兵种解锁！',
    icon: '🤝',
    unlockBuildings: [],
    unlockWarriors: ['berserker'],
    unlockPanels: ['diplomacy'],
    triggerEvents: ['diplomatic_contact'],
    redDots: [
      { type: 'panel', target: 'diplomacy', message: '外交系统解锁，与其他势力建立关系！' },
      { type: 'warrior', target: 'berserker', message: '狂战士已可训练，战场绞肉机！' },
    ],
    rewards: { gold: 400, iron: 100 },
  },
  {
    id: 'th_7',
    townhallLevel: 7,
    name: '走私网络',
    description: '部落大厅7级，黑市交易和政务系统开启！',
    icon: '🌑',
    unlockBuildings: [
      'smugglers_den',
    ],
    unlockWarriors: [],
    unlockPanels: ['government'],
    triggerEvents: ['shadow_market_opens'],
    redDots: [
      { type: 'panel', target: 'government', message: '政务系统上线，任命酋长制定政策！' },
      { type: 'building', target: 'smugglers_den', message: '走私者巢穴解锁，高风险高回报！' },
    ],
    rewards: { gold: 500 },
  },
  {
    id: 'th_8',
    townhallLevel: 8,
    name: '神圣殿堂',
    description: '部落大厅8级，圣殿和高级图腾解锁！',
    icon: '⛩️',
    unlockBuildings: [
      'shrine',
    ],
    unlockWarriors: [],
    unlockPanels: [],
    triggerEvents: ['divine_revelation'],
    redDots: [
      { type: 'building', target: 'shrine', message: '圣殿已解锁，信仰之力的终极建筑！' },
    ],
    rewards: { gold: 600, stone: 400, iron: 150 },
  },
  {
    id: 'th_9',
    townhallLevel: 9,
    name: '战争狂潮',
    description: '部落大厅9级，战争酋长降临，所有兵种强化！',
    icon: '👑',
    unlockBuildings: [],
    unlockWarriors: ['warlord'],
    unlockPanels: [],
    triggerEvents: ['warlord_arises'],
    redDots: [
      { type: 'warrior', target: 'warlord', message: '战争酋长已可训练，部落最强战士！' },
    ],
    rewards: { iron: 300, gold: 800 },
  },
  {
    id: 'th_10',
    townhallLevel: 10,
    name: '部落帝国',
    description: '部落大厅达到最高等级，你已成为传奇！',
    icon: '🏆',
    unlockBuildings: [],
    unlockWarriors: [],
    unlockPanels: [],
    triggerEvents: ['tribe_empire'],
    redDots: [
      { type: 'milestone', target: 'th_10', message: '恭喜！你已建成部落帝国！' },
    ],
    rewards: { food: 1000, wood: 1000, stone: 1000, gold: 1500, iron: 500 },
  },
];

export const getMilestoneByLevel = (level: number): MilestoneConfig | undefined => {
  return MILESTONES.find((m) => m.townhallLevel === level);
};

export const getMilestone = (id: string): MilestoneConfig | undefined => {
  return MILESTONES.find((m) => m.id === id);
};

export const getMilestonesUpToLevel = (level: number): MilestoneConfig[] => {
  return MILESTONES.filter((m) => m.townhallLevel <= level);
};

export const getTownhallLevel = (buildings: Building[]): number => {
  const townhall = buildings.find((b) => b.type === 'townhall' && !b.isBuilding);
  return townhall?.level || 0;
};

export const getUnlockedBuildingsByMilestones = (townhallLevel: number): BuildingType[] => {
  const milestones = getMilestonesUpToLevel(townhallLevel);
  const buildings: BuildingType[] = [];
  for (const m of milestones) {
    for (const b of m.unlockBuildings) {
      if (!buildings.includes(b)) {
        buildings.push(b);
      }
    }
  }
  return buildings;
};

export const getUnlockedWarriorsByMilestones = (townhallLevel: number): WarriorType[] => {
  const milestones = getMilestonesUpToLevel(townhallLevel);
  const warriors: WarriorType[] = [];
  for (const m of milestones) {
    for (const w of m.unlockWarriors) {
      if (!warriors.includes(w)) {
        warriors.push(w);
      }
    }
  }
  return warriors;
};

export const getUnlockedPanelsByMilestones = (townhallLevel: number): string[] => {
  const milestones = getMilestonesUpToLevel(townhallLevel);
  const panels: string[] = [];
  for (const m of milestones) {
    for (const p of m.unlockPanels) {
      if (!panels.includes(p)) {
        panels.push(p);
      }
    }
  }
  return panels;
};

export const getPendingRedDots = (
  townhallLevel: number,
  _claimedMilestones: string[],
  dismissedRedDots: string[]
): MilestoneRedDot[] => {
  const dots: MilestoneRedDot[] = [];
  const milestones = getMilestonesUpToLevel(townhallLevel);

  for (const m of milestones) {
    for (const dot of m.redDots) {
      const dotId = `${m.id}_${dot.type}_${dot.target}`;
      if (!dismissedRedDots.includes(dotId)) {
        dots.push(dot);
      }
    }
  }
  return dots;
};

export const getPanelHasRedDot = (
  panelId: string,
  pendingRedDots: MilestoneRedDot[]
): boolean => {
  return pendingRedDots.some((d) => d.type === 'panel' && d.target === panelId);
};

export const getBuildingHasRedDot = (
  buildingType: string,
  pendingRedDots: MilestoneRedDot[]
): boolean => {
  return pendingRedDots.some((d) => d.type === 'building' && d.target === buildingType);
};

export const getWarriorHasRedDot = (
  warriorType: string,
  pendingRedDots: MilestoneRedDot[]
): boolean => {
  return pendingRedDots.some((d) => d.type === 'warrior' && d.target === warriorType);
};

export const getNextMilestone = (currentLevel: number): MilestoneConfig | null => {
  const next = MILESTONES.find((m) => m.townhallLevel > currentLevel);
  return next || null;
};

export const getMilestoneProgress = (
  state: GameState
): { current: MilestoneConfig | undefined; next: MilestoneConfig | null; progress: number } => {
  const thLevel = getTownhallLevel(state.buildings);
  const current = getMilestoneByLevel(thLevel);
  const next = getNextMilestone(thLevel);
  const progress = next
    ? Math.min(100, Math.floor(((thLevel - 1) / (MILESTONES.length - 1)) * 100))
    : 100;
  return { current, next, progress };
};

export const getBuildingsToUnlockInNextMilestone = (
  currentLevel: number
): BuildingType[] => {
  const next = getNextMilestone(currentLevel);
  return next ? next.unlockBuildings : [];
};

export const getWarriorsToUnlockInNextMilestone = (
  currentLevel: number
): WarriorType[] => {
  const next = getNextMilestone(currentLevel);
  return next ? next.unlockWarriors : [];
};
