import { create } from 'zustand';
import type {
  GameState,
  Resources,
  Building,
  BuildingType,
  Warrior,
  WarriorType,
  TrainingQueue,
  Invasion,
  Enemy,
  ActiveTribeEvent,
  EventEffect,
  Expedition,
  ExpeditionWarrior,
  ExpeditionResult,
  ExpeditionNotification,
  MapEventChoice,
  Tech,
  TechEffectType,
  ActiveTask,
  TaskChain,
  TaskGoalType,
  SeasonType,
  WeatherType,
  WeatherEffects,
  FactionType,
  Faction,
  DiplomaticAction,
  ActiveDiplomaticEvent,
  AllyReinforcement,
  EndingType,
  GameEnding,
  BuildingStorageInfo,
  Chieftain,
  Heir,
  PolicyEffectType,
  PolicyCategory,
  InheritanceType,
  ActivePolicy,
  TaxRates,
  UnitPreference,
  BattleLogEntry,
  BattleSummary,
  PositionRow,
} from '../types';
import { BUILDINGS, getBuildingCost, getBuildingProduction, getBuildingStorageCapacity, checkBuildingRequirements as checkBuildReqs, getBuildTime, getUpgradeTime, getProductionEstimate as getProdEstimate, getUpgradeHints as getUpgHints, getUnlockableBuildings as getUnlockableBldgs, getRequirementDescription } from '../data/buildings';
import { WARRIORS, getCounterBonus } from '../data/warriors';
import { generateInvasion, ENEMIES } from '../data/enemies';
import { generateTrades } from '../data/trades';
import { triggerRandomEvent } from '../data/events';
import {
  NODE_MARCH_TIME,
  EXP_GAIN,
  rollLoot,
  getExpeditionMap,
} from '../data/expedition';
import { TECHNOLOGIES } from '../data/technologies';
import { TASK_CONFIGS, TASK_REFRESH_INTERVAL, MAX_ACTIVE_CHAINS, selectRandomChains } from '../data/tasks';
import {
  SEASONS,
  getNextSeason,
  selectWeatherForSeason,
  getWeatherDuration,
  calculateCombinedEffects,
} from '../data/weather';
import {
  FACTIONS,
  createInitialFactions,
  getStanceFromReputation,
  getDiplomaticActions,
} from '../data/factions';
import {
  triggerRandomDiplomaticEvent,
  getDiplomaticEventInterval,
} from '../data/diplomaticEvents';
import { checkEndingConditions } from '../data/endings';
import { SPOILAGE_COOLDOWN_MIN, SPOILAGE_COOLDOWN_MAX, generateSpoilageEvent } from '../data/spoilage';
import {
  TOTEMS,
  BLESSINGS,
  TOTEM_OFFERS,
  getTotemCost,
  getTotemFaithCost,
  getTotemEffectBonus,
  getBlessingBonus,
  createInitialTotemState,
  getFaithPerSecond,
  getMaxFaith,
  canUnlockTotem as checkCanUnlockTotem,
  canActivateBlessing as checkCanActivateBlessing,
  getAvailableBlessings,
} from '../data/totems';
import {
  TRAPS,
  BASE_WARNING_TIME,
  BASE_PREPARATION_TIME,
  BASE_RAID_COOLDOWN,
  MAX_REPORTS,
  createInitialNightRaidState,
  generateNightRaidEnemies,
  calculateRaidRewards,
  createGarrisonSlots,
  calculateTrapDamage,
  generateId as generateNightRaidId,
} from '../data/nightRaid';
import {
  POLICIES,
  POLICY_CATEGORIES,
  INHERITANCE_CONFIGS,
  generateTribeName,
  generateHeirs,
  getPolicyById,
  getPolicyResearchTime,
  getPolicyPointGainPerDay,
  getMaxPolicyPoints,
  calculateTraitBonus,
  getPreferredWarriorType,
  getReignBonus,
  generateGovernmentAchievements,
  getTraitName,
  createInitialGovernmentState,
  getPoliciesByCategory,
  getChiefTitleByTrait,
} from '../data/government';
import {
  createInitialPriceFluctuations,
  getInitialTradeRoutes,
  RISK_EVENTS,
  getRiskChance,
  generateBlackMarketOffer,
  calculateRoutePriceBonus,
  NEGOTIATION_CONFIG,
  CARAVAN_CONFIG,
} from '../data/caravans';
import {
  refreshStocks,
  updatePriceFluctuations,
} from '../data/trades';
import type {
  ResourceType,
  ResourceCapacity,
  TransportTask,
  SpoilageEvent,
  TotemType,
  BlessingType,
  TotemUnlocked,
  ActiveBlessing,
  TotemEffectType,
  TrapType,
  Trap,
  NightRaid,
  NightRaidReport,
  Caravan,
  CaravanStatus,
  RiskEvent,
  NegotiationState,
  CaravanLogEntry,
  BuildQueueItemType,
  BuildQueueItem,
  BuildingRequirement,
  BuildingUpgradeHint,
  ProductionEstimate,
} from '../types';

const SAVE_KEY = 'beastmen_tribe_save';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const calculateTechBonus = (
  technologies: Tech[],
  effectType: TechEffectType,
  target?: string
): number => {
  let bonus = 0;
  for (const tech of technologies) {
    if (!tech.completed) continue;
    const config = TECHNOLOGIES[tech.techId];
    if (!config) continue;
    for (const effect of config.effects) {
      if (effect.type === effectType) {
        if (!effect.target || effect.target === target) {
          bonus += effect.value;
        }
      }
    }
  }
  return bonus;
};

const calculateTotemBonus = (
  unlockedTotems: TotemUnlocked[],
  activeBlessings: ActiveBlessing[],
  effectType: TotemEffectType | TechEffectType,
  target?: string
): number => {
  let bonus = 0;
  bonus += getTotemEffectBonus(unlockedTotems, effectType, target);
  bonus += getBlessingBonus(activeBlessings, effectType, target);
  return bonus;
};

const calculateGovernmentBonus = (
  state: GameState,
  effectType: PolicyEffectType | TechEffectType | TotemEffectType,
  target?: string
): number => {
  let bonus = 0;
  const gov = state.government;
  if (!gov) return 0;

  const chieftain = gov.chieftain.current;
  if (chieftain) {
    const traitBonuses = calculateTraitBonus(chieftain.attributes);
    switch (effectType) {
      case 'attack_boost':
        bonus += traitBonuses.attack;
        break;
      case 'defense_boost':
        bonus += traitBonuses.defense;
        break;
      case 'train_speed':
        bonus += traitBonuses.trainSpeed;
        break;
      case 'production_boost':
        bonus += traitBonuses.production;
        break;
      case 'diplomacy_bonus':
        bonus += traitBonuses.diplomacy;
        break;
      case 'trade_bonus':
        bonus += traitBonuses.tradeBonus;
        break;
      case 'faith_gain':
        bonus += traitBonuses.faithGain;
        break;
      case 'loyalty_boost':
        bonus += traitBonuses.loyaltyBoost;
        break;
      case 'population_growth':
        bonus += traitBonuses.populationGrowth;
        break;
      case 'research_speed':
        bonus += traitBonuses.researchSpeed;
        break;
      case 'loot_bonus':
        bonus += traitBonuses.lootBonus;
        break;
      case 'construction_speed':
        bonus += traitBonuses.constructionSpeed;
        break;
    }

    const reignBonuses = getReignBonus(chieftain.reignDays);
    if (effectType === 'attack_boost') bonus += reignBonuses.attackBonus;
    if (effectType === 'production_boost') bonus += reignBonuses.productionBonus;
    if (effectType === 'loyalty_boost') bonus += reignBonuses.loyaltyBonus;
  }

  for (const activePolicy of gov.activePolicies) {
    const policy = getPolicyById(activePolicy.policyId);
    if (!policy) continue;
    for (const effect of policy.effects) {
      if (effect.type === effectType) {
        if (!effect.target || effect.target === target) {
          bonus += effect.value;
        }
      }
    }
  }

  return bonus;
};

const calculateWeatherEffects = (
  season: SeasonType,
  weather: WeatherType
): WeatherEffects => {
  return calculateCombinedEffects(season, weather);
};

const calculateWallDefense = (buildings: Building[], technologies: Tech[]): number => {
  const baseDefense = buildings
    .filter((b) => b.type === 'wall' && !b.isBuilding)
    .reduce((sum, b) => sum + b.level * 10, 0);
  const techBonus = calculateTechBonus(technologies, 'wall_defense');
  return Math.floor(baseDefense * (1 + techBonus));
};

const checkTechRequirements = (
  techId: string,
  buildings: Building[],
  technologies: Tech[]
): boolean => {
  const config = TECHNOLOGIES[techId];
  if (!config?.requires) return true;

  for (const req of config.requires) {
    if (req.type === 'building') {
      const building = buildings.find(
        (b) => b.type === req.id && !b.isBuilding
      );
      if (!building || building.level < (req.level || 1)) {
        return false;
      }
    } else if (req.type === 'tech') {
      const tech = technologies.find((t) => t.techId === req.id);
      if (!tech || !tech.completed) {
        return false;
      }
    }
  }
  return true;
};

const FOOD_PER_POP = 0.5;
const BASE_POP_CAPACITY = 10;
const POP_GROWTH_RATE = 0.02;
const LOYALTY_FOOD_THRESHOLD = 10;
const LOYALTY_DECAY_NO_FOOD = 0.5;
const LOYALTY_RECOVERY_WELL_FED = 0.1;
const EVENT_INTERVAL_MIN = 60;
const EVENT_INTERVAL_MAX = 120;

const RETIRE_FOOD_REFUND_RATIO = 0.5;
const RETIRE_LOYALTY_PENALTY = 2;

const calculateMilitaryPopulation = (warriors: Warrior[]): number => {
  return warriors.reduce((sum, w) => sum + (WARRIORS[w.type]?.populationCost || 1), 0);
};

const calculateTrainingPopulation = (trainingQueue: TrainingQueue[]): number => {
  return trainingQueue.reduce((sum, q) => sum + q.count * (q.populationCost || WARRIORS[q.type]?.populationCost || 1), 0);
};

const calculateArmyFoodConsumption = (warriors: Warrior[]): number => {
  return warriors.reduce((sum, w) => sum + (WARRIORS[w.type]?.foodConsumption || 1), 0);
};

const getBarracksPopulationEfficiency = (buildings: Building[]): number => {
  const barracks = buildings.filter((b) => b.type === 'barracks' && !b.isBuilding);
  if (barracks.length === 0) return 1;
  const totalLevel = barracks.reduce((sum, b) => sum + b.level, 0);
  return Math.max(0.7, 1 - totalLevel * 0.05);
};

const BASE_RESOURCE_CAPACITY: ResourceCapacity = {
  food: 500,
  wood: 500,
  stone: 300,
  gold: 200,
  iron: 100,
};
void BASE_RESOURCE_CAPACITY;

const BUILDING_PRODUCTION_STORAGE_RATIO = 50;

const TRANSPORT_BASE_TIME = 10;
const MAX_TRANSPORT_TASKS = 5;
const MAX_OFFLINE_HOURS = 8;
const OFFLINE_EFFICIENCY = 0.7;

const getBuildingCapacityByType = (type: BuildingType, level: number): Partial<Resources> => {
  const config = BUILDINGS[type];
  if (!config) return {};

  if (config.baseStorageCapacity) {
    return getBuildingStorageCapacity(type, level);
  }

  const production = getBuildingProduction(type, level);
  if (Object.keys(production).length > 0) {
    const capacity: Partial<Resources> = {};
    for (const [key, rate] of Object.entries(production)) {
      capacity[key as keyof Resources] = Math.floor((rate as number) * BUILDING_PRODUCTION_STORAGE_RATIO);
    }
    return capacity;
  }

  if (type === 'townhall') {
    return {
      food: 200 * level,
      wood: 200 * level,
      stone: 150 * level,
      gold: 100 * level,
      iron: 50 * level,
    };
  }

  return {};
};

const calculateResourceCapacity = (buildings: Building[], _technologies?: Tech[]): ResourceCapacity => {
  const capacity: ResourceCapacity = { food: 0, wood: 0, stone: 0, gold: 0, iron: 0 };

  for (const b of buildings) {
    if (b.isBuilding) continue;
    const buildingCap = getBuildingCapacityByType(b.type, b.level);
    for (const [key, amount] of Object.entries(buildingCap)) {
      capacity[key as keyof ResourceCapacity] += amount as number;
    }
  }

  return capacity;
};

const calculateTotalResources = (buildings: Building[]): Resources => {
  const total: Resources = { food: 0, wood: 0, stone: 0, gold: 0, iron: 0 };
  for (const b of buildings) {
    for (const [key, amount] of Object.entries(b.storage || {})) {
      total[key as keyof Resources] += amount as number;
    }
  }
  return total;
};

const createActiveTask = (configId: string, currentDay: number): ActiveTask => {
  const config = TASK_CONFIGS.find((c) => c.id === configId);
  if (!config) throw new Error(`Task config not found: ${configId}`);
  return {
    id: generateId(),
    configId: config.id,
    name: config.name,
    icon: config.icon,
    description: config.description,
    goal: { ...config.goal },
    progress: 0,
    currentStage: 0,
    stages: config.stages.map((s) => ({ ...s })),
    status: 'active',
    startedAtDay: currentDay,
    duration: config.duration,
    failurePenalty: { ...config.failurePenalty },
    penaltyLoyalty: config.penaltyLoyalty,
    claimedStages: [],
  };
};

const createTaskChains = (currentDay: number): TaskChain[] => {
  const selected = selectRandomChains(MAX_ACTIVE_CHAINS);
  return selected.map((chainConfig) => ({
    id: generateId(),
    name: chainConfig.name,
    icon: chainConfig.icon,
    tasks: chainConfig.taskIds.map((taskId) => createActiveTask(taskId, currentDay)),
    currentTaskIndex: 0,
    chainReward: { ...chainConfig.chainReward },
    chainBonusLoyalty: chainConfig.chainBonusLoyalty,
    completed: false,
    chainRewardClaimed: false,
    failed: false,
  }));
};

const calculateMaxPopulation = (buildings: Building[], technologies: Tech[] = []): number => {
  let cap = BASE_POP_CAPACITY;
  for (const b of buildings) {
    if (b.isBuilding) continue;
    const config = BUILDINGS[b.type];
    if (config?.baseCapacity) {
      if (b.type === 'hut') {
        cap += config.baseCapacity * b.level;
      } else if (b.type === 'townhall') {
        cap += Math.floor(config.baseCapacity * b.level * 0.5);
      }
    }
  }
  const techBonus = calculateTechBonus(technologies, 'population_cap');
  cap += techBonus;
  return cap;
};

const calculateRecruitEfficiency = (loyalty: number, activeEvents: ActiveTribeEvent[]): number => {
  let efficiency = 0.5 + (loyalty / 100) * 0.5;
  for (const event of activeEvents) {
    for (const effect of event.effects) {
      if (effect.type === 'recruit_boost') {
        efficiency += effect.value;
      }
    }
  }
  return Math.max(0.2, Math.min(2.0, efficiency));
};

const createInitialState = (): GameState => {
  const initialBuildings: Building[] = [
    {
      id: 'townhall-1',
      type: 'townhall',
      level: 1,
      x: 400,
      y: 300,
      isBuilding: false,
      buildProgress: 100,
      lastCollect: Date.now(),
      storage: {
        food: 300,
        wood: 250,
        stone: 180,
        gold: 120,
        iron: 0,
      },
    },
  ];

  const initialFactions = createInitialFactions();
  return {
    tribeName: '血牙部落',
    day: 1,
    resources: calculateTotalResources(initialBuildings),
    resourceCapacity: calculateResourceCapacity(initialBuildings),
    buildings: initialBuildings,
    transportTasks: [],
    spoilageEvents: [],
    spoilageCooldown: SPOILAGE_COOLDOWN_MIN + Math.random() * (SPOILAGE_COOLDOWN_MAX - SPOILAGE_COOLDOWN_MIN),
    offlineEarnings: null,
    lastOnlineTime: Date.now(),
    warriors: [],
    trainingQueue: [],
    invasion: null,
    trades: generateTrades(6, 0, initialFactions, createInitialPriceFluctuations(), 1),
    unlockedBuildings: ['townhall', 'hut', 'farm', 'lumbermill', 'quarry', 'wall', 'totem_altar'],
    unlockedWarriors: ['grunt'],
    selectedBuildingId: null,
    lastSave: Date.now(),
    totalWins: 0,
    totalLosses: 0,
    population: 8,
    maxPopulation: BASE_POP_CAPACITY + 5,
    loyalty: 70,
    foodConsumptionRate: FOOD_PER_POP,
    activeEvents: [],
    eventCooldown: EVENT_INTERVAL_MIN + Math.random() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN),
    recruitEfficiency: 0.5 + (70 / 100) * 0.5,
    activeExpedition: null,
    expeditionNotifications: [],
    totalExpeditions: 0,
    expeditionWins: 0,
    technologies: [],
    activeResearch: null,
    unlockedTechnologies: [],
    taskChains: createTaskChains(1),
    lastTaskRefreshDay: 1,
    taskRefreshInterval: TASK_REFRESH_INTERVAL,
    totalChainsCompleted: 0,
    totalChainsFailed: 0,
    season: 'spring',
    weather: 'sunny',
    seasonProgress: 0,
    weatherDuration: getWeatherDuration('sunny'),
    factions: initialFactions,
    activeDiplomaticEvents: [],
    diplomaticEventCooldown: getDiplomaticEventInterval(),
    allyReinforcements: [],
    totalTrades: 0,
    gameEnding: null,
    totem: createInitialTotemState(),
    nightRaid: createInitialNightRaidState(),
    government: createInitialGovernmentState(1),
    tradeRoutes: getInitialTradeRoutes(1, initialFactions),
    caravans: [],
    caravanLogs: [],
    blackMarketOffers: [],
    priceFluctuations: createInitialPriceFluctuations(),
    currentNegotiation: null,
    lastStockRefresh: Date.now(),
    stockRefreshInterval: 90,
    caravanCooldown: 0,
    activeCaravanCount: 0,
    maxCaravans: 1,
    wantedLevel: 0,
    lastBlackMarketRefresh: 0,
    blackMarketRefreshInterval: 120,
    buildQueue: [],
    maxBuildQueueSize: 3,
  };
};

const loadSave = (): GameState => {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as GameState;
      const state: GameState = {
        ...createInitialState(),
        ...parsed,
        trades: generateTrades(6, 0, parsed.factions),
        selectedBuildingId: null,
        activeEvents: parsed.activeEvents || [],
        population: parsed.population ?? 8,
        maxPopulation: parsed.maxPopulation ?? calculateMaxPopulation(parsed.buildings, parsed.technologies || []),
        loyalty: parsed.loyalty ?? 70,
        foodConsumptionRate: parsed.foodConsumptionRate ?? FOOD_PER_POP,
        eventCooldown: parsed.eventCooldown ?? EVENT_INTERVAL_MIN + Math.random() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN),
        recruitEfficiency: parsed.recruitEfficiency ?? 0.5 + ((parsed.loyalty ?? 70) / 100) * 0.5,
        factions: parsed.factions || createInitialFactions(),
        activeDiplomaticEvents: parsed.activeDiplomaticEvents || [],
        diplomaticEventCooldown: parsed.diplomaticEventCooldown ?? getDiplomaticEventInterval(),
        allyReinforcements: parsed.allyReinforcements || [],
        totalTrades: parsed.totalTrades || 0,
        gameEnding: parsed.gameEnding || null,
        transportTasks: parsed.transportTasks || [],
        spoilageEvents: parsed.spoilageEvents || [],
        spoilageCooldown: parsed.spoilageCooldown ?? SPOILAGE_COOLDOWN_MIN + Math.random() * (SPOILAGE_COOLDOWN_MAX - SPOILAGE_COOLDOWN_MIN),
        offlineEarnings: parsed.offlineEarnings || null,
        lastOnlineTime: parsed.lastOnlineTime || Date.now(),
      };
      state.maxPopulation = calculateMaxPopulation(state.buildings, state.technologies);
      state.recruitEfficiency = calculateRecruitEfficiency(state.loyalty, state.activeEvents);
      state.activeExpedition = parsed.activeExpedition || null;
      state.expeditionNotifications = parsed.expeditionNotifications || [];
      state.totalExpeditions = parsed.totalExpeditions || 0;
      state.expeditionWins = parsed.expeditionWins || 0;
      state.technologies = parsed.technologies || [];
      state.activeResearch = parsed.activeResearch || null;
      state.unlockedTechnologies = parsed.unlockedTechnologies || [];
      state.taskChains = parsed.taskChains || createTaskChains(1);
      state.lastTaskRefreshDay = parsed.lastTaskRefreshDay ?? 1;
      state.taskRefreshInterval = parsed.taskRefreshInterval ?? TASK_REFRESH_INTERVAL;
      state.totalChainsCompleted = parsed.totalChainsCompleted || 0;
      state.totalChainsFailed = parsed.totalChainsFailed || 0;
      state.season = parsed.season || 'spring';
      state.weather = parsed.weather || 'sunny';
      state.seasonProgress = parsed.seasonProgress || 0;
      state.weatherDuration = parsed.weatherDuration ?? getWeatherDuration(state.weather);

      const needsMigration = state.buildings.some((b) => !b.storage || Object.keys(b.storage).length === 0);
      if (needsMigration && parsed.resources) {
        const townhall = state.buildings.find((b) => b.type === 'townhall');
        if (townhall) {
          townhall.storage = { ...parsed.resources };
        } else {
          for (const b of state.buildings) {
            if (!b.storage) b.storage = {};
          }
        }
      }
      state.buildings = state.buildings.map((b) => ({
        ...b,
        storage: b.storage || {},
      }));

      state.resourceCapacity = calculateResourceCapacity(state.buildings, state.technologies);
      state.resources = calculateTotalResources(state.buildings);
      
      if (state.taskChains.length > 0) {
        state.taskChains = state.taskChains.map((c) => ({
          ...c,
          chainRewardClaimed: c.chainRewardClaimed ?? false,
          failed: c.failed ?? c.tasks.some((t) => t.status === 'failed'),
        }));
      }

      const now = Date.now();
      const offlineMs = now - state.lastOnlineTime;
      const offlineSeconds = Math.min(offlineMs / 1000, MAX_OFFLINE_HOURS * 3600);
      
      if (offlineSeconds > 60) {
        const totalGain: Partial<Resources> = {};
        const weatherEffects = calculateWeatherEffects(state.season, state.weather);
        const perBuildingGain: Record<string, Partial<Resources>> = {};
        
        for (const b of state.buildings) {
          if (b.isBuilding) continue;
          const production = getBuildingProduction(b.type, b.level);
          if (Object.keys(production).length === 0) continue;

          perBuildingGain[b.id] = {};
          const prodBonus = calculateTechBonus(state.technologies, 'production_boost', b.type);
          const globalProdBonus = calculateTechBonus(state.technologies, 'production_boost');
          const totalProdBonus = 1 + prodBonus + globalProdBonus;

          for (const [key, rate] of Object.entries(production)) {
            const baseAmount = (rate as number) * offlineSeconds * totalProdBonus * OFFLINE_EFFICIENCY;
            const weatherMod = weatherEffects.resourceModifiers[key as keyof Resources] || 0;
            const amount = baseAmount * (1 + weatherMod);
            perBuildingGain[b.id][key as keyof Resources] = amount;
            totalGain[key as keyof Resources] = (totalGain[key as keyof Resources] || 0) + amount;
          }
        }

        state.buildings = state.buildings.map((b) => {
          const gain = perBuildingGain[b.id];
          if (!gain) return b;
          const newStorage = { ...(b.storage || {}) };
          const cap = getBuildingCapacityByType(b.type, b.level);
          for (const [key, amount] of Object.entries(gain)) {
            const current = newStorage[key as keyof Resources] || 0;
            const maxCap = cap[key as keyof Resources] || 0;
            if (maxCap > 0) {
              newStorage[key as keyof Resources] = Math.min(current + (amount as number), maxCap);
            }
          }
          return { ...b, storage: newStorage };
        });

        state.resources = calculateTotalResources(state.buildings);

        const finalGain: Partial<Resources> = {};
        for (const [key, amount] of Object.entries(totalGain)) {
          if ((amount as number) > 0.5) {
            finalGain[key as keyof Resources] = Math.floor(amount as number);
          }
        }

        if (Object.keys(finalGain).length > 0) {
          state.offlineEarnings = {
            resources: finalGain,
            duration: offlineSeconds,
            collected: false,
            timestamp: now,
          };
        }
      }

      state.lastOnlineTime = now;

      state.totem = parsed.totem
        ? {
            ...createInitialTotemState(),
            ...parsed.totem,
            unlockedTotems: parsed.totem.unlockedTotems || [],
            activeBlessings: parsed.totem.activeBlessings || [],
            availableBlessings: parsed.totem.availableBlessings || [],
            offers: TOTEM_OFFERS,
            offerCooldowns: parsed.totem.offerCooldowns || {},
            accumulation: {
              lastTick: Date.now(),
              perSecond: getFaithPerSecond(state.buildings, parsed.totem.unlockedTotems || []),
            },
          }
        : createInitialTotemState();
      state.totem.maxFaith = getMaxFaith(state.buildings);
      state.totem.availableBlessings = getAvailableBlessings(state.totem.unlockedTotems);
      state.totem.accumulation.perSecond = getFaithPerSecond(state.buildings, state.totem.unlockedTotems);
      if (state.totem.faith > state.totem.maxFaith) {
        state.totem.faith = state.totem.maxFaith;
      }

      if (!state.unlockedBuildings.includes('totem_altar')) {
        state.unlockedBuildings = [...state.unlockedBuildings, 'totem_altar'];
      }

      state.trainingQueue = (state.trainingQueue || []).map((q) => ({
        ...q,
        populationCost: q.populationCost || WARRIORS[q.type]?.populationCost || 1,
      }));

      const militaryPop = calculateMilitaryPopulation(state.warriors);
      const trainingPop = calculateTrainingPopulation(state.trainingQueue);
      const totalArmyPop = militaryPop + trainingPop;
      if (state.population < totalArmyPop) {
        state.population = totalArmyPop;
        state.maxPopulation = Math.max(state.maxPopulation, state.population + 5);
      }

      state.nightRaid = parsed.nightRaid
        ? {
            ...createInitialNightRaidState(),
            ...parsed.nightRaid,
            reports: parsed.nightRaid.reports || [],
            availableTraps: parsed.nightRaid.availableTraps || {
              spike: 0,
              fire: 0,
              poison: 0,
              net: 0,
              boulder: 0,
            },
            placedTraps: parsed.nightRaid.placedTraps || [],
            garrisonWarriors: parsed.nightRaid.garrisonWarriors || [],
          }
        : createInitialNightRaidState();

      state.government = parsed.government
        ? {
            ...createInitialGovernmentState(state.day),
            ...parsed.government,
            chieftain: {
              ...createInitialGovernmentState(state.day).chieftain,
              ...parsed.government.chieftain,
              heirs: parsed.government.chieftain?.heirs || [],
            },
            activePolicies: parsed.government.activePolicies || [],
            completedPolicies: parsed.government.completedPolicies || [],
            availablePolicies: parsed.government.availablePolicies || POLICIES.filter(p => p.tier === 1).map(p => p.id),
            unlockedPolicyCategories: parsed.government.unlockedPolicyCategories || ['military', 'economy', 'culture'],
          }
        : createInitialGovernmentState(state.day);

      state.buildQueue = parsed.buildQueue || [];
      state.maxBuildQueueSize = parsed.maxBuildQueueSize || 3;

      return state;
    }
  } catch (e) {
    console.error('Failed to load save:', e);
  }
  return createInitialState();
};

