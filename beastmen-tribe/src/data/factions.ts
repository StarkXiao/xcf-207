import type { FactionConfig, FactionType, Faction, FactionStance, DiplomaticAction } from '../types';

export const FACTIONS: Record<FactionType, FactionConfig> = {
  ironclaw: {
    id: 'ironclaw',
    name: '铁爪氏族',
    icon: '🦅',
    description: '以锻造和矿业闻名的氏族，掌握着先进的冶金技术。',
    color: '#6b7280',
    baseReputation: 30,
    tradeBonus: 0.15,
    militaryStrength: 80,
    speciality: 'iron',
  },
  shadowfang: {
    id: 'shadowfang',
    name: '暗影牙部落',
    icon: '🐺',
    description: '擅长潜行和侦察的神秘部落，情报网络遍布大陆。',
    color: '#4c1d95',
    baseReputation: 20,
    tradeBonus: 0.1,
    militaryStrength: 70,
    speciality: 'gold',
  },
  sunhorn: {
    id: 'sunhorn',
    name: '阳光角族',
    icon: '🦌',
    description: '和平的农业部落，土地肥沃，粮食产量极高。',
    color: '#d97706',
    baseReputation: 50,
    tradeBonus: 0.2,
    militaryStrength: 40,
    speciality: 'food',
  },
  moonscar: {
    id: 'moonscar',
    name: '月痕萨满团',
    icon: '🌙',
    description: '掌握古老魔法的萨满们，能召唤强大的战士。',
    color: '#7c3aed',
    baseReputation: 25,
    tradeBonus: 0.05,
    militaryStrength: 90,
    speciality: 'warriors',
  },
  bloodtooth: {
    id: 'bloodtooth',
    name: '血牙战团',
    icon: '🦷',
    description: '好战的游牧部落，以征服和掠夺为荣。',
    color: '#991b1b',
    baseReputation: -10,
    tradeBonus: -0.1,
    militaryStrength: 100,
    speciality: 'stone',
  },
};

export const getStanceFromReputation = (reputation: number): FactionStance => {
  if (reputation >= 80) return 'ally';
  if (reputation >= 40) return 'friendly';
  if (reputation >= -20) return 'neutral';
  return 'enemy';
};

export const createInitialFactions = (): Record<FactionType, Faction> => {
  const result: Record<string, Faction> = {};
  for (const [id, config] of Object.entries(FACTIONS)) {
    result[id] = {
      id: id as FactionType,
      reputation: config.baseReputation,
      stance: getStanceFromReputation(config.baseReputation),
      tradeUnlocked: config.baseReputation >= 0,
      militaryAid: 0,
      lastInteraction: 0,
    };
  }
  return result as Record<FactionType, Faction>;
};

export const STANCE_INFO: Record<FactionStance, { name: string; color: string; description: string }> = {
  enemy: { name: '敌对', color: '#ef4444', description: '随时可能发动进攻' },
  neutral: { name: '中立', color: '#6b7280', description: '互不干扰' },
  friendly: { name: '友好', color: '#10b981', description: '可进行贸易' },
  ally: { name: '同盟', color: '#3b82f6', description: '可请求军事援助' },
};

export const getDiplomaticActions = (factionId: FactionType, reputation: number): DiplomaticAction[] => {
  const actions: DiplomaticAction[] = [];
  const config = FACTIONS[factionId];

  actions.push({
    id: `${factionId}-gift`,
    type: 'gift',
    factionId,
    name: '赠送礼物',
    icon: '🎁',
    description: `向${config.name}赠送贵重礼物，提升声望。`,
    cost: { gold: 50, food: 30 },
    cooldown: 30,
    reputationChange: { success: 15, fail: 0 },
    successRate: 0.95,
  });

  if (reputation >= 20) {
    actions.push({
      id: `${factionId}-trade_treaty`,
      type: 'trade_treaty',
      factionId,
      name: '签订贸易条约',
      icon: '📜',
      description: `与${config.name}签订长期贸易条约，解锁更多交易机会。`,
      cost: { gold: 100 },
      minReputation: 20,
      cooldown: 60,
      reputationChange: { success: 20, fail: -5 },
      successRate: 0.8,
    });
  }

  if (reputation >= 60) {
    actions.push({
      id: `${factionId}-military_aid_request`,
      type: 'military_aid_request',
      factionId,
      name: '请求军事援助',
      icon: '⚔️',
      description: `向${config.name}请求援军，帮助抵御入侵。`,
      cost: { gold: 80, food: 50 },
      minReputation: 60,
      cooldown: 120,
      reputationChange: { success: 10, fail: -15 },
      successRate: 0.7,
    });
  }

  if (reputation >= 80) {
    actions.push({
      id: `${factionId}-alliance_proposal`,
      type: 'alliance_proposal',
      factionId,
      name: '提议缔结同盟',
      icon: '🤝',
      description: `提议与${config.name}缔结永久同盟，共享军事资源。`,
      cost: { gold: 200, iron: 50 },
      minReputation: 80,
      cooldown: 180,
      reputationChange: { success: 30, fail: -20 },
      successRate: 0.6,
    });
  }

  if (reputation <= 20) {
    actions.push({
      id: `${factionId}-threaten`,
      type: 'threaten',
      factionId,
      name: '武力威慑',
      icon: '💢',
      description: `展示武力向${config.name}施压，可能获得资源但降低声望。`,
      cost: {},
      maxReputation: 20,
      cooldown: 45,
      reputationChange: { success: -10, fail: -25 },
      successRate: 0.5,
    });
  }

  if (reputation <= 40) {
    actions.push({
      id: `${factionId}-espionage`,
      type: 'espionage',
      factionId,
      name: '派遣间谍',
      icon: '🕵️',
      description: `派遣间谍潜入${config.name}，窃取资源和情报。`,
      cost: { gold: 60 },
      maxReputation: 40,
      cooldown: 90,
      reputationChange: { success: -5, fail: -30 },
      successRate: 0.4,
    });
  }

  actions.push({
    id: `${factionId}-denounce`,
    type: 'denounce',
    factionId,
    name: '公开谴责',
    icon: '📢',
    description: `公开谴责${config.name}的行为，降低与其关系但提升敌对部落的好感。`,
    cost: {},
    cooldown: 60,
    reputationChange: { success: -15, fail: -15 },
    successRate: 1.0,
  });

  return actions;
};

export const calculateTotalReputation = (factions: Record<FactionType, Faction>): number => {
  return Object.values(factions).reduce((sum, f) => sum + f.reputation, 0);
};

export const countAllyFactions = (factions: Record<FactionType, Faction>): number => {
  return Object.values(factions).filter((f) => f.stance === 'ally').length;
};

export const countEnemyFactions = (factions: Record<FactionType, Faction>): number => {
  return Object.values(factions).filter((f) => f.stance === 'enemy').length;
};
