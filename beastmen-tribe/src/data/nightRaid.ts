import type {
  TrapConfig,
  TrapType,
  NightRaidEnemy,
  NightRaidState,
  GarrisonSlot,
  Resources,
  EnemyType,
  BuildingType,
  Trap,
} from '../types';
import { ENEMIES } from './enemies';

export const TRAPS: Record<TrapType, TrapConfig> = {
  spike: {
    id: 'spike',
    name: '尖刺陷阱',
    icon: '🔺',
    description: '基础陷阱，对敌人造成穿刺伤害',
    cost: { wood: 30, stone: 20 },
    damage: 15,
    maxCount: 5,
  },
  fire: {
    id: 'fire',
    name: '火焰陷阱',
    icon: '🔥',
    description: '造成火焰伤害并持续燃烧',
    cost: { wood: 50, stone: 10, iron: 5 },
    damage: 25,
    effect: 'burn',
    effectValue: 5,
    maxCount: 3,
    requires: { building: 'wall', level: 2 },
  },
  poison: {
    id: 'poison',
    name: '剧毒陷阱',
    icon: '☠️',
    description: '造成毒素伤害，削弱敌人攻击',
    cost: { food: 40, wood: 20, gold: 10 },
    damage: 20,
    effect: 'poison',
    effectValue: 3,
    maxCount: 3,
    requires: { building: 'wall', level: 3 },
  },
  net: {
    id: 'net',
    name: '捕网陷阱',
    icon: '🕸️',
    description: '束缚敌人，降低其行动速度',
    cost: { wood: 40, food: 20 },
    damage: 10,
    effect: 'slow',
    effectValue: 0.3,
    maxCount: 4,
  },
  boulder: {
    id: 'boulder',
    name: '滚石陷阱',
    icon: '🪨',
    description: '强力陷阱，造成巨大伤害并击晕敌人',
    cost: { stone: 80, wood: 30, iron: 10 },
    damage: 50,
    effect: 'stun',
    effectValue: 1,
    maxCount: 2,
    requires: { building: 'wall', level: 5 },
  },
};

export const BASE_WARNING_TIME = 30;
export const BASE_PREPARATION_TIME = 45;
export const BASE_RAID_COOLDOWN = 120;
export const MAX_REPORTS = 10;
export const MAX_GARRISON_SLOTS = 6;

export const createInitialNightRaidState = (): NightRaidState => {
  return {
    activeRaid: null,
    reports: [],
    totalRaids: 0,
    totalRaidWins: 0,
    totalRaidLosses: 0,
    raidCooldown: BASE_RAID_COOLDOWN,
    nextRaidIn: BASE_RAID_COOLDOWN,
    availableTraps: {
      spike: 0,
      fire: 0,
      poison: 0,
      net: 0,
      boulder: 0,
    },
    placedTraps: [],
    garrisonWarriors: [],
  };
};

export const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const generateNightRaidEnemies = (
  wave: number,
  day: number
): NightRaidEnemy[] => {
  const enemies: NightRaidEnemy[] = [];
  const enemyPool: EnemyType[] = [];

  if (wave >= 1) enemyPool.push('goblin');
  if (wave >= 2) enemyPool.push('wolf');
  if (wave >= 4) enemyPool.push('troll');
  if (wave >= 6) enemyPool.push('orc');
  if (wave >= 10) enemyPool.push('dragon');

  const baseCount = 2 + Math.floor(wave * 0.8);
  const scale = 1 + wave * 0.12 + day * 0.02;

  for (let i = 0; i < baseCount; i++) {
    const enemyType = enemyPool[Math.floor(Math.random() * enemyPool.length)];
    const base = ENEMIES[enemyType];

    enemies.push({
      id: generateId(),
      type: enemyType,
      hp: Math.floor(base.hp * scale * 0.8),
      maxHp: Math.floor(base.hp * scale * 0.8),
      attack: Math.floor(base.attack * scale * 0.9),
      defense: Math.floor(base.defense * scale * 0.85),
    });
  }

  return enemies;
};

