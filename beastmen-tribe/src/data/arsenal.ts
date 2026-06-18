import type { WeaponConfig, WeaponType, WarriorType, ArsenalState, Warrior, Weapon } from '../types';

export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  axe: {
    id: 'axe',
    name: '战斧',
    icon: '🪓',
    maxDurability: 100,
    attackBonus: 5,
    defenseBonus: 2,
    ironCost: 20,
    repairCost: 5,
    maintenanceCost: 2,
    warriorTypes: ['grunt', 'berserker'],
  },
  bow: {
    id: 'bow',
    name: '猎弓',
    icon: '🏹',
    maxDurability: 80,
    attackBonus: 6,
    defenseBonus: 0,
    ironCost: 15,
    repairCost: 4,
    maintenanceCost: 2,
    warriorTypes: ['archer'],
    requires: { building: 'barracks', level: 2 },
  },
  spear: {
    id: 'spear',
    name: '长矛',
    icon: '🔱',
    maxDurability: 90,
    attackBonus: 4,
    defenseBonus: 3,
    ironCost: 18,
    repairCost: 4,
    maintenanceCost: 2,
    warriorTypes: ['grunt'],
  },
  hammer: {
    id: 'hammer',
    name: '战锤',
    icon: '🔨',
    maxDurability: 120,
    attackBonus: 8,
    defenseBonus: 3,
    ironCost: 30,
    repairCost: 8,
    maintenanceCost: 3,
    warriorTypes: ['berserker', 'warlord'],
    requires: { building: 'smithy', level: 2 },
  },
  sword: {
    id: 'sword',
    name: '弯刀',
    icon: '⚔️',
    maxDurability: 100,
    attackBonus: 7,
    defenseBonus: 2,
    ironCost: 25,
    repairCost: 6,
    maintenanceCost: 2,
    warriorTypes: ['warlord'],
    requires: { building: 'smithy', level: 4 },
  },
  staff: {
    id: 'staff',
    name: '巫杖',
    icon: '🪄',
    maxDurability: 70,
    attackBonus: 3,
    defenseBonus: 1,
    ironCost: 12,
    repairCost: 3,
    maintenanceCost: 1,
    warriorTypes: ['shaman'],
    requires: { building: 'barracks', level: 3 },
  },
};

export const WEAPONS_BY_WARRIOR: Record<WarriorType, WeaponType[]> = {
  grunt: ['axe', 'spear'],
  archer: ['bow'],
  shaman: ['staff'],
  berserker: ['axe', 'hammer'],
  warlord: ['hammer', 'sword'],
};

export const SUPPLY_LINE_MAINTENANCE_INTERVAL = 7;
export const BASE_DEPLOY_IRON_COST = 2;
export const BATTLE_DURABILITY_LOSS_MIN = 5;
export const BATTLE_DURABILITY_LOSS_MAX = 15;
export const REPAIR_EFFICIENCY_THRESHOLD = 0.3;

export const createWeapon = (warriorType: WarriorType): Weapon | null => {
  const weaponTypes = WEAPONS_BY_WARRIOR[warriorType];
  if (!weaponTypes || weaponTypes.length === 0) return null;
  
  const weaponType = weaponTypes[0];
  const config = WEAPONS[weaponType];
  if (!config) return null;

  return {
    type: config.id,
    name: config.name,
    icon: config.icon,
    durability: config.maxDurability,
    maxDurability: config.maxDurability,
    attackBonus: config.attackBonus,
    defenseBonus: config.defenseBonus,
    ironCost: config.ironCost,
    repairCost: config.repairCost,
    maintenanceCost: config.maintenanceCost,
  };
};

export const getWeaponConfigForWarrior = (warriorType: WarriorType): WeaponConfig | null => {
  const weaponTypes = WEAPONS_BY_WARRIOR[warriorType];
  if (!weaponTypes || weaponTypes.length === 0) return null;
  return WEAPONS[weaponTypes[0]] || null;
};