interface GameStore extends GameState {
  canAfford: (cost: Partial<Resources>) => boolean;
  spendResources: (cost: Partial<Resources>) => boolean;
  addResources: (gain: Partial<Resources>) => void;

  addResourcesToBuilding: (buildingId: string, gain: Partial<Resources>) => Partial<Resources>;
  removeResourcesFromBuilding: (buildingId: string, cost: Partial<Resources>) => boolean;
  getBuildingStorage: (buildingId: string) => Partial<Resources>;
  getBuildingCapacity: (buildingId: string) => Partial<Resources>;
  getAllBuildingStorageInfo: () => BuildingStorageInfo[];

  buildBuilding: (type: BuildingType, x: number, y: number) => boolean;
  upgradeBuilding: (buildingId: string) => boolean;
  collectResources: () => Partial<Resources>;
  selectBuilding: (buildingId: string | null) => void;

  trainWarrior: (type: WarriorType) => boolean;
  processTraining: (delta: number) => Warrior[];
  retireWarrior: (warriorId: string) => { success: boolean; message: string };
  getMilitaryPopulation: () => number;
  getTrainingPopulation: () => number;
  getAvailablePopulation: () => number;
  getArmyFoodConsumption: () => number;

  startInvasion: () => void;
  fightBattle: () => { result: 'victory' | 'defeat'; log: string[]; battleLog: BattleLogEntry[]; battleSummary: BattleSummary };

  executeTrade: (tradeId: string) => boolean;
  refreshTrades: () => void;

  applyEventEffects: (effects: EventEffect[]) => void;
  processPopulationTick: (delta: number) => void;
  processEventTick: (delta: number) => void;
  dismissEvent: (eventId: string) => void;

  startExpedition: (mapId: string, warriorIds: string[]) => boolean;
  resolveExpeditionEvent: (choice: MapEventChoice) => void;
  processExpeditionTick: (delta: number) => void;
  settleExpedition: () => void;
  cancelExpedition: () => void;
  dismissExpeditionNotification: (id: string) => void;

  startResearch: (techId: string) => boolean;
  cancelResearch: () => void;
  processResearch: (delta: number) => void;
  canResearch: (techId: string) => boolean;
  getTechBonus: (effectType: TechEffectType, target?: string) => number;

  refreshTaskChains: () => void;
  processTaskTick: (delta: number) => void;
  claimTaskStageReward: (chainId: string, taskId: string, stageIndex: number) => boolean;
  updateTaskProgress: (goalType: TaskGoalType, amount: number, target?: string) => void;
  claimChainReward: (chainId: string) => boolean;

  processWeatherTick: (delta: number) => { seasonChanged: boolean; weatherChanged: boolean };
  getWeatherEffects: () => WeatherEffects;
  advanceSeason: () => void;
  changeWeather: () => void;

  changeFactionReputation: (factionId: FactionType, amount: number) => void;
  executeDiplomaticAction: (actionId: string) => { success: boolean; message: string };
  getAvailableDiplomaticActions: (factionId: FactionType) => DiplomaticAction[];
  resolveDiplomaticEvent: (eventId: string, choiceId: string) => void;
  processDiplomaticTick: (delta: number) => void;
  dismissDiplomaticEvent: (eventId: string) => void;
  requestMilitaryAid: (factionId: FactionType) => boolean;
  processAllyReinforcementsTick: (delta: number) => void;

  checkForEnding: () => EndingType | null;
  triggerEnding: (endingType: EndingType) => void;

  calculateResourceCapacity: () => ResourceCapacity;
  startTransport: (resource: ResourceType, amount: number, fromBuildingId: string, toBuildingId: string) => boolean;
  cancelTransport: (taskId: string) => boolean;
  processTransportTick: (delta: number) => void;
  
  processSpoilageTick: (delta: number) => void;
  dismissSpoilageEvent: (eventId: string) => void;
  
  collectOfflineEarnings: () => boolean;
  
  getStorageUsagePercent: (resource: ResourceType) => number;
  getBuildingStorageUsagePercent: (buildingId: string, resource: ResourceType) => number;

  getTotemBonus: (effectType: TotemEffectType | TechEffectType, target?: string) => number;
  unlockTotem: (totemId: TotemType) => { success: boolean; message: string };
  activateTotem: (totemId: TotemType) => { success: boolean; message: string };
  deactivateTotem: (totemId: TotemType) => { success: boolean; message: string };
  upgradeTotem: (totemId: TotemType) => { success: boolean; message: string };
  performOffering: (offerId: string) => { success: boolean; message: string };
  activateBlessing: (blessingType: BlessingType) => { success: boolean; message: string };
  processTotemTick: (delta: number) => void;

  buildTrap: (trapType: TrapType) => { success: boolean; message: string };
  placeTrap: (trapType: TrapType) => { success: boolean; message: string };
  removeTrap: (trapId: string) => void;
  assignGarrison: (warriorId: string) => boolean;
  unassignGarrison: (warriorId: string) => void;
  startNightRaid: () => void;
  startNightRaidBattle: () => { result: 'victory' | 'defeat'; log: string[] };
  claimRaidReward: (reportId: string) => boolean;
  closeNightRaidResult: () => void;
  processNightRaidTick: (delta: number) => void;

  getGovernmentBonus: (effectType: PolicyEffectType | TechEffectType | TotemEffectType, target?: string) => number;
  startPolicyResearch: (policyId: string) => { success: boolean; message: string };
  cancelPolicyResearch: () => void;
  processPolicyResearch: (delta: number) => void;
  canResearchPolicy: (policyId: string) => { canResearch: boolean; reason?: string };
  abdicateChieftain: (heirId: string) => { success: boolean; message: string };
  abdicateChief: (heirId?: string) => { success: boolean; message: string };
  selectHeir: (heirId: string) => { success: boolean; message: string };
  changeInheritanceType: (type: InheritanceType) => { success: boolean; message: string };
  adjustTaxRate: (resource: ResourceType, rate: number) => { success: boolean; message: string };
  setTaxRate: (resource: keyof TaxRates, rate: number) => void;
  regenerateTribeName: () => string;
  refreshHeirs: () => void;
  processGovernmentTick: (delta: number) => void;
  unlockPolicyCategory: (category: PolicyCategory) => { success: boolean; message: string };
  activatePolicy: (policyId: string) => { success: boolean; message: string };
  deactivatePolicy: (policyId: string) => { success: boolean; message: string };
  isPolicyActive: (policyId: string) => boolean;
  setUnitPreference: (pref: UnitPreference) => void;

  tick: (delta: number) => void;
  saveGame: () => void;
  resetGame: () => void;
  setTribeName: (name: string) => void;

  startCaravan: (routeId: string, cargo: Partial<Record<ResourceType, number>>, warriorIds: string[]) => { success: boolean; message: string };
  cancelCaravan: (caravanId: string) => boolean;
  resolveCaravanRisk: (caravanId: string, fight: boolean) => { success: boolean; message: string };
  processCaravanTick: (delta: number) => void;
  addCaravanLog: (caravanId: string, message: string, type: 'info' | 'success' | 'warning' | 'danger') => void;

  startNegotiation: (tradeId: string) => boolean;
  attemptNegotiation: (aggressive: boolean) => { success: boolean; message: string; newModifier?: number };
  cancelNegotiation: () => void;

  acceptBlackMarketOffer: (offerId: string) => { success: boolean; message: string };
  refreshBlackMarket: () => boolean;
  processBlackMarketTick: (delta: number) => void;

  processPriceFluctuationTick: (delta: number) => void;
  processStockRefreshTick: (delta: number) => void;

  unlockTradeRoute: (routeId: string) => boolean;
  getMaxCaravans: () => number;
  getCargoCapacity: () => number;

  addToBuildQueue: (type: BuildQueueItemType, buildingType: BuildingType, x?: number, y?: number, buildingId?: string) => boolean;
  cancelBuildQueueItem: (itemId: string) => boolean;
  processBuildQueue: (delta: number) => void;
  canBuild: (type: BuildingType) => { canBuild: boolean; reason?: string };
  getProductionEstimate: (type: BuildingType, level: number) => ProductionEstimate;
  getUpgradeHints: () => BuildingUpgradeHint[];
  getUnlockableBuildings: () => BuildingType[];
  checkBuildingRequirements: (type: BuildingType) => { met: boolean; missing: BuildingRequirement[] };
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...loadSave(),

  canAfford: (cost) => {
    const { buildings } = get();
    const total = calculateTotalResources(buildings);
    return Object.entries(cost).every(
      ([key, amount]) => (total[key as keyof Resources] || 0) >= (amount as number)
    );
  },

  spendResources: (cost) => {
    const state = get();
    const { buildings } = state;
    const total = calculateTotalResources(buildings);
    for (const [key, amount] of Object.entries(cost)) {
      if ((total[key as keyof Resources] || 0) < (amount as number)) {
        return false;
      }
    }

    const sortedBuildings = [...buildings].sort((a, b) => {
      const aStorage = a.storage || {};
      const bStorage = b.storage || {};
      const aHasCost = Object.keys(cost).some((k) => (aStorage as any)[k] > 0);
      const bHasCost = Object.keys(cost).some((k) => (bStorage as any)[k] > 0);
      if (aHasCost !== bHasCost) return aHasCost ? -1 : 1;
      return 0;
    });

    const remaining = { ...cost } as Record<string, number>;
    const newBuildings = sortedBuildings.map((b) => {
      const newStorage = { ...(b.storage || {}) };
      for (const key of Object.keys(remaining)) {
        if (remaining[key] <= 0) continue;
        const available = newStorage[key as keyof Resources] || 0;
        if (available > 0) {
          const deduct = Math.min(available, remaining[key]);
          newStorage[key as keyof Resources] = available - deduct;
          remaining[key] -= deduct;
        }
      }
      return { ...b, storage: newStorage };
    });

    const finalBuildings = buildings.map((b) => {
      const updated = newBuildings.find((nb) => nb.id === b.id);
      return updated || b;
    });

    set({
      buildings: finalBuildings,
      resources: calculateTotalResources(finalBuildings),
    });
    return true;
  },

  addResources: (gain) => {
    const state = get();
    const { buildings } = state;
    const townhall = buildings.find((b) => b.type === 'townhall' && !b.isBuilding);
    const warehouses = buildings.filter((b) => b.type === 'warehouse' && !b.isBuilding);
    const targets = warehouses.length > 0 ? warehouses : (townhall ? [townhall] : []);

    if (targets.length === 0) {
      const newBuildings = buildings.map((b) => {
        const newStorage = { ...(b.storage || {}) };
        const cap = getBuildingCapacityByType(b.type, b.level);
        for (const [key, amount] of Object.entries(gain)) {
          const current = newStorage[key as keyof Resources] || 0;
          const maxCap = cap[key as keyof Resources] || 0;
          if (maxCap > 0) {
            newStorage[key as keyof Resources] = Math.min(current + (amount as number), maxCap);
          }
        }
        return { ...b, storage: newStorage };
      });
      set({ buildings: newBuildings, resources: calculateTotalResources(newBuildings) });
      return;
    }

    const remaining = { ...gain } as Record<string, number>;
    const newBuildings = buildings.map((b) => {
      const isTarget = targets.some((t) => t.id === b.id);
      if (!isTarget) return b;

      const newStorage = { ...(b.storage || {}) };
      const cap = getBuildingCapacityByType(b.type, b.level);
      for (const key of Object.keys(remaining)) {
        if (remaining[key] <= 0) continue;
        const current = newStorage[key as keyof Resources] || 0;
        const maxCap = cap[key as keyof Resources] || 0;
        const available = maxCap > 0 ? maxCap - current : 0;
        if (available > 0) {
          const add = Math.min(available, remaining[key]);
          newStorage[key as keyof Resources] = current + add;
          remaining[key] -= add;
        }
      }
      return { ...b, storage: newStorage };
    });

    set({ buildings: newBuildings, resources: calculateTotalResources(newBuildings) });
  },

  addResourcesToBuilding: (buildingId, gain) => {
    const state = get();
    const overflow: Partial<Resources> = {};
    const newBuildings = state.buildings.map((b) => {
      if (b.id !== buildingId) return b;
      const newStorage = { ...(b.storage || {}) };
      const cap = getBuildingCapacityByType(b.type, b.level);
      for (const [key, amount] of Object.entries(gain)) {
        const current = newStorage[key as keyof Resources] || 0;
        const maxCap = cap[key as keyof Resources] || 0;
        if (maxCap <= 0) {
          overflow[key as keyof Resources] = (overflow[key as keyof Resources] || 0) + (amount as number);
          continue;
        }
        const newTotal = current + (amount as number);
        if (newTotal > maxCap) {
          overflow[key as keyof Resources] = (overflow[key as keyof Resources] || 0) + (newTotal - maxCap);
          newStorage[key as keyof Resources] = maxCap;
        } else {
          newStorage[key as keyof Resources] = newTotal;
        }
      }
      return { ...b, storage: newStorage };
    });
    set({ buildings: newBuildings, resources: calculateTotalResources(newBuildings) });
    return overflow;
  },

  removeResourcesFromBuilding: (buildingId, cost) => {
    const state = get();
    const building = state.buildings.find((b) => b.id === buildingId);
    if (!building) return false;

    for (const [key, amount] of Object.entries(cost)) {
      const available = (building.storage || {})[key as keyof Resources] || 0;
      if (available < (amount as number)) return false;
    }

    const newBuildings = state.buildings.map((b) => {
      if (b.id !== buildingId) return b;
      const newStorage = { ...(b.storage || {}) };
      for (const [key, amount] of Object.entries(cost)) {
        newStorage[key as keyof Resources] = (newStorage[key as keyof Resources] || 0) - (amount as number);
      }
      return { ...b, storage: newStorage };
    });
    set({ buildings: newBuildings, resources: calculateTotalResources(newBuildings) });
    return true;
  },

  getBuildingStorage: (buildingId) => {
    const b = get().buildings.find((b) => b.id === buildingId);
    return b ? (b.storage || {}) : {};
  },

  getBuildingCapacity: (buildingId) => {
    const b = get().buildings.find((b) => b.id === buildingId);
    return b ? getBuildingCapacityByType(b.type, b.level) : {};
  },

  getAllBuildingStorageInfo: () => {
    const { buildings } = get();
    return buildings
      .filter((b) => !b.isBuilding)
      .map((b) => ({
        buildingId: b.id,
        buildingType: b.type,
        buildingName: BUILDINGS[b.type]?.name || b.type,
        storage: b.storage || {},
        capacity: getBuildingCapacityByType(b.type, b.level),
      }))
      .filter((info) => Object.keys(info.capacity).length > 0);
  },

  buildBuilding: (type, x, y) => {
    const state = get();
    const config = BUILDINGS[type];
    if (!config) return false;
    if (!state.unlockedBuildings.includes(type)) return false;

    const baseCost = getBuildingCost(type, 0);
    const costBonus = calculateTechBonus(state.technologies, 'resource_cost');
    const cost: Partial<Resources> = {};
    for (const [key, amount] of Object.entries(baseCost)) {
      cost[key as keyof Resources] = Math.floor((amount as number) * (1 + costBonus));
    }
    if (!state.spendResources(cost)) return false;

    const newBuilding: Building = {
      id: generateId(),
      type,
      level: 1,
      x,
      y,
      isBuilding: true,
      buildProgress: 0,
      lastCollect: Date.now(),
      storage: {},
    };

    const newUnlocked = [...state.unlockedBuildings];
    if (type === 'barracks') {
      if (!newUnlocked.includes('smithy')) newUnlocked.push('smithy');
    }
    if (type === 'market') {
      if (!newUnlocked.includes('warehouse')) newUnlocked.push('warehouse');
      if (!newUnlocked.includes('caravanserai')) newUnlocked.push('caravanserai');
    }
    if (type === 'totem_altar') {
      if (!newUnlocked.includes('totem_pole')) newUnlocked.push('totem_pole');
    }
    if (type === 'totem_pole') {
      if (!newUnlocked.includes('shrine')) newUnlocked.push('shrine');
    }

    const newBuildings = [...state.buildings, newBuilding];
    const newTotem = {
      ...state.totem,
      maxFaith: getMaxFaith(newBuildings),
      accumulation: {
        ...state.totem.accumulation,
        perSecond: getFaithPerSecond(newBuildings, state.totem.unlockedTotems),
      },
    };
    set({
      buildings: newBuildings,
      unlockedBuildings: newUnlocked,
      maxPopulation: calculateMaxPopulation(newBuildings, state.technologies),
      resourceCapacity: calculateResourceCapacity(newBuildings, state.technologies),
      resources: calculateTotalResources(newBuildings),
      totem: newTotem,
    });

    state.updateTaskProgress('build_buildings', 1, type);

    return true;
  },

  selectBuilding: (buildingId) => {
    set({ selectedBuildingId: buildingId });
  },

  upgradeBuilding: (buildingId) => {
    const state = get();
    const building = state.buildings.find((b) => b.id === buildingId);
    if (!building) return false;
    const config = BUILDINGS[building.type];
    if (!config || building.level >= config.maxLevel) return false;

    const baseCost = getBuildingCost(building.type, building.level);
    const costBonus = calculateTechBonus(state.technologies, 'resource_cost');
    const cost: Partial<Resources> = {};
    for (const [key, amount] of Object.entries(baseCost)) {
      cost[key as keyof Resources] = Math.floor((amount as number) * (1 + costBonus));
    }
    if (!state.spendResources(cost)) return false;

    const newUnlockedBuildings = [...state.unlockedBuildings];
    const newBuildings = state.buildings.map((b) => {
      if (b.id !== buildingId) return b;
      const newLevel = b.level + 1;

      if (b.type === 'townhall') {
        if (newLevel >= 2) {
          if (!newUnlockedBuildings.includes('barracks')) newUnlockedBuildings.push('barracks');
          if (!newUnlockedBuildings.includes('market')) newUnlockedBuildings.push('market');
        }
      }

      return { ...b, level: newLevel };
    });

    const newTotemUp = {
      ...state.totem,
      maxFaith: getMaxFaith(newBuildings),
      accumulation: {
        ...state.totem.accumulation,
        perSecond: getFaithPerSecond(newBuildings, state.totem.unlockedTotems),
      },
    };
    set({
      buildings: newBuildings,
      unlockedBuildings: newUnlockedBuildings,
      maxPopulation: calculateMaxPopulation(newBuildings, state.technologies),
      resourceCapacity: calculateResourceCapacity(newBuildings, state.technologies),
      resources: calculateTotalResources(newBuildings),
      totem: newTotemUp,
    });

    state.updateTaskProgress('upgrade_buildings', 1);

    return true;
  },

  collectResources: () => {
    const state = get();
    const now = Date.now();
    const totalGain: Partial<Resources> = {};
    const weatherEffects = state.getWeatherEffects();

    const updatedBuildings = state.buildings.map((b) => {
      if (b.isBuilding) return b;
      const production = getBuildingProduction(b.type, b.level);
      if (Object.keys(production).length === 0) return b;

      const elapsed = (now - b.lastCollect) / 1000;
      const prodTechBonus = calculateTechBonus(state.technologies, 'production_boost', b.type);
      const globalProdTechBonus = calculateTechBonus(state.technologies, 'production_boost');
      const prodTotemBonus = state.getTotemBonus('production_boost', b.type);
      const globalProdTotemBonus = state.getTotemBonus('production_boost');
      const prodGovBonus = state.getGovernmentBonus('production_boost', b.type);
      const globalProdGovBonus = state.getGovernmentBonus('production_boost');
      const totalProdBonus = 1 + prodTechBonus + globalProdTechBonus + prodTotemBonus + globalProdTotemBonus + prodGovBonus + globalProdGovBonus;

      const newStorage = { ...(b.storage || {}) };
      const cap = getBuildingCapacityByType(b.type, b.level);

      for (const [key, rate] of Object.entries(production)) {
        const baseAmount = (rate as number) * elapsed * totalProdBonus;
        const weatherMod = weatherEffects.resourceModifiers[key as keyof Resources] || 0;
        const amount = baseAmount * (1 + weatherMod);
        const resourceKey = key as keyof Resources;

        const current = newStorage[resourceKey] || 0;
        const maxCap = cap[resourceKey] || 0;
        if (maxCap > 0) {
          const actualAdd = Math.min(amount, maxCap - current);
          if (actualAdd > 0) {
            newStorage[resourceKey] = current + actualAdd;
            totalGain[resourceKey] = (totalGain[resourceKey] || 0) + actualAdd;
          }
        }
      }

      return { ...b, lastCollect: now, storage: newStorage };
    });

    set({
      buildings: updatedBuildings,
      resources: calculateTotalResources(updatedBuildings),
      resourceCapacity: calculateResourceCapacity(updatedBuildings, state.technologies),
    });
    return totalGain;
  },

  trainWarrior: (type) => {
    const state = get();
    const config = WARRIORS[type];
    if (!config) return false;
    if (!state.unlockedWarriors.includes(type)) return false;

    if (config.requires) {
      const reqBuilding = state.buildings.find((b) => b.type === config.requires!.building);
      if (!reqBuilding || reqBuilding.level < config.requires.level) return false;
    }

    const barracksEfficiency = getBarracksPopulationEfficiency(state.buildings);
    const popCost = Math.max(1, Math.ceil(config.populationCost * barracksEfficiency));
    const currentMilitaryPop = calculateMilitaryPopulation(state.warriors);
    const currentTrainingPop = calculateTrainingPopulation(state.trainingQueue);
    const totalUsedPop = currentMilitaryPop + currentTrainingPop;
    const availablePop = state.population - totalUsedPop;
    if (availablePop < popCost) return false;

    const trainCostBonus = calculateTechBonus(state.technologies, 'train_cost');
    const actualCost: Partial<Resources> = {};
    for (const [key, amount] of Object.entries(config.cost)) {
      actualCost[key as keyof Resources] = Math.floor((amount as number) * (1 + trainCostBonus));
    }

    if (!state.spendResources(actualCost)) return false;

    const existingQueue = state.trainingQueue.find((q) => q.type === type);
    if (existingQueue) {
      set({
        trainingQueue: state.trainingQueue.map((q) =>
          q.type === type ? { ...q, count: q.count + 1 } : q
        ),
      });
    } else {
      set({
        trainingQueue: [
          ...state.trainingQueue,
          {
            type,
            progress: 0,
            total: config.trainTime,
            count: 1,
            populationCost: popCost,
          },
        ],
      });
    }
    return true;
  },

  processTraining: (delta) => {
    const state = get();
    if (state.trainingQueue.length === 0) return [];

    const completed: Warrior[] = [];
    const newQueue: TrainingQueue[] = [];
    const efficiency = state.recruitEfficiency;
    const trainSpeedTechBonus = calculateTechBonus(state.technologies, 'train_speed');
    const trainSpeedTotemBonus = state.getTotemBonus('train_speed');
    const trainSpeedGovBonus = state.getGovernmentBonus('train_speed');
    const weatherEffects = state.getWeatherEffects();
    const weatherTrainBonus = weatherEffects.trainingSpeedModifier;
    const scaledDelta = delta * efficiency * (1 + trainSpeedTechBonus + trainSpeedTotemBonus + weatherTrainBonus + trainSpeedGovBonus);

    for (const queue of state.trainingQueue) {
      let newProgress = queue.progress + scaledDelta;
      let newCount = queue.count;

      while (newProgress >= queue.total && newCount > 0) {
        newProgress -= queue.total;
        newCount--;
        const config = WARRIORS[queue.type];
        completed.push({
          id: generateId(),
          type: queue.type,
          hp: config.hp,
          maxHp: config.hp,
          attack: config.attack,
          defense: config.defense,
          level: 1,
          exp: 0,
          position: config.preferredPosition,
          morale: 70,
        });
      }

      if (newCount > 0) {
        newQueue.push({ ...queue, progress: newProgress, count: newCount });
      }
    }

    if (completed.length > 0) {
      set({
        warriors: [...state.warriors, ...completed],
        trainingQueue: newQueue,
      });
      for (const w of completed) {
        state.updateTaskProgress('train_warriors', 1, w.type);
      }
    } else {
      set({ trainingQueue: newQueue });
    }

    return completed;
  },