export const calculateRaidRewards = (
  wave: number,
  enemies: NightRaidEnemy[]
): Partial<Resources> => {
  const rewards: Partial<Resources> = {};
  const baseMultiplier = 1 + wave * 0.15;

  for (const enemy of enemies) {
    const base = ENEMIES[enemy.type];
    for (const [resource, amount] of Object.entries(base.reward)) {
      rewards[resource as keyof Resources] =
        (rewards[resource as keyof Resources] || 0) +
        Math.floor((amount as number) * baseMultiplier * 0.6);
    }
  }

  return rewards;
};

export const createGarrisonSlots = (): GarrisonSlot[] => {
  const slots: GarrisonSlot[] = [];
  const positions: Array<'front' | 'middle' | 'back'> = ['front', 'middle', 'back'];

  for (let i = 0; i < MAX_GARRISON_SLOTS; i++) {
    const position = positions[Math.floor(i / 2)];
    slots.push({
      id: generateId(),
      warriorType: null,
      warriorId: null,
      position,
    });
  }

  return slots;
};

export const canBuildTrap = (
  trapType: TrapType,
  buildings: Array<{ type: BuildingType; level: number; isBuilding: boolean }>,
  availableTraps: Record<TrapType, number>,
  placedTraps: { type: TrapType }[]
): boolean => {
  const config = TRAPS[trapType];
  if (!config) return false;

  if (config.requires) {
    const reqBuilding = buildings.find(
      (b) => b.type === config.requires!.building && !b.isBuilding
    );
    if (!reqBuilding || reqBuilding.level < config.requires.level) return false;
  }

  const placedCount = placedTraps.filter((t) => t.type === trapType).length;
  if (placedCount >= config.maxCount) return false;

  if (availableTraps[trapType] <= 0) return false;

  return true;
};

export const getTrapCountByType = (
  traps: { type: TrapType; triggered: boolean }[],
  trapType: TrapType
): { total: number; triggered: number; available: number } => {
  const total = traps.filter((t) => t.type === trapType).length;
  const triggered = traps.filter((t) => t.type === trapType && t.triggered).length;
  return { total, triggered, available: total - triggered };
};

export const calculateTrapDamage = (
  traps: Trap[],
  enemies: NightRaidEnemy[]
): {
  updatedEnemies: NightRaidEnemy[];
  trapsTriggered: number;
  damageLog: string[];
} => {
  const updatedEnemies = enemies.map((e) => ({ ...e }));
  let trapsTriggered = 0;
  const damageLog: string[] = [];

  const untriggeredTraps = traps.filter((t) => !t.triggered);

  for (const trap of untriggeredTraps) {
    if (updatedEnemies.length === 0) break;

    const trapConfig = TRAPS[trap.type];
    if (!trapConfig) continue;

    const targetIndex = Math.floor(Math.random() * updatedEnemies.length);
    const target = updatedEnemies[targetIndex];

    const damage = trapConfig.damage;
    target.hp -= damage;
    target.affectedByTrap = true;
    target.trapDamage = (target.trapDamage || 0) + damage;

    trapsTriggered++;
    damageLog.push(
      `${trapConfig.icon} ${trapConfig.name} 触发！对 ${ENEMIES[target.type].name} 造成 ${damage} 伤害`
    );

    if (trapConfig.effect && trapConfig.effectValue) {
      switch (trapConfig.effect) {
        case 'slow':
          target.attack = Math.floor(target.attack * (1 - trapConfig.effectValue * 0.5));
          damageLog.push(`  ↳ 敌人被减速，攻击力降低`);
          break;
        case 'poison':
          target.attack = Math.floor(target.attack * 0.85);
          target.defense = Math.floor(target.defense * 0.85);
          damageLog.push(`  ↳ 敌人中毒，攻防下降`);
          break;
        case 'stun':
          target.attack = Math.floor(target.attack * 0.5);
          damageLog.push(`  ↳ 敌人被击晕，下次攻击减半`);
          break;
        case 'burn':
          target.hp -= trapConfig.effectValue * 3;
          damageLog.push(`  ↳ 燃烧造成额外 ${trapConfig.effectValue * 3} 点伤害`);
          break;
      }
    }

    if (target.hp <= 0) {
      damageLog.push(`💀 ${ENEMIES[target.type].name} 被陷阱击杀！`);
      updatedEnemies.splice(targetIndex, 1);
    }
  }

  return { updatedEnemies, trapsTriggered, damageLog };
};
