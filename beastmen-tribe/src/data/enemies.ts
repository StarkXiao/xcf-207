import type { EnemyConfig, Faction, FactionType, BossConfig, BossSkillConfig, WallDurability, TieredReward, FailureCompensation, Resources } from '../types';
import { FACTIONS } from './factions';

export const ENEMIES: Record<string, EnemyConfig> = {
  goblin: {
    id: 'goblin',
    name: '哥布林',
    icon: '👺',
    attack: 5,
    defense: 2,
    hp: 25,
    count: 3,
    reward: { food: 20, gold: 5 },
    unitClass: 'infantry',
    preferredPosition: 'front',
  },
  wolf: {
    id: 'wolf',
    name: '野狼',
    icon: '🐺',
    attack: 8,
    defense: 3,
    hp: 35,
    count: 4,
    reward: { food: 40, wood: 10 },
    unitClass: 'cavalry',
    preferredPosition: 'front',
  },
  troll: {
    id: 'troll',
    name: '山地巨魔',
    icon: '👾',
    attack: 12,
    defense: 8,
    hp: 80,
    count: 2,
    reward: { stone: 50, iron: 10 },
    unitClass: 'infantry',
    preferredPosition: 'front',
  },
  orc: {
    id: 'orc',
    name: '敌对兽人',
    icon: '💀',
    attack: 15,
    defense: 10,
    hp: 100,
    count: 3,
    reward: { gold: 60, iron: 20, food: 50 },
    unitClass: 'infantry',
    preferredPosition: 'middle',
  },
  dragon: {
    id: 'dragon',
    name: '远古巨龙',
    icon: '🐉',
    attack: 40,
    defense: 25,
    hp: 300,
    count: 1,
    reward: { gold: 200, iron: 80, food: 150 },
    unitClass: 'hero',
    preferredPosition: 'back',
  },
};

export const FACTION_ENEMY_TYPES: Record<FactionType, string> = {
  bloodtooth: 'orc',
  shadowfang: 'wolf',
  ironclaw: 'troll',
  moonscar: 'dragon',
  sunhorn: 'goblin',
};

const calculateHostilityModifier = (factions: Record<FactionType, Faction>): {
  invasionChance: number;
  strengthMod: number;
  sourceFaction?: FactionType;
} => {
  let totalHostility = 0;
  let mostHostile: FactionType | null = null;
  let maxHostility = 0;

  for (const faction of Object.values(factions)) {
    const hostility = Math.max(0, -faction.reputation);
    totalHostility += hostility;
    if (hostility > maxHostility) {
      maxHostility = hostility;
      mostHostile = faction.id;
    }
  }

  const invasionChance = Math.min(0.8, 0.3 + totalHostility * 0.008);
  const strengthMod = 1 + totalHostility * 0.005;

  return {
    invasionChance,
    strengthMod,
    sourceFaction: mostHostile || undefined,
  };
};

export const getInvasionDiplomacyInfo = (factions: Record<FactionType, Faction>) => {
  const mod = calculateHostilityModifier(factions);
  return {
    invasionChance: Math.round(mod.invasionChance * 100),
    strengthMod: Math.round((mod.strengthMod - 1) * 100),
    hostileCount: Object.values(factions).filter((f) => f.reputation < 0).length,
    mostHostile: mod.sourceFaction ? FACTIONS[mod.sourceFaction].name : null,
  };
};

export const generateInvasion = (wave: number, factions?: Record<FactionType, Faction>) => {
  const enemyPool: string[] = [];
  if (wave >= 1) enemyPool.push('goblin');
  if (wave >= 3) enemyPool.push('wolf');
  if (wave >= 5) enemyPool.push('troll');
  if (wave >= 8) enemyPool.push('orc');
  if (wave >= 12) enemyPool.push('dragon');

  let enemyType: string;
  let scale = 1 + wave * 0.1;
  let sourceName = '';
  let sourceIcon = '';

  if (factions) {
    const hostility = calculateHostilityModifier(factions);
    scale *= hostility.strengthMod;

    if (hostility.sourceFaction && hostility.sourceFaction !== 'sunhorn') {
      const factionEnemy = FACTION_ENEMY_TYPES[hostility.sourceFaction];
      if (enemyPool.includes(factionEnemy) || wave >= 3) {
        enemyType = factionEnemy;
        sourceName = FACTIONS[hostility.sourceFaction].name;
        sourceIcon = FACTIONS[hostility.sourceFaction].icon;
      } else {
        enemyType = enemyPool[Math.floor(Math.random() * enemyPool.length)];
      }
    } else {
      enemyType = enemyPool[Math.floor(Math.random() * enemyPool.length)];
    }
  } else {
    enemyType = enemyPool[Math.floor(Math.random() * enemyPool.length)];
  }

  const base = ENEMIES[enemyType];

  return {
    type: enemyType,
    name: sourceName ? `${sourceName}的${base.name}` : base.name,
    icon: sourceIcon || base.icon,
    attack: Math.floor(base.attack * scale),
    defense: Math.floor(base.defense * scale),
    hp: Math.floor(base.hp * scale),
    maxHp: Math.floor(base.hp * scale),
    count: Math.max(1, Math.floor(base.count * (1 + wave * 0.05))),
    reward: Object.fromEntries(
      Object.entries(base.reward).map(([k, v]) => [k, Math.floor((v as number) * scale)])
    ),
    sourceFaction: sourceName || null,
  };
};