  retireWarrior: (warriorId) => {
    const state = get();
    const warrior = state.warriors.find((w) => w.id === warriorId);
    if (!warrior) {
      return { success: false, message: '战士不存在' };
    }
    if (state.nightRaid.garrisonWarriors.includes(warriorId)) {
      return { success: false, message: '该战士正在驻守，无法退役' };
    }
    if (state.activeExpedition) {
      const inExpedition = state.activeExpedition.warriors.some((w) => w.id === warriorId);
      if (inExpedition) {
        return { success: false, message: '该战士正在远征，无法退役' };
      }
    }
    for (const caravan of state.caravans) {
      if (caravan.warriorIds.includes(warriorId)) {
        return { success: false, message: '该战士正在护送商队，无法退役' };
      }
    }

    const config = WARRIORS[warrior.type];
    const refundFood = Math.floor((config.cost.food || 0) * RETIRE_FOOD_REFUND_RATIO);
    if (refundFood > 0) {
      state.addResources({ food: refundFood });
    }

    const newWarriors = state.warriors.filter((w) => w.id !== warriorId);
    const newLoyalty = Math.max(0, state.loyalty - RETIRE_LOYALTY_PENALTY);

    set({
      warriors: newWarriors,
      loyalty: newLoyalty,
      recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
    });

    return {
      success: true,
      message: `${config.name}已退役，返还${refundFood}食物`,
    };
  },

  getMilitaryPopulation: () => {
    return calculateMilitaryPopulation(get().warriors);
  },

  getTrainingPopulation: () => {
    return calculateTrainingPopulation(get().trainingQueue);
  },

  getAvailablePopulation: () => {
    const state = get();
    const militaryPop = calculateMilitaryPopulation(state.warriors);
    const trainingPop = calculateTrainingPopulation(state.trainingQueue);
    return Math.max(0, state.population - militaryPop - trainingPop);
  },

  getArmyFoodConsumption: () => {
    return calculateArmyFoodConsumption(get().warriors);
  },

  startInvasion: () => {
    const state = get();
    if (state.invasion?.isActive) return;

    const wave = Math.floor(state.day / 2) + 1;
    const invader = generateInvasion(wave, state.factions);
    const weatherEffects = state.getWeatherEffects();
    const invasionMod = Math.max(-0.5, weatherEffects.invasionModifier);
    const statMultiplier = 1 + invasionMod;

    const enemies: Enemy[] = [];
    const enemyConfig = ENEMIES[invader.type];

    for (let i = 0; i < invader.count; i++) {
      const position: PositionRow = i === 0 ? 'front' : i < Math.ceil(invader.count * 0.6) ? 'middle' : 'back';
      enemies.push({
        id: generateId(),
        type: invader.type as any,
        hp: Math.floor(invader.hp * statMultiplier),
        maxHp: Math.floor(invader.maxHp * statMultiplier),
        attack: Math.floor(invader.attack * statMultiplier),
        defense: Math.floor(invader.defense * statMultiplier),
        position: enemyConfig?.preferredPosition || position,
        morale: 60 + Math.floor(Math.random() * 30),
      });
    }

    const scaledRewards: Partial<Resources> = {};
    for (const [key, amount] of Object.entries(invader.reward)) {
      scaledRewards[key as keyof Resources] = Math.floor((amount as number) * statMultiplier);
    }

    const armyMorale = state.warriors.length > 0
      ? Math.floor(state.warriors.reduce((s, w) => s + w.morale, 0) / state.warriors.length)
      : 50;

    const invasion: Invasion = {
      id: generateId(),
      wave,
      enemies,
      isActive: true,
      countdown: 30,
      rewards: scaledRewards,
      result: 'pending',
      armyMorale,
      enemyMorale: 65,
    };

    set({ invasion });
  },

