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
} from '../types';
import { BUILDINGS, getBuildingCost, getBuildingProduction, getBuildingStorageCapacity } from '../data/buildings';
import { WARRIORS } from '../data/warriors';
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
    trades: generateTrades(6),
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
    factions: createInitialFactions(),
    activeDiplomaticEvents: [],
    diplomaticEventCooldown: getDiplomaticEventInterval(),
    allyReinforcements: [],
    totalTrades: 0,
    gameEnding: null,
    totem: createInitialTotemState(),
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

  startInvasion: () => void;
  fightBattle: () => { result: 'victory' | 'defeat'; log: string[] };

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

  tick: (delta: number) => void;
  saveGame: () => void;
  resetGame: () => void;
  setTribeName: (name: string) => void;
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
      const totalProdBonus = 1 + prodTechBonus + globalProdTechBonus + prodTotemBonus + globalProdTotemBonus;

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
    const weatherEffects = state.getWeatherEffects();
    const weatherTrainBonus = weatherEffects.trainingSpeedModifier;
    const scaledDelta = delta * efficiency * (1 + trainSpeedTechBonus + trainSpeedTotemBonus + weatherTrainBonus);

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

  startInvasion: () => {
    const state = get();
    if (state.invasion?.isActive) return;

    const wave = Math.floor(state.day / 2) + 1;
    const invader = generateInvasion(wave, state.factions);
    const weatherEffects = state.getWeatherEffects();
    const invasionMod = Math.max(-0.5, weatherEffects.invasionModifier);
    const statMultiplier = 1 + invasionMod;

    const enemies: Enemy[] = [];

    for (let i = 0; i < invader.count; i++) {
      enemies.push({
        id: generateId(),
        type: invader.type as any,
        hp: Math.floor(invader.hp * statMultiplier),
        maxHp: Math.floor(invader.maxHp * statMultiplier),
        attack: Math.floor(invader.attack * statMultiplier),
        defense: Math.floor(invader.defense * statMultiplier),
      });
    }

    const scaledRewards: Partial<Resources> = {};
    for (const [key, amount] of Object.entries(invader.reward)) {
      scaledRewards[key as keyof Resources] = Math.floor((amount as number) * statMultiplier);
    }

    const invasion: Invasion = {
      id: generateId(),
      wave,
      enemies,
      isActive: true,
      countdown: 30,
      rewards: scaledRewards,
      result: 'pending',
    };

    set({ invasion });
  },

  fightBattle: () => {
    const state = get();
    const invasion = state.invasion;
    const log: string[] = [];
    if (!invasion) return { result: 'defeat' as const, log: ['无入侵战斗'] };

    let myWarriors = state.warriors.map((w) => ({ ...w }));
    let enemies = invasion.enemies.map((e) => ({ ...e }));

    for (const reinforcement of state.allyReinforcements) {
      for (const unit of reinforcement.warriors) {
        for (let i = 0; i < unit.count; i++) {
          myWarriors.push({
            id: generateId(),
            type: unit.type,
            hp: unit.hp,
            maxHp: unit.hp,
            attack: unit.attack,
            defense: unit.defense,
            level: 1,
            exp: 0,
          });
        }
      }
      log.push(`🤝 ${reinforcement.factionIcon} ${reinforcement.factionName}的援军加入战斗！`);
    }

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
      const atkBonus = atkTechBonus + atkTotemBonus;
      const defBonus = defTechBonus + defTotemBonus;
      const hpBonus = hpTechBonus + hpTotemBonus;

      return {
        ...w,
        attack: Math.floor(w.attack * (1 + atkBonus)),
        defense: Math.floor(w.defense * (1 + defBonus)),
        maxHp: Math.floor(w.maxHp * (1 + hpBonus)),
        hp: Math.floor(w.hp * (1 + hpBonus)),
      };
    });

    log.push(`⚔️ 第 ${invasion.wave} 波入侵开始！`);
    log.push(`敌人：${enemies.map((e) => ENEMIES[e.type].name).join(', ')}`);
    log.push(`我方防御加成：+${wallDefense}，士气加成：+${loyaltyBonus}`);

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
    log.push(victory ? '🏆 胜利！部落成功抵御入侵！' : '💔 失败...部落遭受重创');

    const newLoyalty = Math.min(100, state.loyalty + (victory ? 5 : -8));
    const newPopulation = Math.max(0, state.population + (victory ? 0 : -1));

    if (victory) {
      state.addResources(invasion.rewards);
      log.push(`获得奖励：${Object.entries(invasion.rewards).map(([k, v]) => `${k}+${v}`).join(', ')}`);
    } else {
      log.push(`人口因战败减少了 ${state.population - newPopulation} 人，忠诚下降`);
    }

    set({
      warriors: myWarriors,
      invasion: { ...invasion, isActive: false, enemies, result: victory ? 'victory' : 'defeat' },
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

  executeTrade: (tradeId) => {
    const state = get();
    const trade = state.trades.find((t) => t.id === tradeId);
    if (!trade || trade.stock <= 0) return false;
    if (state.resources[trade.give.resource] < trade.give.amount) return false;

    state.spendResources({ [trade.give.resource]: trade.give.amount });
    state.addResources({ [trade.receive.resource]: trade.receive.amount });

    set({
      trades: state.trades.map((t) =>
        t.id === tradeId ? { ...t, stock: t.stock - 1 } : t
      ),
      totalTrades: state.totalTrades + 1,
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
    set({ trades: generateTrades(6, weatherEffects.tradeModifier, state.factions) });
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
    const adjustedConsumptionRate = state.foodConsumptionRate * (1 + foodConsumptionTechBonus + foodConsumptionTotemBonus);
    const adjustedLoyaltyDecay = LOYALTY_DECAY_NO_FOOD * (1 + loyaltyDecayBonus);

    const foodConsumed = state.population * adjustedConsumptionRate * delta;
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

    const returningWarriors = expedition.warriors.map((ew) => ({
      id: ew.id,
      type: ew.type,
      hp: Math.floor(ew.hp),
      maxHp: ew.maxHp,
      attack: ew.attack,
      defense: ew.defense,
      level: ew.level,
      exp: ew.exp,
    }));

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

    const returningWarriors = expedition.warriors.map((ew) => ({
      id: ew.id,
      type: ew.type,
      hp: Math.floor(ew.hp),
      maxHp: ew.maxHp,
      attack: ew.attack,
      defense: ew.defense,
      level: ew.level,
      exp: ew.exp,
    }));

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
      });
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
}));

setInterval(() => {
  useGameStore.getState().saveGame();
}, 30000);