export const BOSS_SKILLS: Record<string, BossSkillConfig> = {
  inferno_breath: {
    id: 'inferno_breath',
    name: '炎息吐息',
    icon: '🔥',
    type: 'aoe',
    description: '对所有前排单位造成大量火焰伤害',
    damage: 35,
    warningRounds: 2,
    cooldown: 4,
  },
  earthquake_slam: {
    id: 'earthquake_slam',
    name: '地裂震击',
    icon: '🌋',
    type: 'wall_breaker',
    description: '猛击城墙，造成大量城墙耐久伤害',
    wallDamage: 40,
    damage: 20,
    warningRounds: 2,
    cooldown: 5,
  },
  dark_revival: {
    id: 'dark_revival',
    name: '暗影复苏',
    icon: '💊',
    type: 'heal_self',
    description: '恢复自身大量生命值',
    healPercent: 25,
    warningRounds: 1,
    cooldown: 6,
  },
  war_cry: {
    id: 'war_cry',
    name: '战吼激励',
    icon: '📯',
    type: 'buff_minions',
    description: '提升所有随从的攻击力和防御力',
    attackBoost: 0.3,
    defenseBoost: 0.2,
    warningRounds: 2,
    cooldown: 5,
  },
  mind_crush: {
    id: 'mind_crush',
    name: '精神碾压',
    icon: '🌀',
    type: 'stun',
    description: '眩晕随机2个单位，使其无法行动',
    stunRounds: 1,
    warningRounds: 2,
    cooldown: 4,
  },
};

export const BOSSES: Record<string, BossConfig> = {
  goblin_king: {
    id: 'goblin_king',
    name: '哥布林大王',
    icon: '👹',
    attack: 18,
    defense: 12,
    hp: 400,
    reward: { gold: 100, food: 80, iron: 30 },
    skills: [BOSS_SKILLS.war_cry, BOSS_SKILLS.mind_crush],
    waveThreshold: 5,
    minionType: 'goblin',
    minionCount: 4,
  },
  dire_wolf_alpha: {
    id: 'dire_wolf_alpha',
    name: '恐狼首领',
    icon: '🐺',
    attack: 28,
    defense: 15,
    hp: 500,
    reward: { gold: 120, food: 120, wood: 60 },
    skills: [BOSS_SKILLS.inferno_breath, BOSS_SKILLS.war_cry],
    waveThreshold: 10,
    minionType: 'wolf',
    minionCount: 3,
  },
  war_troll_chieftain: {
    id: 'war_troll_chieftain',
    name: '战争巨魔酋长',
    icon: '👾',
    attack: 35,
    defense: 22,
    hp: 700,
    reward: { gold: 180, stone: 100, iron: 60 },
    skills: [BOSS_SKILLS.earthquake_slam, BOSS_SKILLS.dark_revival, BOSS_SKILLS.war_cry],
    waveThreshold: 15,
    minionType: 'troll',
    minionCount: 2,
  },
  orc_warlord: {
    id: 'orc_warlord',
    name: '兽人军阀',
    icon: '💀',
    attack: 45,
    defense: 28,
    hp: 900,
    reward: { gold: 250, iron: 100, food: 120 },
    skills: [BOSS_SKILLS.earthquake_slam, BOSS_SKILLS.mind_crush, BOSS_SKILLS.war_cry, BOSS_SKILLS.dark_revival],
    waveThreshold: 20,
    minionType: 'orc',
    minionCount: 3,
  },
  ancient_dragon_lord: {
    id: 'ancient_dragon_lord',
    name: '远古龙王',
    icon: '🐉',
    attack: 60,
    defense: 35,
    hp: 1200,
    reward: { gold: 400, iron: 150, food: 200, stone: 100 },
    skills: [BOSS_SKILLS.inferno_breath, BOSS_SKILLS.earthquake_slam, BOSS_SKILLS.dark_revival, BOSS_SKILLS.mind_crush],
    waveThreshold: 25,
    minionType: 'dragon',
    minionCount: 1,
  },
};