  fightBattle: () => {
    const state = get();
    const invasion = state.invasion;
    if (!invasion) return { result: 'defeat' as const, log: ['无入侵战斗'], battleLog: [], battleSummary: null as any };

    const battleLogEntries: BattleLogEntry[] = [];
    const stringLog: string[] = [];
    const generateLogId = () => `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const addLog = (entry: Omit<BattleLogEntry, 'id'>) => {
      const full: BattleLogEntry = { ...entry, id: generateLogId() };
      battleLogEntries.push(full);
      stringLog.push(full.message);
    };

    let myWarriors = state.warriors.map((w) => ({ ...w }));
    let enemies = invasion.enemies.map((e) => ({ ...e }));

    for (const reinforcement of state.allyReinforcements) {
      for (const unit of reinforcement.warriors) {
        for (let i = 0; i < unit.count; i++) {
          const config = WARRIORS[unit.type];
          myWarriors.push({
            id: generateId(),
            type: unit.type,
            hp: unit.hp,
            maxHp: unit.hp,
            attack: unit.attack,
            defense: unit.defense,
            level: 1,
            exp: 0,
            position: config?.preferredPosition || 'middle',
            morale: 70,
          });
        }
      }
      addLog({
        type: 'system',
        round: 0,
        actor: reinforcement.factionName,
        actorIcon: reinforcement.factionIcon,
        message: `🤝 ${reinforcement.factionIcon} ${reinforcement.factionName}的援军加入战斗！`,
      });
    }

    const wallTechBonus = calculateTechBonus(state.technologies, 'wall_defense');
    const wallTotemBonus = state.getTotemBonus('wall_defense');
    const baseWallDefense = calculateWallDefense(state.buildings, state.technologies);
    const wallDefense = Math.floor(baseWallDefense * (1 + wallTotemBonus) / (1 + wallTechBonus) * (1 + wallTechBonus + wallTotemBonus));
    const loyaltyBonus = Math.floor(state.loyalty / 20);

    myWarriors = myWarriors.map((w) => {
      const config = WARRIORS[w.type];
      const atkTechBonus = calculateTechBonus(state.technologies, 'attack_boost', w.type) +
        calculateTechBonus(state.technologies, 'attack_boost');
      const defTechBonus = calculateTechBonus(state.technologies, 'defense_boost', w.type) +
        calculateTechBonus(state.technologies, 'defense_boost');
      const hpTechBonus = calculateTechBonus(state.technologies, 'hp_boost', w.type) +
        calculateTechBonus(state.technologies, 'hp_boost');
      const atkTotemBonus = state.getTotemBonus('attack_boost', w.type) +
        state.getTotemBonus('attack_boost');
      const defTotemBonus = state.getTotemBonus('defense_boost', w.type) +
        state.getTotemBonus('defense_boost');
      const hpTotemBonus = state.getTotemBonus('hp_boost', w.type) +
        state.getTotemBonus('hp_boost');
      const atkGovBonus = state.getGovernmentBonus('attack_boost', w.type) +
        state.getGovernmentBonus('attack_boost');
      const defGovBonus = state.getGovernmentBonus('defense_boost', w.type) +
        state.getGovernmentBonus('defense_boost');
      const hpGovBonus = state.getGovernmentBonus('hp_boost', w.type) +
        state.getGovernmentBonus('hp_boost');
      const atkBonus = atkTechBonus + atkTotemBonus + atkGovBonus;
      const defBonus = defTechBonus + defTotemBonus + defGovBonus;
      const hpBonus = hpTechBonus + hpTotemBonus + hpGovBonus;

      return {
        ...w,
        attack: Math.floor(w.attack * (1 + atkBonus)),
        defense: Math.floor(w.defense * (1 + defBonus)),
        maxHp: Math.floor(w.maxHp * (1 + hpBonus)),
        hp: Math.floor(w.hp * (1 + hpBonus)),
        morale: w.morale + (config?.moraleBonus || 0),
      };
    });

    let armyMorale = invasion.armyMorale;
    let enemyMorale = invasion.enemyMorale;

    addLog({
      type: 'system',
      round: 0,
      actor: '系统',
      actorIcon: '📜',
      message: `⚔️ 第 ${invasion.wave} 波入侵开始！敌军：${enemies.map((e) => `${ENEMIES[e.type].icon}${ENEMIES[e.type].name}`).join('、')}`,
    });
    addLog({
      type: 'system',
      round: 0,
      actor: '系统',
      actorIcon: '🛡️',
      message: `城防加成 +${wallDefense} | 忠诚加成 +${loyaltyBonus} | 我军士气 ${armyMorale} | 敌军士气 ${enemyMorale}`,
    });

    const summary: BattleSummary = {
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      totalHealing: 0,
      killsByUnit: {},
      highestDamage: { name: '', value: 0 },
      mostKills: { name: '', value: 0 },
      moraleChanges: 0,
      countersTriggered: 0,
      criticalHits: 0,
    };
    const unitKillCounts: Record<string, { name: string; count: number }> = {};
    const unitDamageCounts: Record<string, { name: string; damage: number }> = {};

    const getUnitsByPosition = <T extends { position: PositionRow }>(units: T[], pos: PositionRow) =>
      units.filter((u) => u.position === pos);

    const findTarget = <T extends { position: PositionRow; hp: number }>(units: T[]): T | null => {
      const order: PositionRow[] = ['front', 'middle', 'back'];
      for (const pos of order) {
        const candidates = getUnitsByPosition(units, pos).filter((u) => u.hp > 0);
        if (candidates.length > 0) {
          return candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
      return null;
    };

    const getMoraleMultiplier = (morale: number) => {
      if (morale >= 90) return 1.25;
      if (morale >= 70) return 1.1;
      if (morale >= 50) return 1.0;
      if (morale >= 30) return 0.85;
      return 0.65;
    };

    let round = 0;
    while (myWarriors.some((w) => w.hp > 0) && enemies.some((e) => e.hp > 0) && round < 25) {
      round++;
      addLog({
        type: 'round',
        round,
        actor: '系统',
        actorIcon: '⏳',
        message: `━━━ 回合 ${round} ━━━`,
      });

      const positionOrder: PositionRow[] = ['back', 'middle', 'front'];
      for (const pos of positionOrder) {
        const warriorsAtPos = getUnitsByPosition(myWarriors, pos).filter((w) => w.hp > 0);
        for (const warrior of warriorsAtPos) {
          if (!enemies.some((e) => e.hp > 0)) break;
          const wConfig = WARRIORS[warrior.type];

          if (wConfig?.healPower && wConfig.healPower > 0) {
            const injuredAllies = myWarriors.filter(
              (w) => w.hp > 0 && w.hp < w.maxHp && w.id !== warrior.id
            );
            if (injuredAllies.length > 0 && Math.random() < 0.6) {
              injuredAllies.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
              const healTarget = injuredAllies[0];
              const baseHeal = wConfig.healPower + Math.floor(warrior.attack * 0.3);
              const moraleHealBonus = getMoraleMultiplier(armyMorale);
              const healAmount = Math.floor(baseHeal * moraleHealBonus * (0.9 + Math.random() * 0.2));
              const actualHeal = Math.min(healAmount, healTarget.maxHp - healTarget.hp);
              healTarget.hp += actualHeal;
              summary.totalHealing += actualHeal;

              addLog({
                type: 'heal',
                round,
                actor: wConfig.name,
                actorIcon: wConfig.icon,
                target: WARRIORS[healTarget.type].name,
                targetIcon: WARRIORS[healTarget.type].icon,
                value: actualHeal,
                message: `💚 ${wConfig.icon}${wConfig.name} 治疗了 ${WARRIORS[healTarget.type].icon}${WARRIORS[healTarget.type].name}，恢复 ${actualHeal} 生命`,
              });
              continue;
            }
          }

          const target = findTarget(enemies);
          if (!target) continue;

          const eConfig = ENEMIES[target.type];
          const counterBonus = getCounterBonus(wConfig.unitClass, eConfig.unitClass);
          const berserkerBonus = warrior.type === 'berserker' ? (1 - warrior.hp / warrior.maxHp) * 0.6 : 0;
          const moraleAtk = getMoraleMultiplier(armyMorale);
          const positionDefPenalty = target.position === 'back' ? 0.85 : target.position === 'middle' ? 0.95 : 1;
          const isCritical = Math.random() < 0.1 + counterBonus * 0.3;
          const critMultiplier = isCritical ? 1.6 : 1;
          if (isCritical) summary.criticalHits++;

          const baseDamage = warrior.attack * (1 + berserkerBonus) * moraleAtk * critMultiplier * positionDefPenalty;
          const damageBeforeCounter = Math.max(1, baseDamage - target.defense * 0.5 + loyaltyBonus * 0.5);
          const finalDamage = Math.max(1, Math.floor(damageBeforeCounter * (1 + counterBonus)));
          target.hp -= finalDamage;

          summary.totalDamageDealt += finalDamage;
          const dKey = warrior.id;
          if (!unitDamageCounts[dKey]) unitDamageCounts[dKey] = { name: wConfig.name, damage: 0 };
          unitDamageCounts[dKey].damage += finalDamage;
          if (unitDamageCounts[dKey].damage > summary.highestDamage.value) {
            summary.highestDamage = { name: wConfig.name, value: unitDamageCounts[dKey].damage };
          }

          let extraInfo = '';
          if (counterBonus > 0.1) extraInfo = `（克制！+${Math.floor(counterBonus * 100)}%）`;
          else if (counterBonus < -0.1) extraInfo = `（被克制 ${Math.floor(counterBonus * 100)}%）`;
          if (isCritical) extraInfo += ' 💥暴击！';

          addLog({
            type: isCritical ? 'critical' : counterBonus > 0.1 ? 'crush' : 'attack',
            round,
            actor: wConfig.name,
            actorIcon: wConfig.icon,
            target: eConfig.name,
            targetIcon: eConfig.icon,
            value: finalDamage,
            extra: extraInfo.trim(),
            message: `${wConfig.icon}${wConfig.name} ➜ ${eConfig.icon}${eConfig.name} 造成 ${finalDamage} 伤害${extraInfo}`,
          });

          if (target.hp <= 0) {
            const eName = eConfig.name;
            target.hp = 0;
            armyMorale = Math.min(100, armyMorale + 3);
            summary.moraleChanges += 3;

            const kKey = warrior.type;
            summary.killsByUnit[kKey] = (summary.killsByUnit[kKey] || 0) + 1;
            if (!unitKillCounts[kKey]) unitKillCounts[kKey] = { name: wConfig.name, count: 0 };
            unitKillCounts[kKey].count++;
            if (unitKillCounts[kKey].count > summary.mostKills.value) {
              summary.mostKills = { name: wConfig.name, value: unitKillCounts[kKey].count };
            }

            addLog({
              type: 'kill',
              round,
              actor: wConfig.name,
              actorIcon: wConfig.icon,
              target: eName,
              targetIcon: eConfig.icon,
              message: `💀 ${wConfig.icon}${wConfig.name} 击杀了 ${eConfig.icon}${eName}！全军士气 +3`,
            });

            if (wConfig.counterRate && Math.random() < wConfig.counterRate * 0.3) {
              const nextTarget = findTarget(enemies);
              if (nextTarget) {
                const counterDmg = Math.floor(finalDamage * 0.3);
                nextTarget.hp -= counterDmg;
                summary.totalDamageDealt += counterDmg;
                summary.countersTriggered++;
                addLog({
                  type: 'counter_attack',
                  round,
                  actor: wConfig.name,
                  actorIcon: wConfig.icon,
                  target: ENEMIES[nextTarget.type].name,
                  targetIcon: ENEMIES[nextTarget.type].icon,
                  value: counterDmg,
                  message: `⚡ 连杀！${wConfig.icon}${wConfig.name} 追击 ${ENEMIES[nextTarget.type].icon}${ENEMIES[nextTarget.type].name}，追加 ${counterDmg} 伤害`,
                });
              }
            }
          }
        }
      }

      myWarriors = myWarriors.filter((w) => w.hp > 0);
      enemies = enemies.filter((e) => e.hp > 0);

      for (const pos of positionOrder) {
        const enemiesAtPos = getUnitsByPosition(enemies, pos).filter((e) => e.hp > 0);
        for (const enemy of enemiesAtPos) {
          if (!myWarriors.some((w) => w.hp > 0)) break;
          const eConfig = ENEMIES[enemy.type];

          const target = findTarget(myWarriors);
          if (!target) continue;

          const wConfig = WARRIORS[target.type];
          const counterBonus = getCounterBonus(eConfig.unitClass, wConfig.unitClass);
          const moraleAtk = getMoraleMultiplier(enemyMorale);
          const positionDefPenalty = target.position === 'front' ? 1 : target.position === 'middle' ? 1.1 : 1.25;
          const wallProtection = target.position === 'front' ? wallDefense * 0.1 : target.position === 'middle' ? wallDefense * 0.05 : 0;

          const baseDamage = enemy.attack * moraleAtk * positionDefPenalty;
          const damageBeforeCounter = Math.max(1, baseDamage - target.defense * 0.5 - wallProtection);
          const finalDamage = Math.max(1, Math.floor(damageBeforeCounter * (1 + counterBonus)));
          target.hp -= finalDamage;

          summary.totalDamageTaken += finalDamage;

          let extraInfo = '';
          if (counterBonus > 0.1) extraInfo = `（克制！+${Math.floor(counterBonus * 100)}%）`;
          else if (counterBonus < -0.1) extraInfo = `（被克制 ${Math.floor(counterBonus * 100)}%）`;

          addLog({
            type: counterBonus > 0.1 ? 'crush' : 'attack',
            round,
            actor: eConfig.name,
            actorIcon: eConfig.icon,
            target: wConfig.name,
            targetIcon: wConfig.icon,
            value: finalDamage,
            extra: extraInfo.trim(),
            message: `🗡️ ${eConfig.icon}${eConfig.name} ➜ ${wConfig.icon}${wConfig.name} 造成 ${finalDamage} 伤害${extraInfo}`,
          });

          if (target.hp <= 0) {
            target.hp = 0;
            enemyMorale = Math.min(100, enemyMorale + 2);
            armyMorale = Math.max(0, armyMorale - 5);
            summary.moraleChanges -= 3;

            addLog({
              type: 'death',
              round,
              actor: eConfig.name,
              actorIcon: eConfig.icon,
              target: wConfig.name,
              targetIcon: wConfig.icon,
              message: `☠️ ${wConfig.icon}${wConfig.name} 阵亡！士气 -5`,
            });
          }
        }
      }

      myWarriors = myWarriors.filter((w) => w.hp > 0);
      enemies = enemies.filter((e) => e.hp > 0);

      if (round > 2 && round % 3 === 0) {
        const armyRatio = myWarriors.length / Math.max(1, state.warriors.length);
        const enemyRatio = enemies.length / Math.max(1, invasion.enemies.length);
        if (armyRatio < 0.5) {
          armyMorale = Math.max(0, armyMorale - 2);
          summary.moraleChanges -= 2;
          addLog({
            type: 'morale',
            round,
            actor: '我军',
            actorIcon: '📉',
            message: `😟 我军伤亡过半，士气下滑至 ${armyMorale}`,
          });
        }
        if (enemyRatio < 0.5) {
          enemyMorale = Math.max(0, enemyMorale - 3);
          summary.moraleChanges += 3;
          addLog({
            type: 'morale',
            round,
            actor: '敌军',
            actorIcon: '📈',
            message: `😎 敌军损失惨重，士气下降至 ${enemyMorale}`,
          });
        }
      }
    }

    const victory = enemies.length === 0 && myWarriors.length > 0;
    const endMsg = victory
      ? `🏆 胜利！部落成功抵御入侵！用时 ${round} 回合`
      : `💔 失败...部落遭受重创。回合 ${round}`;
    addLog({
      type: 'system',
      round,
      actor: '系统',
      actorIcon: victory ? '🏆' : '💔',
      message: endMsg,
    });

    const newLoyalty = Math.min(100, state.loyalty + (victory ? 5 : -8));
    const newPopulation = Math.max(0, state.population + (victory ? 0 : -1));

    if (victory) {
      state.addResources(invasion.rewards);
      const rewardStr = Object.entries(invasion.rewards)
        .map(([k, v]) => `${(state.resources as any)[k]?.icon || '📦'}${k}+${v}`)
        .join(', ');
      addLog({
        type: 'system',
        round,
        actor: '战利品',
        actorIcon: '🎁',
        message: `🎁 获得奖励：${rewardStr}`,
      });

      const expGain = invasion.wave * 15;
      for (const w of myWarriors) {
        w.exp += expGain;
        w.morale = Math.min(100, w.morale + 10);
      }
    } else {
      for (const w of myWarriors) {
        w.morale = Math.max(20, w.morale - 15);
      }
      addLog({
        type: 'system',
        round,
        actor: '系统',
        actorIcon: '⚠️',
        message: `⚠️ 人口 ${state.population} → ${newPopulation}，忠诚 ${state.loyalty} → ${newLoyalty}`,
      });
    }

    set({
      warriors: myWarriors,
      invasion: {
        ...invasion,
        isActive: false,
        enemies,
        result: victory ? 'victory' : 'defeat',
        battleLog: battleLogEntries,
        battleSummary: summary,
        armyMorale,
        enemyMorale,
      },
      totalWins: state.totalWins + (victory ? 1 : 0),
      totalLosses: state.totalLosses + (victory ? 0 : 1),
      loyalty: newLoyalty,
      population: newPopulation,
      recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
    });

    if (victory) {
      state.updateTaskProgress('win_battles', 1);
    }

    return { result: victory ? 'victory' : 'defeat', log: stringLog, battleLog: battleLogEntries, battleSummary: summary };
  },

  executeTrade: (tradeId) => {
    const state = get();
    const trade = state.trades.find((t) => t.id === tradeId);
    if (!trade || trade.stock <= 0) return false;

    const negotiation = state.currentNegotiation;
    const isNegotiating = negotiation && negotiation.tradeId === tradeId;
    const priceModifier = isNegotiating ? negotiation.currentModifier : 1;
    const fluctuation = state.priceFluctuations[trade.give.resource]?.currentMultiplier || 1;
    const giveAmount = Math.ceil(trade.give.amount * fluctuation * priceModifier);

    if (state.resources[trade.give.resource] < giveAmount) return false;

    state.spendResources({ [trade.give.resource]: giveAmount });
    state.addResources({ [trade.receive.resource]: trade.receive.amount });

    set({
      trades: state.trades.map((t) =>
        t.id === tradeId ? { ...t, stock: t.stock - 1 } : t
      ),
      totalTrades: state.totalTrades + 1,
      currentNegotiation: isNegotiating ? null : state.currentNegotiation,
    });

    for (const faction of Object.values(state.factions)) {
      if (faction.stance === 'friendly' || faction.stance === 'ally') {
        if (Math.random() < 0.2) {
          state.changeFactionReputation(faction.id, 1);
        }
      }
    }

    state.updateTaskProgress('trade_count', 1);

    return true;
  },

  refreshTrades: () => {
    const state = get();
    if (state.resources.gold < 20) return;
    state.spendResources({ gold: 20 });
    const weatherEffects = state.getWeatherEffects();
    set({ 
      trades: generateTrades(6, weatherEffects.tradeModifier, state.factions, state.priceFluctuations, Math.floor(state.day)),
      lastStockRefresh: Date.now(),
    });
  },

  applyEventEffects: (effects) => {
    const state = get();
    let newPopulation = state.population;
    let newLoyalty = state.loyalty;
    const resourceGain: Partial<Resources> = {};

    for (const effect of effects) {
      switch (effect.type) {
        case 'population_change':
          newPopulation += effect.value;
          break;
        case 'loyalty_change':
          newLoyalty += effect.value;
          break;
        case 'food_change':
          resourceGain.food = (resourceGain.food || 0) + effect.value;
          break;
        case 'resource_change':
          if (effect.resource) {
            resourceGain[effect.resource] = (resourceGain[effect.resource] || 0) + effect.value;
          }
          break;
        case 'plague':
          newPopulation = Math.max(0, newPopulation - effect.value);
          break;
        case 'festival':
          newLoyalty = Math.min(100, newLoyalty + effect.value);
          break;
        case 'migration':
          newPopulation += effect.value;
          break;
        case 'recruit_boost':
          break;
      }
    }

    newPopulation = Math.max(0, Math.min(newPopulation, state.maxPopulation));
    newLoyalty = Math.max(0, Math.min(100, newLoyalty));

    if (Object.keys(resourceGain).length > 0) {
      state.addResources(resourceGain);
    }

    set({
      population: newPopulation,
      loyalty: newLoyalty,
      recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
    });
  },

  processPopulationTick: (delta) => {
    const state = get();
    if (state.population <= 0) return;

    const foodConsumptionTechBonus = calculateTechBonus(state.technologies, 'food_consumption');
    const foodConsumptionTotemBonus = state.getTotemBonus('food_consumption');
    const loyaltyDecayBonus = calculateTechBonus(state.technologies, 'loyalty_decay');
    const armyFoodConsumption = calculateArmyFoodConsumption(state.warriors);
    const adjustedConsumptionRate = state.foodConsumptionRate * (1 + foodConsumptionTechBonus + foodConsumptionTotemBonus);
    const adjustedLoyaltyDecay = LOYALTY_DECAY_NO_FOOD * (1 + loyaltyDecayBonus);

    const civilianFood = state.population * adjustedConsumptionRate;
    const militaryFood = armyFoodConsumption * adjustedConsumptionRate;
    const foodConsumed = (civilianFood + militaryFood) * delta;
    let newFood = state.resources.food - foodConsumed;
    let newLoyalty = state.loyalty;
    let newPopulation = state.population;

    if (newFood < 0) {
      newFood = 0;
      newLoyalty -= adjustedLoyaltyDecay * delta;
    } else {
      if (newFood > LOYALTY_FOOD_THRESHOLD) {
        newLoyalty += LOYALTY_RECOVERY_WELL_FED * delta;
      }
    }

    if (newLoyalty < 20 && Math.random() < 0.01 * delta) {
      newPopulation = Math.max(0, newPopulation - 1);
    }

    if (newLoyalty > 50 && newPopulation < state.maxPopulation) {
      const growthChance = POP_GROWTH_RATE * (newLoyalty / 100) * delta;
      if (Math.random() < growthChance) {
        newPopulation = Math.min(state.maxPopulation, newPopulation + 1);
      }
    }

    newLoyalty = Math.max(0, Math.min(100, newLoyalty));

    set({
      resources: { ...state.resources, food: Math.max(0, newFood) },
      loyalty: newLoyalty,
      population: newPopulation,
      recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
    });

    if (newPopulation > state.population) {
      state.updateTaskProgress('reach_population', newPopulation);
    }
    if (newLoyalty > state.loyalty) {
      state.updateTaskProgress('reach_loyalty', newLoyalty);
    }
  },

  processEventTick: (delta) => {
    const state = get();

    const newEvents = state.activeEvents
      .map((e) => ({ ...e, duration: e.duration - delta }))
      .filter((e) => e.duration > 0);

    let cooldown = state.eventCooldown - delta;

    if (cooldown <= 0) {
      const event = triggerRandomEvent(Math.floor(state.day), state.loyalty, state.population);
      if (event) {
        const activeEvent: ActiveTribeEvent = {
          id: generateId(),
          eventId: event.id,
          name: event.name,
          icon: event.icon,
          description: event.description,
          effects: event.effects,
          appliedAt: Date.now(),
          duration: 30,
        };
        newEvents.push(activeEvent);
        state.applyEventEffects(event.effects);
      }
      cooldown = EVENT_INTERVAL_MIN + Math.random() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN);
    }

    set({
      activeEvents: newEvents,
      eventCooldown: cooldown,
      recruitEfficiency: calculateRecruitEfficiency(state.loyalty, newEvents),
    });
  },

  dismissEvent: (eventId) => {
    const state = get();
    set({
      activeEvents: state.activeEvents.filter((e) => e.id !== eventId),
    });
  },

  startExpedition: (mapId, warriorIds) => {
    const state = get();
    if (state.activeExpedition) return false;

    const mapConfig = getExpeditionMap(mapId);
    if (!mapConfig) return false;
    if (warriorIds.length < mapConfig.requiredWarriors) return false;

    const selectedWarriors = warriorIds
      .map((id) => state.warriors.find((w) => w.id === id))
      .filter((w): w is Warrior => !!w);

    if (selectedWarriors.length < mapConfig.requiredWarriors) return false;

    const expeditionWarriors: ExpeditionWarrior[] = selectedWarriors.map((w) => ({
      id: w.id,
      type: w.type,
      hp: w.hp,
      maxHp: w.maxHp,
      attack: w.attack,
      defense: w.defense,
      level: w.level,
      exp: w.exp,
      originalHp: w.hp,
    }));

    const remainingWarriors = state.warriors.filter(
      (w) => !warriorIds.includes(w.id)
    );

    const expedition: Expedition = {
      id: generateId(),
      mapId,
      mapName: mapConfig.name,
      mapIcon: mapConfig.icon,
      status: 'marching',
      warriors: expeditionWarriors,
      currentNodeIndex: 0,
      nodes: mapConfig.nodes,
      progress: 0,
      currentNodeProgress: 0,
      results: [],
      totalLoot: {},
      totalExp: 0,
      totalCasualties: 0,
      pendingEvent: null,
      returningProgress: 0,
      startedAt: Date.now(),
    };

    const notification: ExpeditionNotification = {
      id: generateId(),
      type: 'info',
      icon: mapConfig.icon,
      message: `远征队出发前往${mapConfig.name}！`,
      timestamp: Date.now(),
      duration: 5,
    };

    set({
      warriors: remainingWarriors,
      activeExpedition: expedition,
      expeditionNotifications: [...state.expeditionNotifications, notification],
    });

    return true;
  },

  resolveExpeditionEvent: (choice) => {
    const state = get();
    const expedition = state.activeExpedition;
    if (!expedition || expedition.status !== 'event' || !expedition.pendingEvent) return;

    const node = expedition.pendingEvent;
    const log: string[] = [];
    let victory = false;
    let loot: Partial<Resources> = {};
    let casualties = 0;
    const baseExpGain = EXP_GAIN[node.difficulty] || 10;
    const expTechBonus = calculateTechBonus(state.technologies, 'exp_bonus');
    const expTotemBonus = state.getTotemBonus('exp_bonus');
    const expGain = Math.floor(baseExpGain * (1 + expTechBonus + expTotemBonus));
    let warriors = expedition.warriors.map((w) => ({ ...w }));

    warriors = warriors.map((w) => {
      const atkTechBonus = calculateTechBonus(state.technologies, 'attack_boost', w.type) +
        calculateTechBonus(state.technologies, 'attack_boost');
      const defTechBonus = calculateTechBonus(state.technologies, 'defense_boost', w.type) +
        calculateTechBonus(state.technologies, 'defense_boost');
      const hpTechBonus = calculateTechBonus(state.technologies, 'hp_boost', w.type) +
        calculateTechBonus(state.technologies, 'hp_boost');
      const atkTotemBonus = state.getTotemBonus('attack_boost', w.type) +
        state.getTotemBonus('attack_boost');
      const defTotemBonus = state.getTotemBonus('defense_boost', w.type) +
        state.getTotemBonus('defense_boost');
      const hpTotemBonus = state.getTotemBonus('hp_boost', w.type) +
        state.getTotemBonus('hp_boost');
      const atkBonus = atkTechBonus + atkTotemBonus;
      const defBonus = defTechBonus + defTotemBonus;
      const hpBonus = hpTechBonus + hpTotemBonus;

      return {
        ...w,
        attack: Math.floor(w.attack * (1 + atkBonus)),
        defense: Math.floor(w.defense * (1 + defBonus)),
        maxHp: Math.floor(w.maxHp * (1 + hpBonus)),
        hp: Math.min(Math.floor(w.hp * (1 + hpBonus)), Math.floor(w.maxHp * (1 + hpBonus))),
      };
    });

    log.push(`📍 ${node.name} - ${node.description}`);

    switch (choice) {
      case 'fight': {
        log.push(`⚔️ 远征队选择战斗！`);
        const enemyConfig = node.enemyType ? ENEMIES[node.enemyType] : null;
        const enemyCount = node.enemyCount || 1;

        if (!enemyConfig) {
          victory = true;
          loot = rollLoot('combat', node.difficulty);
          log.push(`敌人已被击退！`);
        } else {
          const difficultyScale = node.difficulty === 'epic' ? 1.5 : node.difficulty === 'hard' ? 1.3 : node.difficulty === 'normal' ? 1.1 : 1.0;

          let enemies: { hp: number; maxHp: number; attack: number; defense: number; name: string }[] = [];
          for (let i = 0; i < enemyCount; i++) {
            enemies.push({
              hp: Math.floor(enemyConfig.hp * difficultyScale),
              maxHp: Math.floor(enemyConfig.hp * difficultyScale),
              attack: Math.floor(enemyConfig.attack * difficultyScale),
              defense: Math.floor(enemyConfig.defense * difficultyScale),
              name: enemyConfig.name,
            });
          }

          log.push(`遭遇 ${enemyCount}x ${enemyConfig.name}！`);

          let round = 0;
          while (warriors.length > 0 && enemies.length > 0 && round < 15) {
            round++;
            for (const warrior of warriors) {
              if (enemies.length === 0) break;
              const target = enemies[0];
              const damage = Math.max(1, warrior.attack - target.defense / 2);
              target.hp -= damage;
              if (target.hp <= 0) {
                enemies.shift();
                log.push(`${WARRIORS[warrior.type].name} 击败了 ${enemyConfig.name}！`);
              }
            }

            for (const enemy of enemies) {
              if (warriors.length === 0) break;
              const target = warriors[Math.floor(Math.random() * warriors.length)];
              const damage = Math.max(1, enemy.attack - target.defense / 2);
              target.hp -= damage;
              if (target.hp <= 0) {
                warriors = warriors.filter((w) => w.id !== target.id);
                casualties++;
                log.push(`☠️ ${WARRIORS[target.type].name} 阵亡！`);
              }
            }
          }

          victory = enemies.length === 0 && warriors.length > 0;

          if (victory) {
            loot = rollLoot(node.type === 'boss' ? 'combat' : node.type, node.difficulty);
            log.push(`🏆 战斗胜利！`);
          } else {
            log.push(`💔 战斗失败...`);
          }
        }
        break;
      }

      case 'flee': {
        const fleeChance = node.type === 'ambush' ? 0.3 : node.type === 'trap' ? 0.5 : 0.7;
        if (Math.random() < fleeChance) {
          victory = true;
          log.push(`🏃 成功撤退！`);
        } else {
          const damagePercent = node.type === 'trap' ? 0.3 : 0.15;
          warriors = warriors.map((w) => ({
            ...w,
            hp: Math.max(1, w.hp - w.maxHp * damagePercent),
          }));
          const dead = warriors.filter((w) => w.hp <= 0);
          casualties += dead.length;
          warriors = warriors.filter((w) => w.hp > 0);
          log.push(`🏃 撤退失败！受到${dead.length}人伤亡`);
        }
        break;
      }

      case 'negotiate': {
        const successChance = 0.5;
        if (Math.random() < successChance) {
          victory = true;
          loot = rollLoot('treasure', node.difficulty);
          log.push(`🤝 谈判成功！获得额外奖励`);
        } else {
          victory = false;
          log.push(`🤝 谈判破裂！`);
          const damagePercent = 0.1;
          warriors = warriors.map((w) => ({
            ...w,
            hp: Math.max(1, w.hp - w.maxHp * damagePercent),
          }));
          const dead = warriors.filter((w) => w.hp <= 0);
          casualties += dead.length;
          warriors = warriors.filter((w) => w.hp > 0);
        }
        break;
      }

      case 'explore': {
        const trapChance = node.type === 'trap' ? 0.6 : node.type === 'treasure' ? 0.15 : 0.3;
        if (Math.random() < trapChance) {
          victory = false;
          const damagePercent = node.type === 'trap' ? 0.25 : 0.1;
          warriors = warriors.map((w) => ({
            ...w,
            hp: Math.max(1, w.hp - w.maxHp * damagePercent),
          }));
          const dead = warriors.filter((w) => w.hp <= 0);
          casualties += dead.length;
          warriors = warriors.filter((w) => w.hp > 0);
          log.push(`⚠️ 探索触发陷阱！${dead.length}人伤亡`);
        } else {
          victory = true;
          loot = rollLoot('treasure', node.difficulty);
          log.push(`🔍 探索成功！发现宝藏！`);
        }
        break;
      }

      case 'pray': {
        victory = true;
        const healPercent = 0.3;
        warriors = warriors.map((w) => ({
          ...w,
          hp: Math.min(w.maxHp, w.hp + w.maxHp * healPercent),
        }));
        loot = rollLoot('shrine', node.difficulty);
        log.push(`🙏 祈祷生效！战士恢复30%生命值`);
        break;
      }

      case 'rest': {
        victory = true;
        const restHealPercent = 0.4;
        warriors = warriors.map((w) => ({
          ...w,
          hp: Math.min(w.maxHp, w.hp + w.maxHp * restHealPercent),
        }));
        log.push(`💤 休息成功！战士恢复40%生命值`);
        break;
      }
    }

    if (warriors.length === 0) {
      victory = false;
      log.push(`💀 远征队全军覆没...`);
    }

    const lootTechBonus = calculateTechBonus(state.technologies, 'loot_bonus');
    const lootTotemBonus = state.getTotemBonus('loot_bonus');
    const adjustedLoot: Partial<Resources> = {};
    for (const [key, amount] of Object.entries(loot)) {
      adjustedLoot[key as keyof Resources] = Math.floor((amount as number) * (1 + lootTechBonus + lootTotemBonus));
    }

    const newTotalLoot: Partial<Resources> = { ...expedition.totalLoot };
    for (const [key, amount] of Object.entries(adjustedLoot)) {
      newTotalLoot[key as keyof Resources] = (newTotalLoot[key as keyof Resources] || 0) + (amount as number);
    }

    const result: ExpeditionResult = {
      nodeId: node.id,
      nodeName: node.name,
      type: node.type,
      victory,
      loot: adjustedLoot,
      casualties,
      log,
    };

    const isLastNode = expedition.currentNodeIndex >= expedition.nodes.length - 1;
    const newStatus = warriors.length === 0
      ? 'returning'
      : isLastNode && victory
        ? 'returning'
        : 'marching';

    const notifType = victory ? 'success' : 'danger';
    const notification: ExpeditionNotification = {
      id: generateId(),
      type: notifType,
      icon: victory ? '🏆' : '💀',
      message: victory
        ? `${node.name} — 胜利！${casualties > 0 ? `伤亡${casualties}人` : ''}`
        : `${node.name} — 失败...伤亡${casualties}人`,
      timestamp: Date.now(),
      duration: 5,
    };

    set({
      activeExpedition: {
        ...expedition,
        status: newStatus,
        warriors,
        pendingEvent: null,
        currentNodeIndex: newStatus === 'marching' ? expedition.currentNodeIndex + 1 : expedition.currentNodeIndex,
        currentNodeProgress: 0,
        results: [...expedition.results, result],
        totalLoot: newTotalLoot,
        totalExp: expedition.totalExp + (victory ? expGain : 0),
        totalCasualties: expedition.totalCasualties + casualties,
        returningProgress: newStatus === 'returning' ? 0 : 0,
      },
      expeditionNotifications: [...state.expeditionNotifications, notification],
    });
  },

  processExpeditionTick: (delta) => {
    const state = get();
    const expedition = state.activeExpedition;
    if (!expedition) return;

    if (expedition.status === 'marching') {
      const currentNode = expedition.nodes[expedition.currentNodeIndex];
      if (!currentNode) {
        set({
          activeExpedition: { ...expedition, status: 'returning', returningProgress: 0 },
        });
        return;
      }

      const marchTime = NODE_MARCH_TIME[currentNode.difficulty] || 10;
      const newProgress = expedition.currentNodeProgress + delta;
      const progressPercent = Math.min(1, newProgress / marchTime);

      if (newProgress >= marchTime) {
        if (currentNode.type === 'start') {
          set({
            activeExpedition: {
              ...expedition,
              currentNodeIndex: expedition.currentNodeIndex + 1,
              currentNodeProgress: 0,
            },
          });
        } else {
          set({
            activeExpedition: {
              ...expedition,
              status: 'event',
              pendingEvent: currentNode,
              currentNodeProgress: marchTime,
              progress: progressPercent,
            },
          });
        }
      } else {
        set({
          activeExpedition: {
            ...expedition,
            currentNodeProgress: newProgress,
            progress: progressPercent,
          },
        });
      }
    } else if (expedition.status === 'returning') {
      const returnTime = 15;
      const newReturnProgress = expedition.returningProgress + delta;

      if (newReturnProgress >= returnTime) {
        set({
          activeExpedition: { ...expedition, status: 'completed' },
        });
      } else {
        set({
          activeExpedition: {
            ...expedition,
            returningProgress: newReturnProgress,
          },
        });
      }
    }

    const notifs = state.expeditionNotifications
      .map((n) => ({ ...n, duration: n.duration - delta }))
      .filter((n) => n.duration > 0);
    set({ expeditionNotifications: notifs });
  },

  settleExpedition: () => {
    const state = get();
    const expedition = state.activeExpedition;
    if (!expedition || expedition.status !== 'completed') return;

    const returningWarriors = expedition.warriors.map((ew) => {
      const config = WARRIORS[ew.type];
      return {
        id: ew.id,
        type: ew.type,
        hp: Math.floor(ew.hp),
        maxHp: ew.maxHp,
        attack: ew.attack,
        defense: ew.defense,
        level: ew.level,
        exp: ew.exp,
        position: config?.preferredPosition || 'middle',
        morale: 70,
      };
    });

    const survivedCount = expedition.warriors.filter((w) => w.hp > 0).length;
    const totalCount = expedition.warriors.length + expedition.totalCasualties;
    const isVictory = survivedCount > 0 && expedition.results.some((r) => r.victory);

    state.addResources(expedition.totalLoot);

    const mapConfig = getExpeditionMap(expedition.mapId);
    if (mapConfig?.bonusLoot && isVictory) {
      state.addResources(mapConfig.bonusLoot);
    }

    const notification: ExpeditionNotification = {
      id: generateId(),
      type: isVictory ? 'success' : 'warning',
      icon: isVictory ? '🏠' : '⚔️',
      message: isVictory
        ? `远征队凯旋！${survivedCount}/${totalCount}人生还`
        : `远征队惨败归营...仅${survivedCount}人生还`,
      timestamp: Date.now(),
      duration: 8,
    };

    set({
      warriors: [...state.warriors, ...returningWarriors],
      activeExpedition: null,
      totalExpeditions: state.totalExpeditions + 1,
      expeditionWins: state.expeditionWins + (isVictory ? 1 : 0),
      loyalty: Math.min(100, state.loyalty + (isVictory ? 3 : -5)),
      expeditionNotifications: [...state.expeditionNotifications, notification],
    });

    if (isVictory) {
      state.updateTaskProgress('expedition_complete', 1);
    }
  },

  cancelExpedition: () => {
    const state = get();
    const expedition = state.activeExpedition;
    if (!expedition) return;

    const returningWarriors = expedition.warriors.map((ew) => {
      const config = WARRIORS[ew.type];
      return {
        id: ew.id,
        type: ew.type,
        hp: Math.floor(ew.hp),
        maxHp: ew.maxHp,
        attack: ew.attack,
        defense: ew.defense,
        level: ew.level,
        exp: ew.exp,
        position: config?.preferredPosition || 'middle',
        morale: 70,
      };
    });

    const notification: ExpeditionNotification = {
      id: generateId(),
      type: 'warning',
      icon: '⚠️',
      message: '远征被取消，战士返回营地',
      timestamp: Date.now(),
      duration: 5,
    };

    set({
      warriors: [...state.warriors, ...returningWarriors],
      activeExpedition: null,
      expeditionNotifications: [...state.expeditionNotifications, notification],
    });
  },

  dismissExpeditionNotification: (id) => {
    const state = get();
    set({
      expeditionNotifications: state.expeditionNotifications.filter((n) => n.id !== id),
    });
  },

  canResearch: (techId) => {
    const state = get();
    const config = TECHNOLOGIES[techId];
    if (!config) return false;
    if (state.activeResearch) return false;
    if (state.technologies.some((t) => t.techId === techId && t.completed)) return false;
    if (state.technologies.some((t) => t.techId === techId && t.isResearching)) return false;
    if (!state.canAfford(config.cost)) return false;
    return checkTechRequirements(techId, state.buildings, state.technologies);
  },

  startResearch: (techId) => {
    const state = get();
    if (!state.canResearch(techId)) return false;

    const config = TECHNOLOGIES[techId];
    if (!state.spendResources(config.cost)) return false;

    const newTech: Tech = {
      id: generateId(),
      techId,
      isResearching: true,
      progress: 0,
      completed: false,
      startedAt: Date.now(),
    };

    set({
      technologies: [...state.technologies, newTech],
      activeResearch: newTech,
      unlockedTechnologies: [...state.unlockedTechnologies, techId],
    });

    return true;
  },

  cancelResearch: () => {
    const state = get();
    if (!state.activeResearch) return;

    const newTechnologies = state.technologies.filter(
      (t) => t.id !== state.activeResearch!.id
    );

    set({
      technologies: newTechnologies,
      activeResearch: null,
    });
  },

  processResearch: (delta) => {
    const state = get();
    if (!state.activeResearch) return;

    const config = TECHNOLOGIES[state.activeResearch.techId];
    if (!config) return;

    const newProgress = state.activeResearch.progress + delta;

    if (newProgress >= config.researchTime) {
      const completedTech: Tech = {
        ...state.activeResearch,
        isResearching: false,
        progress: config.researchTime,
        completed: true,
      };

      const newTechnologies = state.technologies.map((t) =>
        t.id === state.activeResearch!.id ? completedTech : t
      );

      let newUnlockedWarriors = [...state.unlockedWarriors];
      let newUnlockedBuildings = [...state.unlockedBuildings];

      if (config.unlocks?.warriors) {
        for (const warriorType of config.unlocks.warriors) {
          if (!newUnlockedWarriors.includes(warriorType)) {
            newUnlockedWarriors.push(warriorType);
          }
        }
      }

      if (config.unlocks?.buildings) {
        for (const buildingType of config.unlocks.buildings) {
          if (!newUnlockedBuildings.includes(buildingType)) {
            newUnlockedBuildings.push(buildingType);
          }
        }
      }

      const newMaxPop = calculateMaxPopulation(state.buildings, newTechnologies);

      set({
        technologies: newTechnologies,
        activeResearch: null,
        unlockedWarriors: newUnlockedWarriors,
        unlockedBuildings: newUnlockedBuildings,
        maxPopulation: newMaxPop,
      });

      state.updateTaskProgress('research_complete', 1);
    } else {
      const updatedTech: Tech = {
        ...state.activeResearch,
        progress: newProgress,
      };

      const newTechnologies = state.technologies.map((t) =>
        t.id === state.activeResearch!.id ? updatedTech : t
      );

      set({
        technologies: newTechnologies,
        activeResearch: updatedTech,
      });
    }
  },

  getTechBonus: (effectType, target) => {
    const state = get();
    return calculateTechBonus(state.technologies, effectType, target);
  },

  refreshTaskChains: () => {
    const state = get();
    const currentDay = Math.floor(state.day);

    let totalPenaltyResources: Partial<Resources> = {};
    let totalPenaltyLoyalty = 0;
    let completedCount = state.totalChainsCompleted;
    let failedCount = state.totalChainsFailed;

    for (const chain of state.taskChains) {
      if (chain.completed && chain.chainRewardClaimed) {
        completedCount++;
        continue;
      }
      if (chain.completed && !chain.chainRewardClaimed) {
        completedCount++;
        continue;
      }
      if (chain.failed) {
        failedCount++;
        continue;
      }

      for (const task of chain.tasks) {
        if (task.status === 'failed') {
          failedCount++;
          break;
        }
        if (task.status !== 'active') continue;

        const elapsed = currentDay - Math.floor(task.startedAtDay);
        if (elapsed >= task.duration) {
          const lastStage = task.stages[task.stages.length - 1];
          const taskCompleted = task.progress >= lastStage.requiredProgress;
          if (!taskCompleted) {
            for (const [key, amount] of Object.entries(task.failurePenalty)) {
              const k = key as keyof Resources;
              totalPenaltyResources[k] = (totalPenaltyResources[k] || 0) + (amount as number);
            }
            if (task.penaltyLoyalty) {
              totalPenaltyLoyalty += task.penaltyLoyalty;
            }
            failedCount++;
            break;
          }
        }
      }
    }

    if (Object.keys(totalPenaltyResources).length > 0) {
      state.addResources(totalPenaltyResources);
    }

    let newLoyalty = state.loyalty;
    if (totalPenaltyLoyalty !== 0) {
      newLoyalty = Math.max(0, newLoyalty + totalPenaltyLoyalty);
    }

    const newChains = createTaskChains(currentDay);

    set({
      taskChains: newChains,
      lastTaskRefreshDay: currentDay,
      totalChainsCompleted: completedCount,
      totalChainsFailed: failedCount,
      loyalty: newLoyalty,
      recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
    });
  },

  processTaskTick: (_delta) => {
    const state = get();
    const currentDay = Math.floor(state.day);

    let totalPenaltyResources: Partial<Resources> = {};
    let totalPenaltyLoyalty = 0;
    let hasPenalty = false;

    const updatedChains = state.taskChains.map((chain) => {
      if (chain.completed || chain.failed) return chain;

      let chainModified = false;
      let chainFailed = false;

      const updatedTasks = chain.tasks.map((task, taskIdx) => {
        if (task.status !== 'active') return task;
        if (taskIdx > chain.currentTaskIndex) return task;

        const elapsed = currentDay - Math.floor(task.startedAtDay);
        if (elapsed >= task.duration) {
          const lastStage = task.stages[task.stages.length - 1];
          const taskCompleted = task.progress >= lastStage.requiredProgress;

          if (!taskCompleted) {
            hasPenalty = true;
            for (const [key, amount] of Object.entries(task.failurePenalty)) {
              const k = key as keyof Resources;
              totalPenaltyResources[k] = (totalPenaltyResources[k] || 0) + (amount as number);
            }
            if (task.penaltyLoyalty) {
              totalPenaltyLoyalty += task.penaltyLoyalty;
            }
            chainFailed = true;
            chainModified = true;
            return { ...task, status: 'failed' as const };
          } else {
            chainModified = true;
            return { ...task, status: 'completed' as const };
          }
        }
        return task;
      });

      if (!chainModified) return chain;

      let newCurrentIndex = chain.currentTaskIndex;
      if (chainFailed) {
        return { ...chain, tasks: updatedTasks, failed: true };
      }

      const currentTask = updatedTasks[chain.currentTaskIndex];
      if (currentTask && currentTask.status === 'completed') {
        if (chain.currentTaskIndex < updatedTasks.length - 1) {
          newCurrentIndex = chain.currentTaskIndex + 1;
        }
      }

      const allCompleted = updatedTasks.every((t) => t.status === 'completed');

      return {
        ...chain,
        tasks: updatedTasks,
        currentTaskIndex: newCurrentIndex,
        completed: allCompleted,
      };
    });

    if (hasPenalty) {
      if (Object.keys(totalPenaltyResources).length > 0) {
        state.addResources(totalPenaltyResources);
      }
    }

    let newLoyalty = state.loyalty;
    if (totalPenaltyLoyalty !== 0) {
      newLoyalty = Math.max(0, newLoyalty + totalPenaltyLoyalty);
    }

    set({
      taskChains: updatedChains,
      loyalty: newLoyalty,
      recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
    });

    const nextState = get();
    const allChainsResolved = nextState.taskChains.every(
      (c) => c.completed || c.failed
    );
    if (allChainsResolved || currentDay - nextState.lastTaskRefreshDay >= nextState.taskRefreshInterval) {
      nextState.refreshTaskChains();
    }
  },

  claimTaskStageReward: (chainId, taskId, stageIndex) => {
    const state = get();
    const chain = state.taskChains.find((c) => c.id === chainId);
    if (!chain) return false;

    const task = chain.tasks.find((t) => t.id === taskId);
    if (!task || task.status !== 'active') return false;

    const stage = task.stages.find((s) => s.index === stageIndex);
    if (!stage) return false;

    if (task.progress < stage.requiredProgress) return false;
    if (task.claimedStages.includes(stageIndex)) return false;

    state.addResources(stage.reward);
    let newLoyalty = state.loyalty;
    if (stage.bonusLoyalty) {
      newLoyalty = Math.min(100, newLoyalty + stage.bonusLoyalty);
    }

    const updatedChains = state.taskChains.map((c) => {
      if (c.id !== chainId) return c;
      return {
        ...c,
        tasks: c.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            claimedStages: [...t.claimedStages, stageIndex],
          };
        }),
      };
    });

    set({
      taskChains: updatedChains,
      loyalty: newLoyalty,
      recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
    });

    return true;
  },

  updateTaskProgress: (goalType, amount, target) => {
    const state = get();
    let modified = false;

    const isThresholdGoal = goalType === 'reach_population' || goalType === 'reach_loyalty';

    const updatedChains = state.taskChains.map((chain) => {
      if (chain.completed) return chain;

      const updatedTasks = chain.tasks.map((task) => {
        if (task.status !== 'active') return task;
        if (chain.tasks.indexOf(task) !== chain.currentTaskIndex) return task;

        const goal = task.goal;
        if (goal.type !== goalType) return task;
        if (goal.target && goal.target !== target) return task;

        modified = true;
        const newProgress = isThresholdGoal ? Math.max(task.progress, amount) : task.progress + amount;
        return { ...task, progress: newProgress };
      });

      return { ...chain, tasks: updatedTasks };
    });

    if (modified) {
      set({ taskChains: updatedChains });
    }
  },

  claimChainReward: (chainId) => {
    const state = get();
    const chain = state.taskChains.find((c) => c.id === chainId);
    if (!chain || !chain.completed || chain.chainRewardClaimed) return false;

    const allClaimed = chain.tasks.every((t) =>
      t.stages.every((s) => t.claimedStages.includes(s.index))
    );
    if (!allClaimed) return false;

    state.addResources(chain.chainReward);
    const newLoyalty = Math.min(100, state.loyalty + chain.chainBonusLoyalty);

    const updatedChains = state.taskChains.map((c) =>
      c.id === chainId ? { ...c, chainRewardClaimed: true } : c
    );

    set({
      taskChains: updatedChains,
      loyalty: newLoyalty,
      recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
      totalChainsCompleted: state.totalChainsCompleted + 1,
    });

    return true;
  },

  getWeatherEffects: () => {
    const state = get();
    return calculateWeatherEffects(state.season, state.weather);
  },

  advanceSeason: () => {
    const state = get();
    const nextSeason = getNextSeason(state.season);
    const newWeather = selectWeatherForSeason(nextSeason);
    set({
      season: nextSeason,
      seasonProgress: 0,
      weather: newWeather,
      weatherDuration: getWeatherDuration(newWeather),
    });
  },

  changeWeather: () => {
    const state = get();
    const newWeather = selectWeatherForSeason(state.season);
    const newEffects = calculateWeatherEffects(state.season, newWeather);
    set({
      weather: newWeather,
      weatherDuration: getWeatherDuration(newWeather),
      trades: generateTrades(6, newEffects.tradeModifier, state.factions),
    });
  },

  changeFactionReputation: (factionId, amount) => {
    const state = get();
    const faction = state.factions[factionId];
    if (!faction) return;

    const newReputation = Math.max(-100, Math.min(100, faction.reputation + amount));
    const newStance = getStanceFromReputation(newReputation);

    const newFactions: Record<string, Faction> = { ...state.factions };
    newFactions[factionId] = {
      ...faction,
      reputation: newReputation,
      stance: newStance,
      tradeUnlocked: newReputation >= 0,
      lastInteraction: Date.now(),
    };

    if (amount < 0) {
      const allies = Object.values(newFactions).filter((f) => f.stance === 'ally' && f.id !== factionId);
      for (const ally of allies) {
        if (Math.random() < 0.3) {
          newFactions[ally.id] = {
            ...newFactions[ally.id],
            reputation: Math.max(-100, newFactions[ally.id].reputation - Math.ceil(Math.abs(amount) * 0.3)),
            stance: getStanceFromReputation(newFactions[ally.id].reputation),
          };
        }
      }
    }

    set({ factions: newFactions as Record<FactionType, Faction> });
  },

  executeDiplomaticAction: (actionId) => {
    const state = get();
    let targetFaction: FactionType | null = null;
    let matchedAction: DiplomaticAction | null = null;

    for (const fid of Object.keys(state.factions) as FactionType[]) {
      const actions = getDiplomaticActions(fid, state.factions[fid].reputation);
      const found = actions.find((a) => a.id === actionId);
      if (found) {
        targetFaction = fid;
        matchedAction = found;
        break;
      }
    }

    if (!targetFaction || !matchedAction) {
      return { success: false, message: '找不到该外交行动' };
    }

    const faction = state.factions[targetFaction];
    const now = Date.now();
    if (now - faction.lastInteraction < matchedAction.cooldown * 1000) {
      return { success: false, message: '该行动冷却中，请稍后再试' };
    }

    if (!state.canAfford(matchedAction.cost)) {
      return { success: false, message: '资源不足' };
    }

    state.spendResources(matchedAction.cost);

    const success = Math.random() < matchedAction.successRate;
    const repChange = success ? matchedAction.reputationChange.success : matchedAction.reputationChange.fail;
    const currentRep = state.factions[targetFaction].reputation;
    const newReputation = Math.max(-100, Math.min(100, currentRep + repChange));
    const newStance = getStanceFromReputation(newReputation);

    const newFactions = { ...state.factions };
    newFactions[targetFaction] = {
      ...newFactions[targetFaction],
      reputation: newReputation,
      stance: newStance,
      tradeUnlocked: newReputation >= 0,
      lastInteraction: now,
    };

    let resultMessage = '';
    let shouldRefreshTrades = false;
    let shouldRefreshInvasion = false;

    if (matchedAction.type === 'gift') {
      if (success) {
        resultMessage = `礼物被欣然接受，${FACTIONS[targetFaction].name}对我们的好感提升了！`;
      } else {
        newFactions[targetFaction].reputation = currentRep;
        newFactions[targetFaction].stance = faction.stance;
        newFactions[targetFaction].tradeUnlocked = faction.tradeUnlocked;
        resultMessage = '礼物似乎不太合心意...';
      }
    }

    if (matchedAction.type === 'trade_treaty') {
      if (success) {
        newFactions[targetFaction].tradeUnlocked = true;
        shouldRefreshTrades = true;
        resultMessage = `与${FACTIONS[targetFaction].name}签订了贸易条约！`;
      } else {
        resultMessage = `${FACTIONS[targetFaction].name}拒绝了贸易条约...`;
      }
      shouldRefreshInvasion = true;
    }

    if (matchedAction.type === 'military_aid_request') {
      if (success) {
        state.requestMilitaryAid(targetFaction);
        resultMessage = `${FACTIONS[targetFaction].name}答应派遣援军！`;
      } else {
        resultMessage = `${FACTIONS[targetFaction].name}拒绝了援助请求...`;
      }
      shouldRefreshInvasion = true;
    }

    if (matchedAction.type === 'alliance_proposal') {
      if (success) {
        newFactions[targetFaction].reputation = Math.min(100, newReputation);
        newFactions[targetFaction].stance = 'ally';
        shouldRefreshTrades = true;
        shouldRefreshInvasion = true;
        resultMessage = `与${FACTIONS[targetFaction].name}缔结了同盟！`;
      } else {
        resultMessage = `${FACTIONS[targetFaction].name}婉拒了同盟提议...`;
      }
    }

    if (matchedAction.type === 'threaten') {
      if (success) {
        const loot: Partial<Resources> = { gold: 40, food: 30 };
        state.addResources(loot);
        resultMessage = `武力威慑成功，${FACTIONS[targetFaction].name}缴纳了贡品！`;
      } else {
        resultMessage = `${FACTIONS[targetFaction].name}拒绝屈服，关系恶化！`;
      }
      shouldRefreshTrades = true;
      shouldRefreshInvasion = true;
    }

    if (matchedAction.type === 'espionage') {
      if (success) {
        const config = FACTIONS[targetFaction];
        const loot: Partial<Resources> = {};
        if (config.speciality !== 'warriors' && config.speciality !== 'knowledge') {
          loot[config.speciality as keyof Resources] = 50;
        }
        loot.gold = 30;
        state.addResources(loot);
        resultMessage = `间谍行动成功，获得了大量资源！`;
      } else {
        resultMessage = `间谍被抓获，与${FACTIONS[targetFaction].name}关系严重恶化！`;
      }
      shouldRefreshTrades = true;
      shouldRefreshInvasion = true;
    }

    if (matchedAction.type === 'denounce') {
      for (const fid of Object.keys(state.factions) as FactionType[]) {
        if (fid !== targetFaction && state.factions[fid].stance === 'enemy') {
          const enemyFaction = newFactions[fid];
          const enemyNewRep = Math.max(-100, Math.min(100, enemyFaction.reputation + 5));
          newFactions[fid] = {
            ...enemyFaction,
            reputation: enemyNewRep,
            stance: getStanceFromReputation(enemyNewRep),
            tradeUnlocked: enemyNewRep >= 0,
          };
        }
      }
      shouldRefreshTrades = true;
      shouldRefreshInvasion = true;
      resultMessage = `公开谴责了${FACTIONS[targetFaction].name}！`;
    }

    if (repChange < 0) {
      const allies = Object.values(newFactions).filter((f) => f.stance === 'ally' && f.id !== targetFaction);
      for (const ally of allies) {
        const allyRep = Math.max(-100, Math.min(100, ally.reputation - 3));
        newFactions[ally.id] = {
          ...ally,
          reputation: allyRep,
          stance: getStanceFromReputation(allyRep),
          tradeUnlocked: allyRep >= 0,
        };
      }
    }

    const setPayload: any = { factions: newFactions };

    if (shouldRefreshTrades) {
      setPayload.trades = generateTrades(6, state.getWeatherEffects().tradeModifier, newFactions);
    }

    if (shouldRefreshInvasion) {
      const s = get();
      if (!s.invasion?.isActive) {
        const wave = Math.floor(s.day / 2) + 1;
        setPayload.invasion = generateInvasion(wave, newFactions);
      }
    }

    set(setPayload);

    return { success, message: resultMessage };
  },

  getAvailableDiplomaticActions: (factionId) => {
    const state = get();
    const faction = state.factions[factionId];
    if (!faction) return [];
    return getDiplomaticActions(factionId, faction.reputation);
  },

  resolveDiplomaticEvent: (eventId, choiceId) => {
    const state = get();
    const event = state.activeDiplomaticEvents.find((e) => e.id === eventId);
    if (!event) return;

    const choice = event.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    const effects = choice.effects;
    const newFactions = { ...state.factions };
    let reputationChanged = false;

    if (effects.reputationChanges) {
      for (const [fid, amount] of Object.entries(effects.reputationChanges)) {
        const factionId = fid as FactionType;
        const faction = newFactions[factionId];
        if (faction) {
          const newRep = Math.max(-100, Math.min(100, faction.reputation + (amount as number)));
          newFactions[factionId] = {
            ...faction,
            reputation: newRep,
            stance: getStanceFromReputation(newRep),
            tradeUnlocked: newRep >= 0,
          };
          reputationChanged = true;

          if ((amount as number) < 0) {
            const allies = Object.values(newFactions).filter((f) => f.stance === 'ally' && f.id !== factionId);
            for (const ally of allies) {
              const allyRep = Math.max(-100, Math.min(100, ally.reputation - 3));
              newFactions[ally.id] = {
                ...ally,
                reputation: allyRep,
                stance: getStanceFromReputation(allyRep),
                tradeUnlocked: allyRep >= 0,
              };
            }
          }
        }
      }
    }

    if (effects.resourceChanges) {
      const resourceGain: Partial<Resources> = {};
      const resourceCost: Partial<Resources> = {};
      for (const [key, amount] of Object.entries(effects.resourceChanges)) {
        if ((amount as number) > 0) {
          resourceGain[key as keyof Resources] = amount as number;
        } else {
          resourceCost[key as keyof Resources] = Math.abs(amount as number);
        }
      }
      if (Object.keys(resourceCost).length > 0) {
        state.spendResources(resourceCost);
      }
      if (Object.keys(resourceGain).length > 0) {
        state.addResources(resourceGain);
      }
    }

    if (effects.populationChange) {
      const newPop = Math.max(0, Math.min(state.maxPopulation, state.population + effects.populationChange));
      set({ population: newPop });
    }

    if (effects.loyaltyChange) {
      const newLoyalty = Math.max(0, Math.min(100, state.loyalty + effects.loyaltyChange));
      set({
        loyalty: newLoyalty,
        recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
      });
    }

    if (effects.triggerEnding) {
      state.triggerEnding(effects.triggerEnding);
    }

    const setPayload: any = {
      factions: newFactions as Record<FactionType, Faction>,
      activeDiplomaticEvents: state.activeDiplomaticEvents.filter((e) => e.id !== eventId),
    };

    if (reputationChanged) {
      const currentState = get();
      setPayload.trades = generateTrades(6, currentState.getWeatherEffects().tradeModifier, newFactions);
      if (!currentState.invasion?.isActive) {
        const wave = Math.floor(currentState.day / 2) + 1;
        setPayload.invasion = generateInvasion(wave, newFactions);
      }
    }

    set(setPayload);
  },

  processDiplomaticTick: (delta) => {
    const state = get();

    let newCooldown = state.diplomaticEventCooldown - delta;

    if (newCooldown <= 0 && state.activeDiplomaticEvents.length < 2 && !state.gameEnding) {
      const event = triggerRandomDiplomaticEvent(Math.floor(state.day), state.factions);
      if (event) {
        const activeEvent: ActiveDiplomaticEvent = {
          id: generateId(),
          eventId: event.id,
          type: event.type,
          name: event.name,
          icon: event.icon,
          description: event.description,
          factionId: event.factionId,
          choices: event.choices,
          triggeredAt: Date.now(),
        };
        set({
          activeDiplomaticEvents: [...state.activeDiplomaticEvents, activeEvent],
        });
      }
      newCooldown = getDiplomaticEventInterval();
    }

    set({ diplomaticEventCooldown: newCooldown });
  },

  dismissDiplomaticEvent: (eventId) => {
    const state = get();
    set({
      activeDiplomaticEvents: state.activeDiplomaticEvents.filter((e) => e.id !== eventId),
    });
  },

  requestMilitaryAid: (factionId) => {
    const state = get();
    const faction = state.factions[factionId];
    const config = FACTIONS[factionId];
    if (!faction || !config) return false;
    if (faction.stance !== 'ally' && faction.stance !== 'friendly') return false;

    const strength = config.militaryStrength;
    const warriorCount = Math.max(2, Math.floor(strength / 20));

    const reinforcement: AllyReinforcement = {
      id: generateId(),
      factionId,
      factionName: config.name,
      factionIcon: config.icon,
      warriors: [
        {
          type: 'grunt',
          count: warriorCount,
          attack: Math.floor(8 * (strength / 80)),
          defense: Math.floor(4 * (strength / 80)),
          hp: Math.floor(40 * (strength / 80)),
        },
        {
          type: 'archer',
          count: Math.floor(warriorCount * 0.5),
          attack: Math.floor(10 * (strength / 80)),
          defense: Math.floor(3 * (strength / 80)),
          hp: Math.floor(30 * (strength / 80)),
        },
      ],
      duration: 180,
      summonedAt: Date.now(),
    };

    set({
      allyReinforcements: [...state.allyReinforcements, reinforcement],
    });
    return true;
  },

  processAllyReinforcementsTick: (delta) => {
    const state = get();
    const newReinforcements = state.allyReinforcements
      .map((r) => ({ ...r, duration: r.duration - delta }))
      .filter((r) => r.duration > 0);

    if (newReinforcements.length !== state.allyReinforcements.length) {
      set({ allyReinforcements: newReinforcements });
    }
  },

  calculateResourceCapacity: () => {
    const state = get();
    return calculateResourceCapacity(state.buildings, state.technologies);
  },

  getStorageUsagePercent: (resource) => {
    const state = get();
    const capacity = (state.resourceCapacity as any)[resource];
    if (capacity <= 0) return 100;
    const total = calculateTotalResources(state.buildings);
    return Math.min(100, ((total as any)[resource] / capacity) * 100);
  },

  getBuildingStorageUsagePercent: (buildingId, resource) => {
    const state = get();
    const building = state.buildings.find((b) => b.id === buildingId);
    if (!building) return 0;
    const cap = getBuildingCapacityByType(building.type, building.level);
    const maxCap = (cap as any)[resource] || 0;
    if (maxCap <= 0) return 0;
    const current = (building.storage || {})[resource] || 0;
    return Math.min(100, (current / maxCap) * 100);
  },

  startTransport: (resource, amount, fromBuildingId, toBuildingId) => {
    const state = get();
    
    if (state.transportTasks.length >= MAX_TRANSPORT_TASKS) return false;
    if (amount <= 0) return false;
    
    const hasCaravanserai = state.buildings.some((b) => b.type === 'caravanserai' && !b.isBuilding);
    if (!hasCaravanserai) return false;

    const fromBuilding = state.buildings.find((b) => b.id === fromBuildingId);
    const toBuilding = state.buildings.find((b) => b.id === toBuildingId);
    if (!fromBuilding || !toBuilding) return false;

    const fromAvailable = (fromBuilding.storage || {})[resource] || 0;
    if (fromAvailable < amount) return false;

    const caravanseraiLevel = state.buildings
      .filter((b) => b.type === 'caravanserai' && !b.isBuilding)
      .reduce((max, b) => Math.max(max, b.level), 0);
    const speedBonus = 1 + caravanseraiLevel * 0.2;
    const totalTime = TRANSPORT_BASE_TIME / speedBonus;

    const transportTask: TransportTask = {
      id: generateId(),
      resource,
      amount,
      fromBuildingId,
      toBuildingId,
      status: 'transporting',
      progress: 0,
      totalTime,
      speed: speedBonus,
    };

    state.removeResourcesFromBuilding(fromBuildingId, { [resource]: amount });
    set({ transportTasks: [...get().transportTasks, transportTask] });

    return true;
  },

  cancelTransport: (taskId) => {
    const state = get();
    const task = state.transportTasks.find((t) => t.id === taskId);
    if (!task) return false;

    const refundAmount = Math.floor(task.amount * 0.8);
    state.addResourcesToBuilding(task.fromBuildingId, { [task.resource]: refundAmount });
    set({
      transportTasks: state.transportTasks.filter((t) => t.id !== taskId),
    });

    return true;
  },

  processTransportTick: (delta) => {
    const state = get();
    if (state.transportTasks.length === 0) return;

    const completedTasks: TransportTask[] = [];
    const updatedTasks: TransportTask[] = [];

    for (const task of state.transportTasks) {
      const newProgress = task.progress + delta;
      if (newProgress >= task.totalTime) {
        completedTasks.push(task);
      } else {
        updatedTasks.push({ ...task, progress: newProgress });
      }
    }

    if (completedTasks.length > 0) {
      for (const task of completedTasks) {
        get().addResourcesToBuilding(task.toBuildingId, { [task.resource]: task.amount });
      }
      set({ transportTasks: updatedTasks });
    } else if (updatedTasks.length !== state.transportTasks.length) {
      set({ transportTasks: updatedTasks });
    }
  },

  processSpoilageTick: (delta) => {
    const state = get();
    
    let newCooldown = state.spoilageCooldown - delta;
    let newEvents = [...state.spoilageEvents];

    if (newCooldown <= 0 && newEvents.length < 2) {
      const total = calculateTotalResources(state.buildings);
      const eventData = generateSpoilageEvent(Math.floor(state.day), total as any);
      if (eventData) {
        let remainingLoss = eventData.lossAmount;
        const sortedBuildings = [...state.buildings]
          .filter((b) => !b.isBuilding && ((b.storage || {})[eventData.resource] || 0) > 0)
          .sort((a, b) => ((b.storage || {})[eventData.resource] || 0) - ((a.storage || {})[eventData.resource] || 0));

        const newBuildings = sortedBuildings.map((b) => {
          if (remainingLoss <= 0) return b;
          const available = (b.storage || {})[eventData.resource] || 0;
          const deduct = Math.min(available, remainingLoss);
          remainingLoss -= deduct;
          return {
            ...b,
            storage: {
              ...(b.storage || {}),
              [eventData.resource]: available - deduct,
            },
          };
        });

        const finalBuildings = state.buildings.map((b) => {
          const updated = newBuildings.find((nb) => nb.id === b.id);
          return updated || b;
        });

        const spoilageEvent: SpoilageEvent = {
          id: generateId(),
          type: eventData.type,
          name: eventData.name,
          icon: eventData.icon,
          description: eventData.description,
          resource: eventData.resource,
          lossPercent: eventData.lossPercent,
          lossAmount: eventData.lossAmount,
          timestamp: Date.now(),
          duration: 10,
          active: true,
        };

        newEvents.push(spoilageEvent);
        set({
          buildings: finalBuildings,
          resources: calculateTotalResources(finalBuildings),
          spoilageEvents: newEvents,
        });
      }
      newCooldown = SPOILAGE_COOLDOWN_MIN + Math.random() * (SPOILAGE_COOLDOWN_MAX - SPOILAGE_COOLDOWN_MIN);
    }

    newEvents = newEvents
      .map((e) => ({ ...e, duration: e.duration - delta }))
      .filter((e) => e.duration > 0);

    set({
      spoilageCooldown: newCooldown,
      spoilageEvents: newEvents,
    });
  },

  dismissSpoilageEvent: (eventId) => {
    const state = get();
    set({
      spoilageEvents: state.spoilageEvents.filter((e) => e.id !== eventId),
    });
  },

  collectOfflineEarnings: () => {
    const state = get();
    if (!state.offlineEarnings || state.offlineEarnings.collected) return false;

    state.addResources(state.offlineEarnings.resources);
    set({
      offlineEarnings: { ...state.offlineEarnings, collected: true },
    });

    return true;
  },

  getTotemBonus: (effectType, target) => {
    const state = get();
    return calculateTotemBonus(state.totem.unlockedTotems, state.totem.activeBlessings, effectType, target);
  },

  unlockTotem: (totemId) => {
    const state = get();
    const check = checkCanUnlockTotem(totemId, state.totem.unlockedTotems, state.buildings, state.totem.faith);
    if (!check.canUnlock) {
      return { success: false, message: check.reason || '无法解锁' };
    }
    const config = TOTEMS[totemId];
    if (!config) return { success: false, message: '未知图腾' };
    const resourceCost = getTotemCost(totemId, 0);
    const faithCost = getTotemFaithCost(totemId, 0);
    if (!state.canAfford(resourceCost)) {
      return { success: false, message: '资源不足' };
    }
    if (state.totem.faith < faithCost) {
      return { success: false, message: `信仰值不足（需要${faithCost}）` };
    }
    state.spendResources(resourceCost);
    const newUnlocked: TotemUnlocked[] = [
      ...state.totem.unlockedTotems,
      {
        totemId,
        activated: true,
        level: 1,
        maxLevel: 5,
      },
    ];
    const newAvailableBlessings = getAvailableBlessings(newUnlocked);
    const newTotem = {
      ...state.totem,
      faith: state.totem.faith - faithCost,
      unlockedTotems: newUnlocked,
      availableBlessings: newAvailableBlessings,
      accumulation: {
        ...state.totem.accumulation,
        perSecond: getFaithPerSecond(state.buildings, newUnlocked),
      },
    };
    let newLoyalty = state.loyalty;
    const loyaltyBoost = calculateTotemBonus(newUnlocked, [], 'loyalty_boost');
    if (loyaltyBoost > 0 && loyaltyBoost < 1) {
      newLoyalty = Math.min(100, newLoyalty + loyaltyBoost * 100);
    }
    set({
      totem: newTotem,
      loyalty: newLoyalty,
      recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
    });
    return { success: true, message: `成功解锁${config.name}！` };
  },

  activateTotem: (totemId) => {
    const state = get();
    const unlocked = state.totem.unlockedTotems.find((t) => t.totemId === totemId);
    if (!unlocked) return { success: false, message: '尚未解锁该图腾' };
    if (unlocked.activated) return { success: false, message: '该图腾已激活' };
    const newUnlocked = state.totem.unlockedTotems.map((t) =>
      t.totemId === totemId ? { ...t, activated: true } : t
    );
    const newAvailableBlessings = getAvailableBlessings(newUnlocked);
    set({
      totem: {
        ...state.totem,
        unlockedTotems: newUnlocked,
        availableBlessings: newAvailableBlessings,
        accumulation: {
          ...state.totem.accumulation,
          perSecond: getFaithPerSecond(state.buildings, newUnlocked),
        },
      },
    });
    return { success: true, message: `${TOTEMS[totemId].name}已激活！` };
  },

  deactivateTotem: (totemId) => {
    const state = get();
    const unlocked = state.totem.unlockedTotems.find((t) => t.totemId === totemId);
    if (!unlocked) return { success: false, message: '尚未解锁该图腾' };
    if (!unlocked.activated) return { success: false, message: '该图腾未激活' };
    const activeCount = state.totem.unlockedTotems.filter((t) => t.activated).length;
    if (activeCount <= 1) return { success: false, message: '至少需要激活一个图腾' };
    const newUnlocked = state.totem.unlockedTotems.map((t) =>
      t.totemId === totemId ? { ...t, activated: false } : t
    );
    const newAvailableBlessings = getAvailableBlessings(newUnlocked);
    set({
      totem: {
        ...state.totem,
        unlockedTotems: newUnlocked,
        availableBlessings: newAvailableBlessings,
        accumulation: {
          ...state.totem.accumulation,
          perSecond: getFaithPerSecond(state.buildings, newUnlocked),
        },
      },
    });
    return { success: true, message: `${TOTEMS[totemId].name}已停用` };
  },

  upgradeTotem: (totemId) => {
    const state = get();
    const unlocked = state.totem.unlockedTotems.find((t) => t.totemId === totemId);
    if (!unlocked) return { success: false, message: '尚未解锁该图腾' };
    if (unlocked.level >= unlocked.maxLevel) return { success: false, message: '图腾已达最高等级' };
    const resourceCost = getTotemCost(totemId, unlocked.level);
    const faithCost = getTotemFaithCost(totemId, unlocked.level);
    if (!state.canAfford(resourceCost)) return { success: false, message: '资源不足' };
    if (state.totem.faith < faithCost) return { success: false, message: `信仰值不足（需要${faithCost}）` };
    state.spendResources(resourceCost);
    const newUnlocked = state.totem.unlockedTotems.map((t) =>
      t.totemId === totemId ? { ...t, level: t.level + 1 } : t
    );
    set({
      totem: {
        ...state.totem,
        faith: state.totem.faith - faithCost,
        unlockedTotems: newUnlocked,
      },
    });
    return { success: true, message: `${TOTEMS[totemId].name}升级到Lv.${unlocked.level + 1}！` };
  },

  performOffering: (offerId) => {
    const state = get();
    const offer = TOTEM_OFFERS.find((o) => o.id === offerId);
    if (!offer) return { success: false, message: '未知献祭' };
    const cooldown = state.totem.offerCooldowns[offerId] || 0;
    if (cooldown > 0) return { success: false, message: `冷却中（${Math.ceil(cooldown)}秒）` };
    if (!state.canAfford(offer.resourceCost)) return { success: false, message: '资源不足' };
    state.spendResources(offer.resourceCost);
    const newFaith = Math.min(state.totem.maxFaith, state.totem.faith + offer.faithReward);
    const gained = newFaith - state.totem.faith;
    const newCooldowns = { ...state.totem.offerCooldowns, [offerId]: offer.cooldown };
    const newTotem = {
      ...state.totem,
      faith: newFaith,
      offerCooldowns: newCooldowns,
      totalFaithGained: state.totem.totalFaithGained + gained,
      totalOfferings: state.totem.totalOfferings + 1,
    };
    let newLoyalty = state.loyalty;
    if (offer.id === 'offer_blood') {
      newLoyalty = Math.max(0, newLoyalty - 2);
    } else {
      newLoyalty = Math.min(100, newLoyalty + 1);
    }
    set({
      totem: newTotem,
      loyalty: newLoyalty,
      recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
    });
    return { success: true, message: `献祭成功！获得${gained}点信仰` };
  },

  activateBlessing: (blessingType) => {
    const state = get();
    const check = checkCanActivateBlessing(
      blessingType,
      state.totem.unlockedTotems,
      state.buildings,
      state.totem.faith
    );
    if (!check.canActivate) {
      return { success: false, message: check.reason || '无法激活祝福' };
    }
    const blessing = BLESSINGS[blessingType];
    if (!blessing) return { success: false, message: '未知祝福' };
    const hasActive = state.totem.activeBlessings.some(
      (b) => b.blessingType === blessingType
    );
    if (hasActive) return { success: false, message: '该祝福已生效中' };
    const activeBlessing: ActiveBlessing = {
      id: generateId(),
      blessingType,
      name: blessing.name,
      icon: blessing.icon,
      effects: blessing.effects,
      duration: blessing.duration,
      remaining: blessing.duration,
      startedAt: Date.now(),
    };
    set({
      totem: {
        ...state.totem,
        faith: state.totem.faith - blessing.faithCost,
        activeBlessings: [...state.totem.activeBlessings, activeBlessing],
        totalBlessings: state.totem.totalBlessings + 1,
      },
    });
    return { success: true, message: `${blessing.name}已激活！` };
  },

  processTotemTick: (delta) => {
    const state = get();
    const totem = state.totem;

    const perSecond = getFaithPerSecond(state.buildings, totem.unlockedTotems);
    const faithGain = perSecond * delta;
    let newFaith = Math.min(totem.maxFaith, totem.faith + faithGain);

    const newActiveBlessings = totem.activeBlessings
      .map((b) => ({ ...b, remaining: b.remaining - delta }))
      .filter((b) => b.remaining > 0);

    const newOfferCooldowns: Record<string, number> = {};
    for (const [key, cd] of Object.entries(totem.offerCooldowns)) {
      const newCd = cd - delta;
      if (newCd > 0) newOfferCooldowns[key] = newCd;
    }

    let newPopulation = state.population;
    const popGrowthBonus = calculateTotemBonus(totem.unlockedTotems, newActiveBlessings, 'population_growth');
    if (popGrowthBonus > 0 && newPopulation < state.maxPopulation && state.loyalty > 30) {
      const baseGrowth = POP_GROWTH_RATE * (state.loyalty / 100) * delta;
      const enhancedGrowth = baseGrowth * (1 + popGrowthBonus);
      if (Math.random() < enhancedGrowth) {
        newPopulation = Math.min(state.maxPopulation, newPopulation + 1);
      }
    }

    set({
      totem: {
        ...totem,
        faith: newFaith,
        activeBlessings: newActiveBlessings,
        offerCooldowns: newOfferCooldowns,
        accumulation: {
          ...totem.accumulation,
          lastTick: Date.now(),
          perSecond,
        },
        totalFaithGained: totem.totalFaithGained + (newFaith - totem.faith > 0 ? newFaith - totem.faith : 0),
      },
      population: newPopulation,
    });
  },

  buildTrap: (trapType) => {
    const state = get();
    const config = TRAPS[trapType];
    if (!config) return { success: false, message: '未知陷阱类型' };

    if (config.requires) {
      const reqBuilding = state.buildings.find(
        (b) => b.type === config.requires!.building && !b.isBuilding
      );
      if (!reqBuilding || reqBuilding.level < config.requires.level) {
        return { success: false, message: `需要 ${BUILDINGS[config.requires.building].name} Lv.${config.requires.level}` };
      }
    }

    if (!state.canAfford(config.cost)) {
      return { success: false, message: '资源不足' };
    }

    state.spendResources(config.cost);

    const newAvailableTraps = { ...state.nightRaid.availableTraps };
    newAvailableTraps[trapType] = (newAvailableTraps[trapType] || 0) + 1;

    set({
      nightRaid: {
        ...state.nightRaid,
        availableTraps: newAvailableTraps,
      },
    });

    return { success: true, message: `成功建造 ${config.name}！` };
  },

  placeTrap: (trapType) => {
    const state = get();
    const config = TRAPS[trapType];
    if (!config) return { success: false, message: '未知陷阱类型' };

    const available = state.nightRaid.availableTraps[trapType] || 0;
    if (available <= 0) {
      return { success: false, message: '没有可用的陷阱' };
    }

    const placedCount = state.nightRaid.placedTraps.filter((t) => t.type === trapType).length;
    if (placedCount >= config.maxCount) {
      return { success: false, message: `该类型陷阱已达上限（${config.maxCount}个）` };
    }

    const newTrap: Trap = {
      id: generateNightRaidId(),
      type: trapType,
      triggered: false,
      position: state.nightRaid.placedTraps.length,
    };

    const newAvailableTraps = { ...state.nightRaid.availableTraps };
    newAvailableTraps[trapType] = available - 1;

    set({
      nightRaid: {
        ...state.nightRaid,
        placedTraps: [...state.nightRaid.placedTraps, newTrap],
        availableTraps: newAvailableTraps,
      },
    });

    return { success: true, message: `${config.name} 已布置！` };
  },

  removeTrap: (trapId) => {
    const state = get();
    const trap = state.nightRaid.placedTraps.find((t) => t.id === trapId);
    if (!trap) return;

    const newAvailableTraps = { ...state.nightRaid.availableTraps };
    newAvailableTraps[trap.type] = (newAvailableTraps[trap.type] || 0) + 1;

    set({
      nightRaid: {
        ...state.nightRaid,
        placedTraps: state.nightRaid.placedTraps.filter((t) => t.id !== trapId),
        availableTraps: newAvailableTraps,
      },
    });
  },

  assignGarrison: (warriorId) => {
    const state = get();
    const warrior = state.warriors.find((w) => w.id === warriorId);
    if (!warrior) return false;

    if (state.nightRaid.garrisonWarriors.includes(warriorId)) return false;

    const activeRaid = state.nightRaid.activeRaid;
    if (activeRaid && activeRaid.phase !== 'preparing') return false;

    const newGarrisonWarriors = [...state.nightRaid.garrisonWarriors, warriorId];

    set({
      nightRaid: {
        ...state.nightRaid,
        garrisonWarriors: newGarrisonWarriors,
      },
    });

    return true;
  },

  unassignGarrison: (warriorId) => {
    const state = get();
    const activeRaid = state.nightRaid.activeRaid;
    if (activeRaid && activeRaid.phase !== 'preparing') return;

    if (!state.nightRaid.garrisonWarriors.includes(warriorId)) return;

    const newGarrisonWarriors = state.nightRaid.garrisonWarriors.filter(
      (id) => id !== warriorId
    );

    set({
      nightRaid: {
        ...state.nightRaid,
        garrisonWarriors: newGarrisonWarriors,
      },
    });
  },

  startNightRaid: () => {
    const state = get();
    if (state.nightRaid.activeRaid) return;

    const wave = Math.floor(state.day / 3) + 1;
    const enemies = generateNightRaidEnemies(wave, Math.floor(state.day));
    const rewards = calculateRaidRewards(wave, enemies);

    const raid: NightRaid = {
      id: generateNightRaidId(),
      wave,
      phase: 'warning',
      warningCountdown: BASE_WARNING_TIME,
      preparationTime: BASE_PREPARATION_TIME,
      enemies,
      traps: state.nightRaid.placedTraps.map((t) => ({ ...t, triggered: false })),
      garrison: createGarrisonSlots(),
      rewards,
      result: 'pending',
      battleLog: [],
    };

    set({
      nightRaid: {
        ...state.nightRaid,
        activeRaid: raid,
      },
    });
  },

  startNightRaidBattle: () => {
    const state = get();
    const raid = state.nightRaid.activeRaid;
    if (!raid || raid.phase === 'fighting' || raid.phase === 'result') {
      return { result: 'defeat' as const, log: ['没有进行中的夜袭'] };
    }

    const log: string[] = [];
    let myWarriors = state.warriors
      .filter((w) => state.nightRaid.garrisonWarriors.includes(w.id))
      .map((w) => ({ ...w }));

    if (myWarriors.length === 0) {
      myWarriors = state.warriors.map((w) => ({ ...w }));
    }

    let enemies = raid.enemies.map((e) => ({ ...e }));

    const wallTechBonus = calculateTechBonus(state.technologies, 'wall_defense');
    const wallTotemBonus = state.getTotemBonus('wall_defense');
    const baseWallDefense = calculateWallDefense(state.buildings, state.technologies);
    const wallDefense = Math.floor(baseWallDefense * (1 + wallTotemBonus) / (1 + wallTechBonus) * (1 + wallTechBonus + wallTotemBonus));
    const loyaltyBonus = Math.floor(state.loyalty / 20);

    myWarriors = myWarriors.map((w) => {
      const atkTechBonus = calculateTechBonus(state.technologies, 'attack_boost', w.type) +
        calculateTechBonus(state.technologies, 'attack_boost');
      const defTechBonus = calculateTechBonus(state.technologies, 'defense_boost', w.type) +
        calculateTechBonus(state.technologies, 'defense_boost');
      const hpTechBonus = calculateTechBonus(state.technologies, 'hp_boost', w.type) +
        calculateTechBonus(state.technologies, 'hp_boost');
      const atkTotemBonus = state.getTotemBonus('attack_boost', w.type) +
        state.getTotemBonus('attack_boost');
      const defTotemBonus = state.getTotemBonus('defense_boost', w.type) +
        state.getTotemBonus('defense_boost');
      const hpTotemBonus = state.getTotemBonus('hp_boost', w.type) +
        state.getTotemBonus('hp_boost');
      const atkGovBonus = state.getGovernmentBonus('attack_boost', w.type) +
        state.getGovernmentBonus('attack_boost');
      const defGovBonus = state.getGovernmentBonus('defense_boost', w.type) +
        state.getGovernmentBonus('defense_boost');
      const hpGovBonus = state.getGovernmentBonus('hp_boost', w.type) +
        state.getGovernmentBonus('hp_boost');
      const atkBonus = atkTechBonus + atkTotemBonus + atkGovBonus;
      const defBonus = defTechBonus + defTotemBonus + defGovBonus;
      const hpBonus = hpTechBonus + hpTotemBonus + hpGovBonus;

      return {
        ...w,
        attack: Math.floor(w.attack * (1 + atkBonus)),
        defense: Math.floor(w.defense * (1 + defBonus)),
        maxHp: Math.floor(w.maxHp * (1 + hpBonus)),
        hp: Math.floor(w.hp * (1 + hpBonus)),
      };
    });

    log.push(`🌙 第 ${raid.wave} 波夜袭开始！`);
    log.push(`敌人数量：${enemies.length}`);

    const trapResult = calculateTrapDamage(raid.traps, enemies);
    enemies = trapResult.updatedEnemies;
    log.push(...trapResult.damageLog);
    log.push(`🔺 共触发 ${trapResult.trapsTriggered} 个陷阱`);

    const initialEnemyCount = raid.enemies.length;
    const trapsTriggered = trapResult.trapsTriggered;

    log.push(`我方防御加成：+${wallDefense}，士气加成：+${loyaltyBonus}`);
    log.push(`守军数量：${myWarriors.length}`);

    let round = 0;
    while (myWarriors.length > 0 && enemies.length > 0 && round < 20) {
      round++;
      log.push(`--- 回合 ${round} ---`);

      for (const warrior of myWarriors) {
        if (enemies.length === 0) break;
        const target = enemies[0];
        const damage = Math.max(1, warrior.attack + loyaltyBonus * 0.5 - target.defense / 2);
        target.hp -= damage;
        log.push(`${WARRIORS[warrior.type].name} 攻击 ${ENEMIES[target.type].name}，造成 ${Math.floor(damage)} 伤害`);
        if (target.hp <= 0) {
          enemies.shift();
          log.push(`💀 ${ENEMIES[target.type].name} 被击败！`);
        }
      }

      for (const enemy of enemies) {
        if (myWarriors.length === 0) break;
        const target = myWarriors[0];
        const damage = Math.max(1, enemy.attack - target.defense / 2 - wallDefense / 10);
        target.hp -= damage;
        log.push(`${ENEMIES[enemy.type].name} 攻击 ${WARRIORS[target.type].name}，造成 ${Math.floor(damage)} 伤害`);
        if (target.hp <= 0) {
          myWarriors.shift();
          log.push(`☠️ ${WARRIORS[target.type].name} 阵亡！`);
        }
      }
    }

    const victory = enemies.length === 0 && myWarriors.length > 0;
    log.push(victory ? '🏆 胜利！部落成功抵御夜袭！' : '💔 失败...部落遭受重创');

    const enemiesDefeated = initialEnemyCount - enemies.length;

    const newLoyalty = Math.min(100, state.loyalty + (victory ? 3 : -5));
    const newPopulation = Math.max(0, state.population + (victory ? 0 : -1));

    if (victory) {
      log.push(`获得奖励：${Object.entries(raid.rewards).map(([k, v]) => `${k}+${v}`).join(', ')}`);
    } else {
      log.push(`人口因战败减少，忠诚下降`);
    }

    const survivingWarriorIds = myWarriors.map((w) => w.id);
    const allWarriorIds = state.nightRaid.garrisonWarriors.length > 0
      ? state.nightRaid.garrisonWarriors
      : state.warriors.map((w) => w.id);
    const deadWarriorIds = allWarriorIds.filter((id) => !survivingWarriorIds.includes(id));

    const updatedWarriors = state.warriors.filter((w) => !deadWarriorIds.includes(w.id));

    const report: NightRaidReport = {
      id: generateNightRaidId(),
      wave: raid.wave,
      result: victory ? 'victory' : 'defeat',
      timestamp: Date.now(),
      enemiesDefeated,
      trapsTriggered,
      casualties: deadWarriorIds.length,
      rewards: { ...raid.rewards },
      log,
      claimed: false,
    };

    const newReports = [report, ...state.nightRaid.reports].slice(0, MAX_REPORTS);

    const newPlacedTraps = state.nightRaid.placedTraps.map((t) => {
      const raidTrap = raid.traps.find((rt) => rt.id === t.id);
      if (raidTrap && raidTrap.triggered) {
        return { ...t, triggered: true };
      }
      return t;
    });

    set({
      warriors: updatedWarriors,
      nightRaid: {
        ...state.nightRaid,
        activeRaid: {
          ...raid,
          phase: 'result',
          enemies,
          result: victory ? 'victory' : 'defeat',
          battleLog: log,
        },
        reports: newReports,
        totalRaids: state.nightRaid.totalRaids + 1,
        totalRaidWins: state.nightRaid.totalRaidWins + (victory ? 1 : 0),
        totalRaidLosses: state.nightRaid.totalRaidLosses + (victory ? 0 : 1),
        nextRaidIn: BASE_RAID_COOLDOWN,
        placedTraps: newPlacedTraps,
        garrisonWarriors: [],
      },
      totalWins: state.totalWins + (victory ? 1 : 0),
      totalLosses: state.totalLosses + (victory ? 0 : 1),
      loyalty: newLoyalty,
      population: newPopulation,
      recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
    });

    if (victory) {
      state.updateTaskProgress('win_battles', 1);
    }

    return { result: victory ? 'victory' : 'defeat', log };
  },

  claimRaidReward: (reportId) => {
    const state = get();
    const report = state.nightRaid.reports.find((r) => r.id === reportId);
    if (!report || report.claimed || report.result !== 'victory') return false;

    state.addResources(report.rewards);

    const newReports = state.nightRaid.reports.map((r) =>
      r.id === reportId ? { ...r, claimed: true } : r
    );

    const activeRaid = state.nightRaid.activeRaid;
    const shouldCloseActiveRaid = activeRaid && activeRaid.phase === 'result';

    set({
      nightRaid: {
        ...state.nightRaid,
        reports: newReports,
        activeRaid: shouldCloseActiveRaid ? null : state.nightRaid.activeRaid,
        nextRaidIn: shouldCloseActiveRaid ? BASE_RAID_COOLDOWN : state.nightRaid.nextRaidIn,
      },
    });

    return true;
  },

  closeNightRaidResult: () => {
    const state = get();
    const raid = state.nightRaid.activeRaid;
    if (!raid || raid.phase !== 'result') return;

    set({
      nightRaid: {
        ...state.nightRaid,
        activeRaid: null,
        nextRaidIn: BASE_RAID_COOLDOWN,
      },
    });
  },

  processNightRaidTick: (delta) => {
    const state = get();
    const raid = state.nightRaid.activeRaid;
    if (!raid) {
      let nextRaidIn = state.nightRaid.nextRaidIn - delta;
      if (nextRaidIn <= 0) {
        nextRaidIn = 0;
        state.startNightRaid();
        return;
      }
      if (nextRaidIn !== state.nightRaid.nextRaidIn) {
        set({
          nightRaid: {
            ...state.nightRaid,
            nextRaidIn,
          },
        });
      }
      return;
    }

    if (raid.phase === 'warning') {
      const newCountdown = raid.warningCountdown - delta;
      if (newCountdown <= 0) {
        set({
          nightRaid: {
            ...state.nightRaid,
            activeRaid: {
              ...raid,
              phase: 'preparing',
              warningCountdown: 0,
            },
          },
        });
      } else {
        set({
          nightRaid: {
            ...state.nightRaid,
            activeRaid: {
              ...raid,
              warningCountdown: newCountdown,
            },
          },
        });
      }
    } else if (raid.phase === 'preparing') {
      const newPrepTime = raid.preparationTime - delta;
      if (newPrepTime <= 0) {
        state.startNightRaidBattle();
      } else {
        set({
          nightRaid: {
            ...state.nightRaid,
            activeRaid: {
              ...raid,
              preparationTime: newPrepTime,
            },
          },
        });
      }
    }
  },

  checkForEnding: () => {
    const state = get();
    return checkEndingConditions(state);
  },

  triggerEnding: (endingType) => {
    const state = get();
    if (state.gameEnding) return;

    const factionRelations: Record<FactionType, number> = {} as Record<FactionType, number>;
    for (const [fid, faction] of Object.entries(state.factions)) {
      factionRelations[fid as FactionType] = faction.reputation;
    }

    const ending: GameEnding = {
      ending: endingType,
      triggeredAt: Date.now(),
      stats: {
        finalDay: Math.floor(state.day),
        totalWins: state.totalWins,
        totalLosses: state.totalLosses,
        finalPopulation: state.population,
        totalTrades: state.totalTrades,
        totalExpeditions: state.totalExpeditions,
        factionRelations,
      },
    };

    set({ gameEnding: ending });
  },

  processWeatherTick: (delta) => {
    const state = get();
    let seasonChanged = false;
    let weatherChanged = false;

    let newSeasonProgress = state.seasonProgress + delta;
    let newWeatherDuration = state.weatherDuration - delta;

    const seasonConfig = SEASONS[state.season];

    if (newSeasonProgress >= seasonConfig.duration) {
      const nextSeason = getNextSeason(state.season);
      const newWeather = selectWeatherForSeason(nextSeason);
      const newEffects = calculateWeatherEffects(nextSeason, newWeather);
      set({
        season: nextSeason,
        seasonProgress: 0,
        weather: newWeather,
        weatherDuration: getWeatherDuration(newWeather),
        trades: generateTrades(6, newEffects.tradeModifier, state.factions),
      });
      seasonChanged = true;
      weatherChanged = true;
    } else if (newWeatherDuration <= 0) {
      const newWeather = selectWeatherForSeason(state.season);
      const newEffects = calculateWeatherEffects(state.season, newWeather);
      set({
        seasonProgress: newSeasonProgress,
        weather: newWeather,
        weatherDuration: getWeatherDuration(newWeather),
        trades: generateTrades(6, newEffects.tradeModifier, state.factions),
      });
      weatherChanged = true;
    } else {
      set({
        seasonProgress: newSeasonProgress,
        weatherDuration: newWeatherDuration,
      });
    }

    return { seasonChanged, weatherChanged };
  },

  getGovernmentBonus: (effectType, target) => {
    const state = get();
    return calculateGovernmentBonus(state, effectType, target);
  },

  canResearchPolicy: (policyId) => {
    const state = get();
    const policy = getPolicyById(policyId);
    if (!policy) return { canResearch: false, reason: '未知政策' };

    if (state.government.completedPolicies.includes(policyId)) {
      return { canResearch: false, reason: '政策已实施' };
    }

    if (state.government.researchingPolicy?.policyId === policyId) {
      return { canResearch: false, reason: '政策研究中' };
    }

    if (!state.government.availablePolicies.includes(policyId)) {
      return { canResearch: false, reason: '政策未解锁' };
    }

    if (!state.government.unlockedPolicyCategories.includes(policy.category)) {
      return { canResearch: false, reason: `${policy.category}类政策未解锁` };
    }

    if (state.government.policyPoints < policy.cost) {
      return { canResearch: false, reason: `政策点不足（需要${policy.cost}）` };
    }

    if (policy.tier > 1) {
      const categoryPolicies = getPoliciesByCategory(policy.category);
      const lowerTierPolicies = categoryPolicies.filter((p) => p.tier < policy.tier);
      const completedInLower = lowerTierPolicies.filter((p) =>
        state.government.completedPolicies.includes(p.id)
      ).length;
      const lowerTierRequired = Math.max(1, Math.ceil(lowerTierPolicies.length * 0.5));
      if (completedInLower < lowerTierRequired) {
        return {
          canResearch: false,
          reason: `需要完成${lowerTierRequired}项低阶政策（已完成${completedInLower}/${lowerTierPolicies.length}）`,
        };
      }
    }

    if (policy.requires) {
      for (const req of policy.requires) {
        if (req.type === 'policy' && req.id) {
          if (!state.government.completedPolicies.includes(req.id)) {
            const reqPolicy = getPolicyById(req.id);
            return { canResearch: false, reason: `需要先实施：${reqPolicy?.name || req.id}` };
          }
        }
        if (req.type === 'trait' && req.attribute && req.minValue) {
          const chief = state.government.chieftain.current;
          const attrValue = chief ? chief.attributes[req.attribute] : 0;
          if (!chief || (attrValue ?? 0) < req.minValue) {
            return { canResearch: false, reason: `首领${getTraitName(req.attribute)}不足（需要${req.minValue}）` };
          }
        }
        if (req.type === 'day' && req.minValue) {
          if (state.day < req.minValue) {
            return { canResearch: false, reason: `需要${req.minValue}天后` };
          }
        }
      }
    }

    if (policy.mutuallyExclusive) {
      for (const exclusiveId of policy.mutuallyExclusive) {
        if (state.government.completedPolicies.includes(exclusiveId)) {
          const exclusivePolicy = getPolicyById(exclusiveId);
          return { canResearch: false, reason: `与已实施的${exclusivePolicy?.name || exclusiveId}冲突` };
        }
      }
    }

    return { canResearch: true };
  },

  startPolicyResearch: (policyId) => {
    const state = get();
    const check = state.canResearchPolicy(policyId);
    if (!check.canResearch) {
      return { success: false, message: check.reason || '无法研究' };
    }

    const policy = getPolicyById(policyId)!;
    const chief = state.government.chieftain.current;
    const stewardship = chief?.attributes.stewardship || 5;
    const total = getPolicyResearchTime(policy, stewardship);

    const newGovernment = {
      ...state.government,
      policyPoints: state.government.policyPoints - policy.cost,
      researchingPolicy: {
        policyId,
        progress: 0,
        total,
        startedAt: Date.now(),
      },
    };

    set({ government: newGovernment });
    return { success: true, message: `开始研究：${policy.name}` };
  },

  cancelPolicyResearch: () => {
    const state = get();
    if (!state.government.researchingPolicy) return;
    const policy = getPolicyById(state.government.researchingPolicy.policyId);
    const refund = policy ? Math.floor(policy.cost * 0.5) : 0;

    set({
      government: {
        ...state.government,
        researchingPolicy: null,
        policyPoints: Math.min(state.government.maxPolicyPoints, state.government.policyPoints + refund),
      },
    });
  },

  processPolicyResearch: (delta) => {
    const state = get();
    const researching = state.government.researchingPolicy;
    if (!researching) return;

    const chief = state.government.chieftain.current;
    const researchSpeedBonus = state.getGovernmentBonus('research_speed');
    const cunningBonus = chief?.attributes.cunning ? (chief.attributes.cunning - 5) * 0.02 : 0;
    const scaledDelta = delta * (1 + researchSpeedBonus) * (1 + cunningBonus);

    const newProgress = researching.progress + scaledDelta;

    if (newProgress >= researching.total) {
      const policy = getPolicyById(researching.policyId);
      if (!policy) {
        set({ government: { ...state.government, researchingPolicy: null } });
        return;
      }

      const newActivePolicy: ActivePolicy = {
        id: generateId(),
        policyId: policy.id,
        activatedAt: Date.now(),
        activatedDay: Math.floor(state.day),
      };

      const newCompleted = [...state.government.completedPolicies, policy.id];
      const newAvailable = [...state.government.availablePolicies];

      for (const p of POLICIES) {
        if (p.tier === policy.tier + 1 && !newAvailable.includes(p.id)) {
          const unlockedByThis = p.requires?.some(r => r.type === 'policy' && r.id === policy.id);
          if (unlockedByThis || (p.tier === policy.tier + 1 && policy.category === p.category)) {
            newAvailable.push(p.id);
          }
        }
      }

      const unlockNewCategory = policy.tier >= 2 && policy.category === 'military'
        && !state.government.unlockedPolicyCategories.includes('diplomacy');
      const unlockReligion = policy.tier >= 2 && (policy.category === 'culture')
        && !state.government.unlockedPolicyCategories.includes('religion');
      const unlockLaw = policy.tier >= 2 && (policy.category === 'economy')
        && !state.government.unlockedPolicyCategories.includes('law');

      let newCategories = [...state.government.unlockedPolicyCategories];
      if (unlockNewCategory) newCategories.push('diplomacy');
      if (unlockReligion) newCategories.push('religion');
      if (unlockLaw) newCategories.push('law');

      const newUnitPref = { ...state.government.unitPreference };
      if (chief) {
        newUnitPref.preferred = getPreferredWarriorType(chief.attributes);
      }

      const taxPolicyBonuses: Partial<Record<ResourceType, number>> = {};
      for (const effect of policy.effects) {
        if (effect.type.startsWith('tax_')) {
          const res = effect.type.replace('tax_', '') as ResourceType;
          taxPolicyBonuses[res] = (taxPolicyBonuses[res] || 0) + effect.value;
        }
      }

      const newTaxRates = { ...state.government.taxRates };
      for (const [res, bonus] of Object.entries(taxPolicyBonuses)) {
        newTaxRates[res as ResourceType] = Math.min(0.5, newTaxRates[res as ResourceType] + (bonus as number));
      }

      let loyaltyChange = 0;
      for (const effect of policy.effects) {
        if (effect.type === 'loyalty_boost') loyaltyChange += effect.value * 100;
      }
      const newLoyalty = Math.min(100, state.loyalty + loyaltyChange);

      set({
        government: {
          ...state.government,
          activePolicies: [...state.government.activePolicies, newActivePolicy],
          completedPolicies: newCompleted,
          availablePolicies: Array.from(new Set(newAvailable)),
          researchingPolicy: null,
          unlockedPolicyCategories: Array.from(new Set(newCategories)),
          unitPreference: newUnitPref,
          taxRates: newTaxRates,
        },
        loyalty: newLoyalty,
        recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
      });
    } else {
      set({
        government: {
          ...state.government,
          researchingPolicy: { ...researching, progress: newProgress },
        },
      });
    }
  },

  abdicateChieftain: (heirId) => {
    const state = get();
    const current = state.government.chieftain.current;
    if (!current) return { success: false, message: '无在位首领' };

    if (state.government.chieftain.inheritanceType === 'abdication' && current.age < 50) {
      return { success: false, message: '首领未满50岁，尚未到禅让之时' };
    }

    let selectedHeir: Heir | null = null;

    switch (state.government.chieftain.inheritanceType) {
      case 'hereditary':
        selectedHeir = state.government.chieftain.heirs
          .sort((a, b) => b.claimStrength - a.claimStrength)[0] || null;
        break;
      case 'election':
        selectedHeir = state.government.chieftain.heirs
          .sort((a, b) => b.support - a.support)[0] || null;
        break;
      case 'challenge':
        selectedHeir = state.government.chieftain.heirs
          .sort((a, b) => b.promisedAttributes.martial - a.promisedAttributes.martial)[0] || null;
        break;
      case 'abdication':
        selectedHeir = heirId
          ? state.government.chieftain.heirs.find(h => h.id === heirId) || null
          : state.government.chieftain.selectedHeirId
            ? state.government.chieftain.heirs.find(h => h.id === state.government.chieftain.selectedHeirId) || null
            : state.government.chieftain.heirs[0] || null;
        break;
    }

    if (!selectedHeir) {
      selectedHeir = generateHeirs(current, 1)[0];
    }

    const achievements = generateGovernmentAchievements(
      current,
      current.reignDays,
      state.totalWins,
      state.government.completedPolicies
    );

    const retiredChief: Chieftain = {
      ...current,
      reignDays: Math.floor(state.day) - current.startedDay,
      achievements,
      causeOfDeath: '禅让退位',
    };

    const newChief: Chieftain = {
      id: `chieftain-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: selectedHeir.name,
      title: getChiefTitleByTrait(selectedHeir.promisedAttributes),
      age: selectedHeir.age,
      maxAge: 65 + Math.floor(Math.random() * 25),
      traits: selectedHeir.traits,
      attributes: selectedHeir.promisedAttributes,
      personality: selectedHeir.personality,
      personalityDescription: `${selectedHeir.relation}${selectedHeir.name}，继承大统。`,
      icon: selectedHeir.avatar,
      startedDay: Math.floor(state.day),
      predecessorId: current.id,
      dynastyName: current.dynastyName,
      dynasty: current.dynastyName,
      reignDays: 0,
      achievements: [],
      avatar: selectedHeir.avatar,
    };