export const calculateDeploymentCost = (warriors: Warrior[], efficiency: number = 1): number => {
  let totalIron = 0;
  for (const warrior of warriors) {
    if (warrior.weapon) {
      totalIron += BASE_DEPLOY_IRON_COST;
    }
  }
  return Math.ceil(totalIron * efficiency);
};

export const calculateMaintenanceCost = (warriors: Warrior[], efficiency: number = 1): number => {
  let totalIron = 0;
  for (const warrior of warriors) {
    if (warrior.weapon) {
      totalIron += warrior.weapon.maintenanceCost;
    }
  }
  return Math.ceil(totalIron * efficiency);
};

export const calculateRepairCost = (warrior: Warrior): number => {
  if (!warrior.weapon) return 0;
  const damage = warrior.weapon.maxDurability - warrior.weapon.durability;
  if (damage <= 0) return 0;
  const config = WEAPONS[warrior.weapon.type];
  if (!config) return 0;
  return Math.ceil((damage / warrior.weapon.maxDurability) * config.repairCost * 2);
};

export const calculateTotalRepairCost = (warriors: Warrior[]): number => {
  return warriors.reduce((sum, w) => sum + calculateRepairCost(w), 0);
};

export const applyBattleDurabilityLoss = (warrior: Warrior, isVictory: boolean): number => {
  if (!warrior.weapon) return 0;
  
  const baseLoss = isVictory 
    ? BATTLE_DURABILITY_LOSS_MIN + Math.random() * (BATTLE_DURABILITY_LOSS_MAX - BATTLE_DURABILITY_LOSS_MIN) * 0.5
    : BATTLE_DURABILITY_LOSS_MIN + Math.random() * (BATTLE_DURABILITY_LOSS_MAX - BATTLE_DURABILITY_LOSS_MIN);
  
  const hpFactor = 1 - (warrior.hp / warrior.maxHp) * 0.3;
  const loss = Math.ceil(baseLoss * hpFactor);
  
  warrior.weapon.durability = Math.max(0, warrior.weapon.durability - loss);
  return loss;
};

export const getWeaponEfficiency = (weapon: Weapon): number => {
  const ratio = weapon.durability / weapon.maxDurability;
  if (ratio >= 0.8) return 1.0;
  if (ratio >= 0.5) return 0.85;
  if (ratio >= REPAIR_EFFICIENCY_THRESHOLD) return 0.7;
  return 0.5;
};

export const repairWeapon = (warrior: Warrior): { success: boolean; ironCost: number; message: string } => {
  if (!warrior.weapon) {
    return { success: false, ironCost: 0, message: '该战士没有武器' };
  }
  
  if (warrior.weapon.durability >= warrior.weapon.maxDurability) {
    return { success: false, ironCost: 0, message: '武器耐久度已满' };
  }
  
  const cost = calculateRepairCost(warrior);
  warrior.weapon.durability = warrior.weapon.maxDurability;
  
  return {
    success: true,
    ironCost: cost,
    message: `已修复 ${warrior.weapon.name}，消耗铁矿 ${cost}`
  };
};

export const maintainWeapon = (warrior: Warrior): { ironCost: number; efficiency: number } => {
  if (!warrior.weapon) return { ironCost: 0, efficiency: 1 };
  
  const config = WEAPONS[warrior.weapon.type];
  const cost = config ? config.maintenanceCost : 1;
  
  const efficiency = getWeaponEfficiency(warrior.weapon);
  if (efficiency < 0.9) {
    warrior.weapon.durability = Math.min(
      warrior.weapon.maxDurability,
      warrior.weapon.durability + Math.ceil(warrior.weapon.maxDurability * 0.1)
    );
  }
  
  return { ironCost: cost, efficiency };
};