export const BOSS_WAVE_INTERVAL = 5;

export const isBossWave = (wave: number): boolean => wave > 0 && wave % BOSS_WAVE_INTERVAL === 0;

export const getBossForWave = (wave: number): BossConfig | null => {
  if (!isBossWave(wave)) return null;
  const sorted = Object.values(BOSSES).sort((a, b) => a.waveThreshold - b.waveThreshold);
  let selected = sorted[0];
  for (const boss of sorted) {
    if (wave >= boss.waveThreshold) selected = boss;
  }
  return selected;
};

export const calculateWallDurability = (
  buildings: Array<{ type: string; level: number; isBuilding: boolean }>,
  technologies: Array<{ techId: string; completed: boolean }>
): WallDurability => {
  const walls = buildings.filter((b) => b.type === 'wall' && !b.isBuilding);
  if (walls.length === 0) {
    return { maxHp: 50, currentHp: 50, level: 0 };
  }
  const totalLevel = walls.reduce((sum, w) => sum + w.level, 1);
  const maxHp = 100 + totalLevel * 50;
  let techBonus = 0;
  for (const tech of technologies) {
    if (!tech.completed) continue;
  }
  techBonus = Math.min(techBonus, 0.5);
  return {
    maxHp: Math.floor(maxHp * (1 + techBonus)),
    currentHp: Math.floor(maxHp * (1 + techBonus)),
    level: totalLevel,
  };
};

export const calculateTieredRewards = (
  wave: number,
  baseRewards: Partial<Resources>,
  isBoss: boolean
): TieredReward[] => {
  const scale = 1 + wave * 0.1;
  const bossMultiplier = isBoss ? 2.5 : 1;

  const scaleRewards = (mult: number): Partial<Resources> => {
    const result: Partial<Resources> = {};
    for (const [key, amount] of Object.entries(baseRewards)) {
      result[key as keyof Resources] = Math.floor((amount as number) * mult * bossMultiplier);
    }
    return result;
  };

  return [
    {
      tier: 'base',
      label: '基础奖励',
      icon: '🥉',
      resources: scaleRewards(0.5 * scale),
      loyaltyBonus: 2,
      expBonus: 0,
      condition: '完成战斗即可获得',
    },
    {
      tier: 'performance',
      label: '表现奖励',
      icon: '🥈',
      resources: scaleRewards(0.8 * scale),
      loyaltyBonus: 5,
      expBonus: 20,
      condition: '消灭超过50%的敌人且城墙耐久>30%',
    },
    {
      tier: 'perfect',
      label: '完美奖励',
      icon: '🥇',
      resources: scaleRewards(1.2 * scale),
      loyaltyBonus: 10,
      expBonus: 50,
      condition: '全员存活且城墙耐久>70%',
    },
  ];
};

export const calculateFailureCompensation = (
  wave: number,
  damageDealt: number,
  enemiesDefeated: number,
  totalEnemies: number,
  roundsSurvived: number,
  wallHpRemaining: number,
  wallMaxHp: number
): FailureCompensation => {
  const performanceRatio = totalEnemies > 0 ? enemiesDefeated / totalEnemies : 0;
  const wallRatio = wallMaxHp > 0 ? wallHpRemaining / wallMaxHp : 0;
  const compensationRate = Math.min(0.6, performanceRatio * 0.3 + wallRatio * 0.2 + (roundsSurvived > 5 ? 0.1 : 0));

  const baseCompensation: Partial<Resources> = { gold: 15 * wave, food: 10 * wave };
  const scaledCompensation: Partial<Resources> = {};
  for (const [key, amount] of Object.entries(baseCompensation)) {
    scaledCompensation[key as keyof Resources] = Math.floor((amount as number) * compensationRate);
  }

  return {
    resources: scaledCompensation,
    warriorRecoveryRate: Math.min(0.5, performanceRatio * 0.4),
    loyaltyMitigation: Math.min(5, Math.floor(performanceRatio * 5 + roundsSurvived * 0.2)),
    damageDealt,
    enemiesDefeated,
    roundsSurvived,
  };
};