    const newHeirs = generateHeirs(newChief, 3);

    let newLoyalty = state.loyalty + INHERITANCE_CONFIGS[state.government.chieftain.inheritanceType].loyaltyModifier;
    newLoyalty = Math.max(0, Math.min(100, newLoyalty + (selectedHeir.support / 10)));

    const unlockedCats = [...state.government.unlockedPolicyCategories];
    if (newChief.attributes.diplomacy >= 5 && !unlockedCats.includes('diplomacy')) unlockedCats.push('diplomacy');
    if (newChief.attributes.piety >= 5 && !unlockedCats.includes('religion')) unlockedCats.push('religion');
    if (newChief.attributes.stewardship >= 6 && !unlockedCats.includes('law')) unlockedCats.push('law');

    set({
      government: {
        ...state.government,
        chieftain: {
          ...state.government.chieftain,
          current: newChief,
          history: [...state.government.chieftain.history, retiredChief],
          heirs: newHeirs,
          selectedHeirId: null,
          abdicationAvailable: newChief.age >= 50,
        },
        unitPreference: {
          primary: 'balanced',
          preferred: getPreferredWarriorType(newChief.attributes),
          bonus: {},
        },
        unlockedPolicyCategories: unlockedCats,
      },
      loyalty: newLoyalty,
      recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
    });