export const createInitialArsenalState = (): ArsenalState => {
  const weapons = {} as Record<WarriorType, WeaponConfig>;
  
  for (const [warriorType, weaponTypes] of Object.entries(WEAPONS_BY_WARRIOR)) {
    const primaryWeapon = weaponTypes[0];
    const config = WEAPONS[primaryWeapon];
    if (config) {
      weapons[warriorType as WarriorType] = config;
    }
  }
  
  return {
    weapons,
    supplyLineLevel: 1,
    lastMaintenanceDay: 0,
    maintenanceInterval: SUPPLY_LINE_MAINTENANCE_INTERVAL,
    repairHistory: {},
    autoRepair: true,
    autoMaintenance: true,
    supplyLineStatus: 'normal',
    supplyEfficiency: 1,
  };
};

export const getSupplyLineModifier = (status: string): { costMod: number; efficiencyMod: number } => {
  switch (status) {
    case 'disrupted':
      return { costMod: 1.5, efficiencyMod: 0.7 };
    case 'boosted':
      return { costMod: 0.7, efficiencyMod: 1.3 };
    default:
      return { costMod: 1, efficiencyMod: 1 };
  }
};

export const canEquipWeapon = (warriorType: WarriorType, weaponType: WeaponType, buildings: any[] = []): boolean => {
  const config = WEAPONS[weaponType];
  if (!config) return false;
  
  if (!config.warriorTypes.includes(warriorType)) return false;
  
  if (config.requires) {
    const building = buildings.find(b => b.type === config.requires?.building && !b.isBuilding);
    if (!building || building.level < config.requires.level) return false;
  }
  
  return true;
};

export const calculateIronTradePrice = (basePrice: number, supplyStatus: string, priceFluctuation: number = 1): number => {
  const { costMod } = getSupplyLineModifier(supplyStatus);
  return Math.ceil(basePrice * costMod * priceFluctuation);
};

export const IRON_TRADE_SUPPLY_BOOST_THRESHOLD = 100;
export const IRON_CONSUMPTION_DISRUPT_THRESHOLD = 50;

export const getSupplyLineStatusName = (status: string): string => {
  switch (status) {
    case 'disrupted':
      return '补给中断';
    case 'boosted':
      return '补给充沛';
    default:
      return '正常供应';
  }
};

export const getSupplyLineStatusIcon = (status: string): string => {
  switch (status) {
    case 'disrupted':
      return '⛓️‍💥';
    case 'boosted':
      return '🚛';
    default:
      return '🔗';
  }
};

export const tryBoostSupplyLine = (ironAmount: number, currentStatus: string): { shouldBoost: boolean; newStatus: string } => {
  if (currentStatus === 'boosted') {
    return { shouldBoost: false, newStatus: currentStatus };
  }
  
  const boostChance = Math.min(0.3, ironAmount / IRON_TRADE_SUPPLY_BOOST_THRESHOLD * 0.2);
  
  if (Math.random() < boostChance) {
    const newStatus = currentStatus === 'disrupted' ? 'normal' : 'boosted';
    return { shouldBoost: true, newStatus };
  }
  
  return { shouldBoost: false, newStatus: currentStatus };
};

export const tryDisruptSupplyLine = (ironConsumed: number, currentStatus: string): { shouldDisrupt: boolean; newStatus: string } => {
  if (currentStatus === 'disrupted') {
    return { shouldDisrupt: false, newStatus: currentStatus };
  }
  
  const disruptChance = Math.min(0.25, ironConsumed / IRON_CONSUMPTION_DISRUPT_THRESHOLD * 0.15);
  
  if (Math.random() < disruptChance) {
    const newStatus = currentStatus === 'boosted' ? 'normal' : 'disrupted';
    return { shouldDisrupt: true, newStatus };
  }
  
  return { shouldDisrupt: false, newStatus: currentStatus };
};

export const getIronPriceFluctuationImpact = (ironConsumed: number): number => {
  return 1 + (ironConsumed / 200) * 0.1;
};