    return { success: true, message: `${newChief.name}继承首领之位！` };
  },

  selectHeir: (heirId) => {
    const state = get();
    const heir = state.government.chieftain.heirs.find(h => h.id === heirId);
    if (!heir) return { success: false, message: '继承人不存在' };

    set({
      government: {
        ...state.government,
        chieftain: {
          ...state.government.chieftain,
          selectedHeirId: heirId,
        },
      },
    });
    return { success: true, message: `已立${heir.name}为储君` };
  },

  changeInheritanceType: (type) => {
    const state = get();
    if (!state.government.chieftain.current) return { success: false, message: '无在位首领' };
    const chief = state.government.chieftain.current;

    let loyaltyCost = 0;
    if (type !== state.government.chieftain.inheritanceType) {
      switch (type) {
        case 'hereditary': loyaltyCost = -3; break;
        case 'election': loyaltyCost = 5; break;
        case 'challenge': loyaltyCost = -8; break;
        case 'abdication': loyaltyCost = 2; break;
      }
    }

    if (chief.attributes.charisma < 5 && loyaltyCost < 0) {
      return { success: false, message: '首领魅力不足，无法推动继承制改革' };
    }

    const newLoyalty = Math.max(0, Math.min(100, state.loyalty + loyaltyCost));

    set({
      government: {
        ...state.government,
        chieftain: {
          ...state.government.chieftain,
          inheritanceType: type,
        },
      },
      loyalty: newLoyalty,
      recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
    });

    return { success: true, message: `改为${INHERITANCE_CONFIGS[type].name}` };
  },

  adjustTaxRate: (resource, rate) => {
    const state = get();
    if (rate < 0 || rate > 0.5) return { success: false, message: '税率范围0%-50%' };

    const chief = state.government.chieftain.current;
    const maxRate = 0.2 + (chief?.attributes.stewardship || 5) * 0.03;
    if (rate > maxRate) {
      return { success: false, message: `首领管理能力上限${Math.floor(maxRate * 100)}%` };
    }

    const oldRate = state.government.taxRates[resource];
    const rateDiff = rate - oldRate;
    let loyaltyChange = -rateDiff * 200;

    const newLoyalty = Math.max(0, Math.min(100, state.loyalty + loyaltyChange));

    set({
      government: {
        ...state.government,
        taxRates: {
          ...state.government.taxRates,
          [resource]: rate,
        },
      },
      loyalty: newLoyalty,
      recruitEfficiency: calculateRecruitEfficiency(newLoyalty, state.activeEvents),
    });

    return { success: true, message: `调整${resource}税率为${Math.floor(rate * 100)}%` };
  },

  regenerateTribeName: () => {
    const newName = generateTribeName();
    set({ tribeName: newName });
    return newName;
  },

  refreshHeirs: () => {
    const state = get();
    const chief = state.government.chieftain.current;
    if (!chief) return;

    const newHeirs = generateHeirs(chief, 3);
    set({
      government: {
        ...state.government,
        chieftain: {
          ...state.government.chieftain,
          heirs: newHeirs,
          selectedHeirId: null,
        },
      },
    });
  },

  unlockPolicyCategory: (category) => {
    const state = get();
    if (state.government.unlockedPolicyCategories.includes(category)) {
      return { success: false, message: '该类政策已解锁' };
    }
    const cost = 40;
    if (state.government.policyPoints < cost) {
      return { success: false, message: `需要${cost}政策点` };
    }

    const categoryPolicies = getPoliciesByCategory(category).filter(p => p.tier === 1).map(p => p.id);

    set({
      government: {
        ...state.government,
        policyPoints: state.government.policyPoints - cost,
        unlockedPolicyCategories: [...state.government.unlockedPolicyCategories, category],
        availablePolicies: Array.from(new Set([...state.government.availablePolicies, ...categoryPolicies])),
      },
    });
    return { success: true, message: `解锁${POLICY_CATEGORIES[category]?.name || category}类政策` };
  },

  activatePolicy: (policyId) => {
    const state = get();
    if (!state.government.completedPolicies.includes(policyId)) {
      return { success: false, message: '政策尚未研究完成' };
    }
    if (state.government.activePolicies.some(ap => ap.policyId === policyId)) {
      return { success: false, message: '该政策已生效' };
    }
    const policy = getPolicyById(policyId);
    if (!policy) return { success: false, message: '未知政策' };

    if (policy.mutuallyExclusive?.some(id => state.government.activePolicies.some(ap => ap.policyId === id))) {
      return { success: false, message: '存在互斥政策' };
    }

    const newActive: ActivePolicy = {
      id: `active-${Date.now()}`,
      policyId,
      activatedAt: Date.now(),
      activatedDay: Math.floor(state.day),
    };

    set({
      government: {
        ...state.government,
        activePolicies: [...state.government.activePolicies, newActive],
      },
    });
    return { success: true, message: `${policy.name}已生效` };
  },

  deactivatePolicy: (policyId) => {
    const state = get();
    if (!state.government.activePolicies.some(ap => ap.policyId === policyId)) {
      return { success: false, message: '该政策未生效' };
    }
    const policy = getPolicyById(policyId);
    set({
      government: {
        ...state.government,
        activePolicies: state.government.activePolicies.filter(ap => ap.policyId !== policyId),
        policyCooldowns: {
          ...state.government.policyCooldowns,
          [policyId]: 30000,
        },
      },
    });
    return { success: true, message: `${policy?.name || policyId}已暂停` };
  },

  isPolicyActive: (policyId) => {
    return get().government.activePolicies.some(ap => ap.policyId === policyId);
  },

  setTaxRate: (resource, rate) => {
    const state = get();
    set({
      government: {
        ...state.government,
        taxRates: {
          ...state.government.taxRates,
          [resource]: Math.max(0, Math.min(0.5, rate)),
        },
      },
    });
  },

  setUnitPreference: (pref) => {
    const state = get();
    set({
      government: {
        ...state.government,
        unitPreference: pref,
      },
    });
  },

  abdicateChief: (heirId) => {
    return get().abdicateChieftain(heirId || '');
  },

  processGovernmentTick: (delta) => {
    const state = get();
    const gov = state.government;
    const chief = gov.chieftain.current;
    if (!chief) return;

    const secondsPerDay = 60;
    const dayIncrement = delta / secondsPerDay;

    const newReignDays = chief.reignDays + dayIncrement;
    const effectiveGov = state.government;
    const traitBonuses = calculateTraitBonus(chief.attributes);

    const pointGainPerDay = getPolicyPointGainPerDay(chief, effectiveGov.activePolicies);
    const researchBonus = effectiveGov.researchingPolicy ? 0 : 1;
    const pointGain = pointGainPerDay * dayIncrement * researchBonus;

    const newMaxPoints = getMaxPolicyPoints(state.day);
    let newPoints = Math.min(newMaxPoints, effectiveGov.policyPoints + pointGain);

    let newChiefAge = chief.age;
    let chiefDied = false;
    let deathCause = '';

    const ageTickChance = dayIncrement * 0.01;
    if (Math.random() < ageTickChance) {
      newChiefAge = chief.age + 1;
    }

    if (newChiefAge >= chief.maxAge) {
      chiefDied = true;
      deathCause = '寿终正寝';
    } else if (newChiefAge > 50 && Math.random() < 0.0005 * dayIncrement) {
      chiefDied = true;
      const causes = ['病逝', '意外身亡', '积劳成疾', '神秘死亡'];
      deathCause = causes[Math.floor(Math.random() * causes.length)];
    }

    const newReignBonus = getReignBonus(newReignDays);

    const reignBonuses = {
      totalDays: newReignDays,
      bonusAttack: newReignBonus.attackBonus,
      bonusProduction: newReignBonus.productionBonus,
      bonusLoyalty: newReignBonus.loyaltyBonus,
      dynastyRenown: newReignBonus.dynastyRenown,
    };

    let successionCrisis = gov.chieftain.successionCrisis;
    let crisisTimer = gov.chieftain.successionCrisisTimer;
    if (chiefDied) {
      if (!gov.chieftain.selectedHeirId && gov.chieftain.heirs.length === 0) {
        successionCrisis = true;
        crisisTimer = 60;
      }
    }

    const newTaxResources: Partial<Resources> = {};
    const taxTickChance = dayIncrement * 0.05;
    if (Math.random() < taxTickChance && state.population > 0) {
      const perPerson = 0.2;
      const pop = state.population;
      for (const [res, rate] of Object.entries(effectiveGov.taxRates) as [ResourceType, number][]) {
        const stewardshipBonus = 1 + traitBonuses.taxEfficiency;
        const amount = Math.floor(pop * perPerson * rate * stewardshipBonus);
        if (amount > 0) {
          newTaxResources[res] = amount;
        }
      }
    }

    if (Object.keys(newTaxResources).length > 0) {
      state.addResources(newTaxResources);
    }

    let newAbdication = gov.chieftain.abdicationAvailable;
    if (newChiefAge >= 50 && !gov.chieftain.abdicationAvailable) {
      newAbdication = true;
    }

    const prestigeGain = Math.floor(newReignDays / 30) * 0.1
      + (gov.completedPolicies.length * 0.5)
      + (state.totalWins * 0.3);

    set({
      government: {
        ...effectiveGov,
        chieftain: {
          ...gov.chieftain,
          current: {
            ...chief,
            age: newChiefAge,
            reignDays: newReignDays,
          },
          successionCrisis,
          successionCrisisTimer: crisisTimer,
          abdicationAvailable: newAbdication,
        },
        policyPoints: newPoints,
        maxPolicyPoints: newMaxPoints,
        policyPointRate: pointGainPerDay,
        reignBonuses,
        lastPolicyPointTick: Date.now(),
        prestige: Math.floor(prestigeGain),
      },
    });

    if (chiefDied && !successionCrisis) {
      const achievements = generateGovernmentAchievements(
        { ...chief, age: newChiefAge, reignDays: newReignDays },
        newReignDays,
        state.totalWins,
        effectiveGov.completedPolicies
      );

      const deceasedChief: Chieftain = {
        ...chief,
        age: newChiefAge,
        reignDays: newReignDays,
        achievements,
        causeOfDeath: deathCause,
      };

      let selectedHeir: Heir | null = null;

      if (gov.chieftain.selectedHeirId) {
        selectedHeir = gov.chieftain.heirs.find(h => h.id === gov.chieftain.selectedHeirId) || null;
      }

      if (!selectedHeir && gov.chieftain.heirs.length > 0) {
        switch (gov.chieftain.inheritanceType) {
          case 'hereditary':
            selectedHeir = [...gov.chieftain.heirs].sort((a, b) => b.claimStrength - a.claimStrength)[0];
            break;
          case 'election':
            selectedHeir = [...gov.chieftain.heirs].sort((a, b) => b.support - a.support)[0];
            break;
          case 'challenge':
            selectedHeir = [...gov.chieftain.heirs].sort((a, b) => b.promisedAttributes.martial - a.promisedAttributes.martial)[0];
            break;
          case 'abdication':
            selectedHeir = gov.chieftain.heirs[0];
            break;
        }
      }

      if (!selectedHeir) {
        selectedHeir = generateHeirs(deceasedChief, 1)[0];
      }

      const heirTraitList = selectedHeir.traits;
      const heirAttrs = selectedHeir.promisedAttributes;
      const newChiefInherited: Chieftain = {
        id: `chieftain-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: selectedHeir.name,
        title: getChiefTitleByTrait(heirAttrs),
        age: selectedHeir.age,
        maxAge: 65 + Math.floor(Math.random() * 25),
        traits: heirTraitList,
        attributes: heirAttrs,
        personality: selectedHeir.personality,
        personalityDescription: `${selectedHeir.relation}${selectedHeir.name}，在${deathCause}后继承首领之位。`,
        icon: selectedHeir.avatar,
        startedDay: Math.floor(state.day),
        predecessorId: chief.id,
        dynastyName: chief.dynastyName,
        dynasty: chief.dynastyName,
        reignDays: 0,
        achievements: [],
        avatar: selectedHeir.avatar,
      };

      const newHeirs = generateHeirs(newChiefInherited, 3);

      let inheritLoyalty = state.loyalty + INHERITANCE_CONFIGS[gov.chieftain.inheritanceType].loyaltyModifier;
      inheritLoyalty = Math.max(0, Math.min(100, inheritLoyalty + (selectedHeir.support / 12) - 5));

      const newUnlockedCats = [...gov.unlockedPolicyCategories];
      if (newChiefInherited.attributes.diplomacy >= 5 && !newUnlockedCats.includes('diplomacy')) newUnlockedCats.push('diplomacy');
      if (newChiefInherited.attributes.piety >= 5 && !newUnlockedCats.includes('religion')) newUnlockedCats.push('religion');
      if (newChiefInherited.attributes.stewardship >= 6 && !newUnlockedCats.includes('law')) newUnlockedCats.push('law');

      const availableAfter = [...gov.availablePolicies];
      for (const p of POLICIES) {
        if (p.tier === 1 && !availableAfter.includes(p.id) && newUnlockedCats.includes(p.category)) {
          availableAfter.push(p.id);
        }
      }

      set({
        government: {
          ...effectiveGov,
          chieftain: {
            ...gov.chieftain,
            current: newChiefInherited,
            history: [...gov.chieftain.history, deceasedChief],
            heirs: newHeirs,
            selectedHeirId: null,
          },
          unitPreference: {
            primary: 'balanced',
            preferred: getPreferredWarriorType(newChiefInherited.attributes),
            bonus: {},
          },
          unlockedPolicyCategories: Array.from(new Set(newUnlockedCats)),
          availablePolicies: Array.from(new Set(availableAfter)),
        },
        loyalty: inheritLoyalty,
        recruitEfficiency: calculateRecruitEfficiency(inheritLoyalty, state.activeEvents),
      });
    }
  },

  tick: (delta) => {
    const state = get();

    if (state.gameEnding) return;

    state.processWeatherTick(delta);

    const collected = state.collectResources();
    for (const [key, amount] of Object.entries(collected)) {
      if ((amount as number) > 0) {
        state.updateTaskProgress('collect_resource', Math.floor(amount as number), key);
      }
    }

    state.processTraining(delta);
    state.processPopulationTick(delta);
    state.processEventTick(delta);
    state.processExpeditionTick(delta);
    state.processResearch(delta);
    state.processTaskTick(delta);
    state.processDiplomaticTick(delta);
    state.processAllyReinforcementsTick(delta);
    state.processTransportTick(delta);
    state.processSpoilageTick(delta);
    state.processTotemTick(delta);
    state.processNightRaidTick(delta);
    state.processPolicyResearch(delta);
    state.processGovernmentTick(delta);
    state.processCaravanTick(delta);
    state.processBlackMarketTick(delta);
    state.processPriceFluctuationTick(delta);
    state.processStockRefreshTick(delta);
    state.processBuildQueue(delta);

    const ending = state.checkForEnding();
    if (ending) {
      state.triggerEnding(ending);
    }

    let capacityChanged = false;
    const newBuildings = state.buildings.map((b) => {
      if (b.isBuilding && b.buildProgress < 100) {
        const newProgress = Math.min(100, b.buildProgress + delta * 10);
        const wasBuilding = b.isBuilding;
        const isNowBuilding = newProgress < 100;
        if (wasBuilding && !isNowBuilding) {
          capacityChanged = true;
        }
        return { ...b, buildProgress: newProgress, isBuilding: isNowBuilding };
      }
      return b;
    });

    if (capacityChanged) {
      set({
        resourceCapacity: calculateResourceCapacity(newBuildings, state.technologies),
        totem: {
          ...state.totem,
          maxFaith: getMaxFaith(newBuildings),
          accumulation: {
            ...state.totem.accumulation,
            perSecond: getFaithPerSecond(newBuildings, state.totem.unlockedTotems),
          },
        },
        maxCaravans: get().getMaxCaravans(),
      });
    }

    const newRoutes = state.tradeRoutes.map((route) => {
      if (route.unlocked) return route;
      const faction = route.destinationFaction ? state.factions[route.destinationFaction] : null;
      const reputation = faction?.reputation ?? 0;
      const unlocked = state.day >= route.unlockDay && 
        (!route.requiredReputation || reputation >= route.requiredReputation);
      return unlocked ? { ...route, unlocked: true } : route;
    });

    if (newRoutes.some((r, i) => r.unlocked !== state.tradeRoutes[i].unlocked)) {
      set({ tradeRoutes: newRoutes });
    }

    let newInvasion = state.invasion;
    if (newInvasion?.isActive) {
      const newCountdown = newInvasion.countdown - delta;
      if (newCountdown <= 0) {
        state.fightBattle();
        newInvasion = null;
      } else {
        newInvasion = { ...newInvasion, countdown: newCountdown };
      }
    }

    set({
      buildings: newBuildings,
      day: state.day + delta / 60,
      invasion: newInvasion,
      lastOnlineTime: Date.now(),
    });
  },

  saveGame: () => {
    const state = get();
    const toSave = { ...state, lastSave: Date.now() };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
      set({ lastSave: Date.now() });
    } catch (e) {
      console.error('Failed to save:', e);
    }
  },

  resetGame: () => {
    localStorage.removeItem(SAVE_KEY);
    set(createInitialState());
  },

  setTribeName: (name) => set({ tribeName: name }),

  getMaxCaravans: () => {
    const state = get();
    const caravanseraiCount = state.buildings.filter(
      (b) => b.type === 'caravanserai' && !b.isBuilding
    ).length;
    return CARAVAN_CONFIG.maxCaravansBase + caravanseraiCount * CARAVAN_CONFIG.maxCaravansPerCaravanserai;
  },

  getCargoCapacity: () => {
    const state = get();
    const caravanseraiLevel = state.buildings
      .filter((b) => b.type === 'caravanserai' && !b.isBuilding)
      .reduce((max, b) => Math.max(max, b.level), 0);
    return CARAVAN_CONFIG.baseCargoCapacity + caravanseraiLevel * CARAVAN_CONFIG.caravanseraiCapacityBonus;
  },

  checkBuildingRequirements: (type) => {
    const state = get();
    return checkBuildReqs(type, state.buildings, state.day, state.population);
  },

  canBuild: (type) => {
    const state = get();
    const config = BUILDINGS[type];
    if (!config) return { canBuild: false, reason: '建筑不存在' };

    const { met, missing } = checkBuildReqs(type, state.buildings, state.day, state.population);
    if (!met) {
      return { canBuild: false, reason: getRequirementDescription(missing[0]) };
    }

    if (state.buildQueue.length >= state.maxBuildQueueSize) {
      return { canBuild: false, reason: '施工队列已满' };
    }

    const cost = getBuildingCost(type, 0);
    const costBonus = calculateTechBonus(state.technologies, 'resource_cost');
    const actualCost: Partial<Resources> = {};
    for (const [key, amount] of Object.entries(cost)) {
      actualCost[key as keyof Resources] = Math.floor((amount as number) * (1 + costBonus));
    }

    if (!state.canAfford(actualCost)) {
      return { canBuild: false, reason: '资源不足' };
    }

    return { canBuild: true };
  },

  addToBuildQueue: (type, buildingType, x, y, buildingId) => {
    const state = get();
    const config = BUILDINGS[buildingType];
    if (!config) return false;

    if (state.buildQueue.length >= state.maxBuildQueueSize) return false;

    let targetLevel = 1;
    let totalTime = getBuildTime(buildingType);
    let cost = getBuildingCost(buildingType, 0);

    if (type === 'upgrade' && buildingId) {
      const building = state.buildings.find((b) => b.id === buildingId);
      if (!building || building.level >= config.maxLevel) return false;
      targetLevel = building.level + 1;
      totalTime = getUpgradeTime(buildingType, building.level);
      cost = getBuildingCost(buildingType, building.level);
    }

    const costBonus = calculateTechBonus(state.technologies, 'resource_cost');
    const actualCost: Partial<Resources> = {};
    for (const [key, amount] of Object.entries(cost)) {
      actualCost[key as keyof Resources] = Math.floor((amount as number) * (1 + costBonus));
    }

    if (!state.spendResources(actualCost)) return false;

    const constructionSpeedBonus = state.getGovernmentBonus('construction_speed');
    const adjustedTime = Math.max(1, Math.floor(totalTime * (1 - constructionSpeedBonus)));

    const queueItem: BuildQueueItem = {
      id: generateId(),
      type,
      buildingType,
      buildingId,
      targetLevel,
      x,
      y,
      progress: 0,
      totalTime: adjustedTime,
      cost: actualCost,
    };

    set({ buildQueue: [...state.buildQueue, queueItem] });
    return true;
  },

  cancelBuildQueueItem: (itemId) => {
    const state = get();
    const item = state.buildQueue.find((i) => i.id === itemId);
    if (!item) return false;

    const refund: Partial<Resources> = {};
    const progressRatio = item.progress / item.totalTime;
    const refundRatio = Math.max(0, 1 - progressRatio * 0.5);

    for (const [key, amount] of Object.entries(item.cost)) {
      refund[key as keyof Resources] = Math.floor((amount as number) * refundRatio * 0.5);
    }

    state.addResources(refund);

    const newQueue = state.buildQueue.filter((i) => i.id !== itemId);
    set({ buildQueue: newQueue });
    return true;
  },

  processBuildQueue: (delta) => {
    const state = get();
    if (state.buildQueue.length === 0) return;

    const newQueue = [...state.buildQueue];
    const completedItems: BuildQueueItem[] = [];

    const firstItem = newQueue[0];
    const constructionSpeedBonus = state.getGovernmentBonus('construction_speed');
    const actualDelta = delta * (1 + constructionSpeedBonus);

    firstItem.progress += actualDelta;

    if (firstItem.progress >= firstItem.totalTime) {
      completedItems.push(firstItem);
      newQueue.shift();
    }

    let newBuildings = [...state.buildings];
    let newUnlocked = [...state.unlockedBuildings];

    for (const item of completedItems) {
      if (item.type === 'build' && item.x !== undefined && item.y !== undefined) {
        const newBuilding: Building = {
          id: generateId(),
          type: item.buildingType,
          level: 1,
          x: item.x,
          y: item.y,
          isBuilding: false,
          buildProgress: 100,
          lastCollect: Date.now(),
          storage: {},
        };
        newBuildings.push(newBuilding);

        const { met } = checkBuildReqs(item.buildingType, newBuildings, state.day, state.population);
        if (met && !newUnlocked.includes(item.buildingType)) {
          newUnlocked.push(item.buildingType);
        }

        const unlockable = getUnlockableBldgs(newBuildings, state.day, state.population, newUnlocked);
        for (const bType of unlockable) {
          if (!newUnlocked.includes(bType)) {
            newUnlocked.push(bType);
          }
        }

        state.updateTaskProgress('build_buildings', 1, item.buildingType);
      } else if (item.type === 'upgrade' && item.buildingId) {
        newBuildings = newBuildings.map((b) => {
          if (b.id !== item.buildingId) return b;
          return { ...b, level: item.targetLevel, isBuilding: false, buildProgress: 100 };
        });

        const building = newBuildings.find((b) => b.id === item.buildingId);
        if (building) {
          if (building.type === 'townhall') {
            const unlockable = getUnlockableBldgs(newBuildings, state.day, state.population, newUnlocked);
            for (const bType of unlockable) {
              if (!newUnlocked.includes(bType)) {
                newUnlocked.push(bType);
              }
            }
          }
        }

        state.updateTaskProgress('upgrade_buildings', 1);
      }
    }

    if (completedItems.length > 0 || newQueue.length !== state.buildQueue.length) {
      const newTotem = {
        ...state.totem,
        maxFaith: getMaxFaith(newBuildings),
        accumulation: {
          ...state.totem.accumulation,
          perSecond: getFaithPerSecond(newBuildings, state.totem.unlockedTotems),
        },
      };

      set({
        buildQueue: newQueue,
        buildings: newBuildings,
        unlockedBuildings: newUnlocked,
        maxPopulation: calculateMaxPopulation(newBuildings, state.technologies),
        resourceCapacity: calculateResourceCapacity(newBuildings, state.technologies),
        resources: calculateTotalResources(newBuildings),
        totem: newTotem,
      });
    } else if (newQueue[0]?.progress !== state.buildQueue[0]?.progress) {
      set({ buildQueue: newQueue });
    }
  },

  getProductionEstimate: (type, level) => {
    return getProdEstimate(type, level);
  },

  getUpgradeHints: () => {
    const state = get();
    return getUpgHints(state.buildings, state.resources);
  },

  getUnlockableBuildings: () => {
    const state = get();
    return getUnlockableBldgs(state.buildings, state.day, state.population, state.unlockedBuildings);
  },

  startCaravan: (routeId, cargo, warriorIds) => {
    const state = get();
    const route = state.tradeRoutes.find((r) => r.id === routeId);
    
    if (!route || !route.unlocked) {
      return { success: false, message: '该贸易路线未解锁' };
    }

    if (state.activeCaravanCount >= state.getMaxCaravans()) {
      return { success: false, message: '已达最大商队数量' };
    }

    if (warriorIds.length < CARAVAN_CONFIG.baseWarriorRequirement) {
      return { success: false, message: `至少需要${CARAVAN_CONFIG.baseWarriorRequirement}名战士护送` };
    }

    const totalCargo = Object.values(cargo).reduce((sum, v) => sum + (v || 0), 0);
    if (totalCargo === 0) {
      return { success: false, message: '请选择要运送的货物' };
    }

    if (totalCargo > state.getCargoCapacity()) {
      return { success: false, message: '超出货物容量' };
    }

    for (const [resource, amount] of Object.entries(cargo)) {
      if (amount && amount > 0) {
        if (state.resources[resource as keyof Resources] < amount) {
          return { success: false, message: `${resource}资源不足` };
        }
      }
    }

    for (const [resource, amount] of Object.entries(cargo)) {
      if (amount && amount > 0) {
        state.spendResources({ [resource]: amount });
      }
    }

    const caravan: Caravan = {
      id: generateId(),
      name: `商队-${Date.now()}`,
      routeId,
      status: 'traveling',
      cargo,
      gold: 0,
      warriorIds,
      progress: 0,
      totalTime: route.travelTime,
      startedAt: Date.now(),
      currentRisk: null,
      riskResolved: false,
      profit: {},
      log: [`🚚 商队出发前往${route.destination}`],
    };

    const logEntry: CaravanLogEntry = {
      id: generateId(),
      caravanId: caravan.id,
      timestamp: Date.now(),
      day: Math.floor(state.day),
      message: `商队出发前往${route.destination}`,
      type: 'info',
    };

    set({
      caravans: [...state.caravans, caravan],
      caravanLogs: [...state.caravanLogs, logEntry],
      activeCaravanCount: state.activeCaravanCount + 1,
    });

    return { success: true, message: `商队已出发前往${route.destination}` };
  },

  cancelCaravan: (caravanId) => {
    const state = get();
    const caravan = state.caravans.find((c) => c.id === caravanId);
    
    if (!caravan || caravan.status !== 'traveling') {
      return false;
    }

    const refundRatio = 0.5 + (1 - caravan.progress / caravan.totalTime) * 0.5;
    const refund: Partial<Resources> = {};
    for (const [resource, amount] of Object.entries(caravan.cargo)) {
      if (amount) {
        refund[resource as keyof Resources] = Math.floor(amount * refundRatio);
      }
    }
    state.addResources(refund);

    const logEntry: CaravanLogEntry = {
      id: generateId(),
      caravanId,
      timestamp: Date.now(),
      day: Math.floor(state.day),
      message: '商队中途返回，部分货物损失',
      type: 'warning',
    };

    set({
      caravans: state.caravans.filter((c) => c.id !== caravanId),
      caravanLogs: [...state.caravanLogs, logEntry],
      activeCaravanCount: state.activeCaravanCount - 1,
    });

    return true;
  },

  resolveCaravanRisk: (caravanId, fight) => {
    const state = get();
    const caravan = state.caravans.find((c) => c.id === caravanId);
    
    if (!caravan || !caravan.currentRisk || caravan.riskResolved) {
      return { success: false, message: '没有待处理的风险事件' };
    }

    const risk = caravan.currentRisk;
    let message = '';
    const log: string[] = [...caravan.log];
    const newCargo = { ...caravan.cargo };
    let newProfit = { ...caravan.profit };
    let newGold = caravan.gold;
    let newWarriorIds = [...caravan.warriorIds];

    if (fight) {
      const winChance = 0.4 + (caravan.warriorIds.length * 0.1);
      const won = Math.random() < winChance;
      
      if (won) {
        message = `${risk.icon} 成功击退${risk.name}！`;
        log.push(`⚔️ ${message}`);
        const lootGold = Math.floor(Math.random() * 50) + 20;
        newGold += lootGold;
        log.push(`💰 获得${lootGold}金币作为战利品`);
      } else {
        message = `${risk.icon} 未能击退${risk.name}，损失惨重！`;
        log.push(`💔 ${message}`);
        for (const [resource, lossPercent] of Object.entries(risk.resourceLossPercent)) {
          const current = newCargo[resource as ResourceType] || 0;
          const loss = Math.floor(current * lossPercent);
          newCargo[resource as ResourceType] = current - loss;
          log.push(`📉 损失${loss}单位${resource}`);
        }
        newGold = Math.max(0, newGold - risk.goldLoss);
        if (Math.random() < risk.warriorCasualtyChance && newWarriorIds.length > 0) {
          const casualtyIndex = Math.floor(Math.random() * newWarriorIds.length);
          const casualtyId = newWarriorIds[casualtyIndex];
          newWarriorIds.splice(casualtyIndex, 1);
          set({ warriors: state.warriors.filter((w) => w.id !== casualtyId) });
          log.push(`☠️ 一名战士在战斗中牺牲`);
        }
      }
    } else {
      message = `${risk.icon} 选择规避${risk.name}，缴纳过路费`;
      log.push(`🚶 ${message}`);
      const toll = Math.floor(risk.goldLoss * 0.8);
      newGold = Math.max(0, newGold - toll);
      log.push(`💸 支付${toll}金币过路费`);
      if (risk.reputationChange < 0 && caravan.warriorIds.length > 0) {
        const casualtyChance = risk.warriorCasualtyChance * 0.5;
        if (Math.random() < casualtyChance) {
          const casualtyIndex = Math.floor(Math.random() * newWarriorIds.length);
          const casualtyId = newWarriorIds[casualtyIndex];
          newWarriorIds.splice(casualtyIndex, 1);
          set({ warriors: state.warriors.filter((w) => w.id !== casualtyId) });
          log.push(`☠️ 一名战士在规避途中受伤`);
        }
      }
    }

    const logEntry: CaravanLogEntry = {
      id: generateId(),
      caravanId,
      timestamp: Date.now(),
      day: Math.floor(state.day),
      message,
      type: fight ? (message.includes('成功') ? 'success' : 'danger') : 'warning',
    };

    const updatedCaravan = {
      ...caravan,
      cargo: newCargo,
      profit: newProfit,
      gold: newGold,
      warriorIds: newWarriorIds,
      currentRisk: null,
      riskResolved: true,
      log,
    };

    set({
      caravans: state.caravans.map((c) => (c.id === caravanId ? updatedCaravan : c)),
      caravanLogs: [...state.caravanLogs, logEntry],
    });

    return { success: true, message };
  },

  addCaravanLog: (caravanId, message, type) => {
    const state = get();
    const logEntry: CaravanLogEntry = {
      id: generateId(),
      caravanId,
      timestamp: Date.now(),
      day: Math.floor(state.day),
      message,
      type,
    };
    set({ caravanLogs: [...state.caravanLogs, logEntry] });
  },

  processCaravanTick: (delta) => {
    const state = get();
    const now = Date.now();
    let updated = false;
    const updatedCaravans: Caravan[] = [];

    for (const caravan of state.caravans) {
      if (caravan.status === 'completed' || caravan.status === 'failed') {
        updatedCaravans.push(caravan);
        continue;
      }

      if (caravan.currentRisk) {
        updatedCaravans.push(caravan);
        continue;
      }

      const route = state.tradeRoutes.find((r) => r.id === caravan.routeId);
      if (!route) {
        updatedCaravans.push(caravan);
        continue;
      }

      let newProgress = caravan.progress + delta;
      const newLog = [...caravan.log];
      let newStatus: CaravanStatus = caravan.status;
      let newRisk: RiskEvent | null = caravan.currentRisk;
      let newRiskResolved = caravan.riskResolved;
      let newProfit = { ...caravan.profit };
      let newCargo = { ...caravan.cargo };
      let newGold = caravan.gold;
      let newTotalTime = caravan.totalTime;

      const midPoint = caravan.totalTime * 0.5;
      const nearMidPoint = newProgress >= midPoint && caravan.progress < midPoint;
      
      if (nearMidPoint && !newRiskResolved && route.riskEvents.length > 0) {
        const hasCaravanserai = state.buildings.some(
          (b) => b.type === 'caravanserai' && !b.isBuilding
        );
        
        for (const riskEventId of route.riskEvents) {
          const riskEvent = RISK_EVENTS[riskEventId];
          if (!riskEvent) continue;
          
          const chance = getRiskChance(
            riskEvent,
            route.difficulty,
            hasCaravanserai,
            caravan.warriorIds.length
          );
          
          if (Math.random() < chance) {
            newRisk = riskEvent;
            newLog.push(`⚠️ 遭遇${riskEvent.icon} ${riskEvent.name}！`);
            const logEntry: CaravanLogEntry = {
              id: generateId(),
              caravanId: caravan.id,
              timestamp: now,
              day: Math.floor(state.day),
              message: `遭遇${riskEvent.name}`,
              type: 'danger',
            };
            set({ caravanLogs: [...state.caravanLogs, logEntry] });
            updated = true;
            break;
          }
        }
      }

      if (newProgress >= caravan.totalTime && newStatus === 'traveling') {
        newStatus = 'trading';
        newLog.push(`📍 到达${route.destination}，开始交易`);
        
        const priceBonus = calculateRoutePriceBonus(route, state.priceFluctuations, state.factions);
        for (const [resource, amount] of Object.entries(newCargo)) {
          if (amount && amount > 0) {
            const isDemand = route.resourceDemand.includes(resource as ResourceType);
            const sellBonus = isDemand ? (1 + priceBonus + 0.2) : (1 + priceBonus);
            const goldValue = Math.floor(amount * 5 * sellBonus);
            newGold += goldValue;
            newProfit.gold = (newProfit.gold || 0) + goldValue;
            newLog.push(`💰 出售${amount}${resource}，获得${goldValue}金币`);
          }
        }
        newCargo = {};

        for (const supplyResource of route.resourceSupply) {
          const buyPrice = 5 * (1 - priceBonus * 0.5);
          const buyAmount = Math.floor(newGold / buyPrice * 0.6);
          if (buyAmount > 0) {
            const cost = Math.floor(buyAmount * buyPrice);
            newGold -= cost;
            newCargo[supplyResource] = (newCargo[supplyResource] || 0) + buyAmount;
            newLog.push(`📦 购买${buyAmount}${supplyResource}，花费${cost}金币`);
          }
        }

        newProgress = 0;
        newTotalTime = route.travelTime;
        newStatus = 'returning';
        newLog.push(`🔄 启程返回部落`);
      }

      if (newStatus === 'returning' && newProgress >= newTotalTime) {
        newStatus = 'completed';
        newLog.push(`🏠 商队返回部落，交易完成！`);
        
        for (const [resource, amount] of Object.entries(newCargo)) {
          if (amount && amount > 0) {
            state.addResources({ [resource]: amount });
            newLog.push(`📥 卸货${amount}${resource}`);
          }
        }
        if (newGold > 0) {
          state.addResources({ gold: newGold });
          newLog.push(`💰 入账${newGold}金币`);
        }

        const logEntry: CaravanLogEntry = {
          id: generateId(),
          caravanId: caravan.id,
          timestamp: now,
          day: Math.floor(state.day),
          message: '商队完成交易返回',
          type: 'success',
        };
        set({
          caravanLogs: [...state.caravanLogs, logEntry],
          activeCaravanCount: state.activeCaravanCount - 1,
        });
      }

      updatedCaravans.push({
        ...caravan,
        progress: newProgress,
        status: newStatus,
        log: newLog,
        currentRisk: newRisk,
        riskResolved: newRiskResolved,
        profit: newProfit,
        cargo: newCargo,
        gold: newGold,
      });
      updated = true;
    }

    if (updated) {
      set({ caravans: updatedCaravans });
    }
  },

  startNegotiation: (tradeId) => {
    const state = get();
    if (state.currentNegotiation) return false;
    
    const trade = state.trades.find((t) => t.id === tradeId);
    if (!trade || trade.stock <= 0) return false;

    const negotiation: NegotiationState = {
      tradeId,
      attempts: 0,
      maxAttempts: NEGOTIATION_CONFIG.maxAttempts,
      currentModifier: trade.currentPriceMultiplier,
      opponentMood: 0.8,
      successThreshold: NEGOTIATION_CONFIG.baseSuccessChance,
    };

    set({ currentNegotiation: negotiation });
    return true;
  },

  attemptNegotiation: (aggressive) => {
    const state = get();
    const negotiation = state.currentNegotiation;
    if (!negotiation) {
      return { success: false, message: '没有进行中的议价' };
    }

    if (negotiation.attempts >= negotiation.maxAttempts) {
      return { success: false, message: '议价次数已用完' };
    }

    const trade = state.trades.find((t) => t.id === negotiation.tradeId);
    if (!trade) {
      return { success: false, message: '交易不存在' };
    }

    const successChance = negotiation.successThreshold * negotiation.opponentMood * (aggressive ? 0.8 : 1.2);
    const success = Math.random() < successChance;
    
    const improvement = NEGOTIATION_CONFIG.minPriceImprovement + 
      Math.random() * (NEGOTIATION_CONFIG.maxPriceImprovement - NEGOTIATION_CONFIG.minPriceImprovement);
    
    let newModifier = negotiation.currentModifier;
    let message = '';

    if (success) {
      if (trade.type === 'buy') {
        newModifier = Math.max(0.5, newModifier * (1 - improvement));
        message = `🎉 议价成功！价格降低${Math.round(improvement * 100)}%`;
      } else {
        newModifier = Math.min(2.0, newModifier * (1 + improvement));
        message = `🎉 议价成功！价格提高${Math.round(improvement * 100)}%`;
      }
    } else {
      message = aggressive ? '😤 对方被激怒了，拒绝继续议价' : '😐 对方不为所动';
    }

    const newMood = negotiation.opponentMood - NEGOTIATION_CONFIG.moodDecayPerAttempt * (aggressive ? 1.5 : 1);
    
    const updatedNegotiation: NegotiationState = {
      ...negotiation,
      attempts: negotiation.attempts + 1,
      currentModifier: newModifier,
      opponentMood: Math.max(0.1, newMood),
      successThreshold: negotiation.successThreshold * (aggressive ? 0.9 : 1.05),
    };

    const updatedTrades = state.trades.map((t) => {
      if (t.id === trade.id) {
        const ratioDiff = newModifier / t.currentPriceMultiplier;
        return {
          ...t,
          currentPriceMultiplier: newModifier,
          give: {
            ...t.give,
            amount: Math.floor(t.give.amount * (trade.type === 'sell' ? ratioDiff : 1)),
          },
          receive: {
            ...t.receive,
            amount: Math.floor(t.receive.amount * (trade.type === 'buy' ? (1 / ratioDiff) : 1)),
          },
        };
      }
      return t;
    });

    set({
      currentNegotiation: success && negotiation.attempts + 1 < negotiation.maxAttempts ? updatedNegotiation : null,
      trades: updatedTrades,
    });

    return { success, message, newModifier };
  },

  cancelNegotiation: () => {
    set({ currentNegotiation: null });
  },

  acceptBlackMarketOffer: (offerId) => {
    const state = get();
    const offer = state.blackMarketOffers.find((o) => o.id === offerId);
    if (!offer || offer.isDiscovered) {
      return { success: false, message: '该黑市交易不可用' };
    }

    const trade = offer.tradeOffer;
    if (trade.stock <= 0) {
      return { success: false, message: '库存不足' };
    }

    if (state.resources[trade.give.resource] < trade.give.amount) {
      return { success: false, message: '资源不足' };
    }

    const detectionChance = offer.detectionChance + state.wantedLevel * 0.05;
    const detected = Math.random() < detectionChance;
    
    state.spendResources({ [trade.give.resource]: trade.give.amount });
    state.addResources({ [trade.receive.resource]: trade.receive.amount });

    if (detected) {
      const newWantedLevel = Math.min(5, state.wantedLevel + 1);
      let totalRepLoss = 0;
      for (const faction of Object.values(state.factions)) {
        if (faction.stance === 'friendly' || faction.stance === 'ally') {
          state.changeFactionReputation(faction.id, -offer.reputationPenalty);
          totalRepLoss += offer.reputationPenalty;
        }
      }
      const goldFine = Math.floor(state.resources.gold * 0.1);
      if (goldFine > 0) {
        state.spendResources({ gold: goldFine });
      }
      set({
        blackMarketOffers: state.blackMarketOffers.map((o) =>
          o.id === offerId ? { ...o, isDiscovered: true } : o
        ),
        wantedLevel: newWantedLevel,
      });
      return { 
        success: true, 
        message: `交易完成，但被发现！罚款${goldFine}金币，声望下降${totalRepLoss}，通缉等级+1` 
      };
    }

    set({
      blackMarketOffers: state.blackMarketOffers.map((o) =>
        o.id === offerId
          ? { ...o, tradeOffer: { ...trade, stock: trade.stock - 1 } }
          : o
      ),
    });

    return { success: true, message: '黑市交易成功完成' };
  },

  refreshBlackMarket: () => {
    const state = get();
    const cost = 30;
    if (state.resources.gold < cost) {
      return false;
    }

    state.spendResources({ gold: cost });
    const offers = [];
    for (let i = 0; i < 3; i++) {
      offers.push(generateBlackMarketOffer(state.priceFluctuations, Math.floor(state.day)));
    }

    set({ 
      blackMarketOffers: offers,
      lastBlackMarketRefresh: Date.now(),
    });
    return true;
  },

  processBlackMarketTick: (delta) => {
    const state = get();
    const now = Date.now();
    
    const validOffers = state.blackMarketOffers.filter(
      (o) => !o.isDiscovered && now < o.expiresAt && o.tradeOffer.stock > 0
    );

    if (validOffers.length !== state.blackMarketOffers.length) {
      set({ blackMarketOffers: validOffers });
    }

    if (validOffers.length === 0 && Math.random() < 0.001 * delta) {
      const offers = [];
      for (let i = 0; i < 2; i++) {
        offers.push(generateBlackMarketOffer(state.priceFluctuations, Math.floor(state.day)));
      }
      set({ blackMarketOffers: offers });
    }
  },

  processPriceFluctuationTick: (_delta) => {
    const state = get();
    const now = Date.now();
    const updated = updatePriceFluctuations(state.priceFluctuations, now);
    
    let changed = false;
    for (const resource of Object.keys(updated) as ResourceType[]) {
      if (updated[resource].currentMultiplier !== state.priceFluctuations[resource].currentMultiplier) {
        changed = true;
        break;
      }
    }

    if (changed) {
      set({ priceFluctuations: updated });
    }
  },

  processStockRefreshTick: (_delta) => {
    const state = get();
    const now = Date.now();
    const timeSinceRefresh = now - state.lastStockRefresh;
    const intervalMs = state.stockRefreshInterval * 1000;

    if (timeSinceRefresh >= intervalMs) {
      const refreshedTrades = refreshStocks(state.trades);
      set({
        trades: refreshedTrades,
        lastStockRefresh: now,
      });
    }
  },

  unlockTradeRoute: (routeId) => {
    const state = get();
    const route = state.tradeRoutes.find((r) => r.id === routeId);
    if (!route || route.unlocked) return false;

    const faction = route.destinationFaction ? state.factions[route.destinationFaction] : null;
    const reputation = faction?.reputation ?? 0;
    
    if (state.day < route.unlockDay) return false;
    if (route.requiredReputation && reputation < route.requiredReputation) return false;

    set({
      tradeRoutes: state.tradeRoutes.map((r) =>
        r.id === routeId ? { ...r, unlocked: true } : r
      ),
    });
    return true;
  },
}));

setInterval(() => {
  useGameStore.getState().saveGame();
}, 30000);
