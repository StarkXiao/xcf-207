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
} from '../types';
import { BUILDINGS, getBuildingCost, getBuildingProduction } from '../data/buildings';
import { WARRIORS } from '../data/warriors';
import { generateInvasion, ENEMIES } from '../data/enemies';
import { generateTrades } from '../data/trades';
import { triggerRandomEvent } from '../data/events';
import {
  EXPEDITION_MAPS,
  NODE_MARCH_TIME,
  EXP_GAIN,
  rollLoot,
  getExpeditionMap,
} from '../data/expedition';

const SAVE_KEY = 'beastmen_tribe_save';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const FOOD_PER_POP = 0.5;
const BASE_POP_CAPACITY = 10;
const POP_GROWTH_RATE = 0.02;
const LOYALTY_FOOD_THRESHOLD = 10;
const LOYALTY_DECAY_NO_FOOD = 0.5;
const LOYALTY_RECOVERY_WELL_FED = 0.1;
const EVENT_INTERVAL_MIN = 60;
const EVENT_INTERVAL_MAX = 120;

const calculateMaxPopulation = (buildings: Building[]): number => {
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

const createInitialState = (): GameState => ({
  tribeName: '血牙部落',
  day: 1,
  resources: {
    food: 300,
    wood: 250,
    stone: 180,
    gold: 120,
    iron: 0,
  },
  buildings: [
    {
      id: 'townhall-1',
      type: 'townhall',
      level: 1,
      x: 400,
      y: 300,
      isBuilding: false,
      buildProgress: 100,
      lastCollect: Date.now(),
    },
  ],
  warriors: [],
  trainingQueue: [],
  invasion: null,
  trades: generateTrades(6),
  unlockedBuildings: ['townhall', 'hut', 'farm', 'lumbermill', 'quarry', 'wall'],
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
});

const loadSave = (): GameState => {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as GameState;
      const state: GameState = {
        ...createInitialState(),
        ...parsed,
        trades: generateTrades(6),
        selectedBuildingId: null,
        activeEvents: parsed.activeEvents || [],
        population: parsed.population ?? 8,
        maxPopulation: parsed.maxPopulation ?? calculateMaxPopulation(parsed.buildings),
        loyalty: parsed.loyalty ?? 70,
        foodConsumptionRate: parsed.foodConsumptionRate ?? FOOD_PER_POP,
        eventCooldown: parsed.eventCooldown ?? EVENT_INTERVAL_MIN + Math.random() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN),
        recruitEfficiency: parsed.recruitEfficiency ?? 0.5 + ((parsed.loyalty ?? 70) / 100) * 0.5,
      };
      state.maxPopulation = calculateMaxPopulation(state.buildings);
      state.recruitEfficiency = calculateRecruitEfficiency(state.loyalty, state.activeEvents);
      state.activeExpedition = parsed.activeExpedition || null;
      state.expeditionNotifications = parsed.expeditionNotifications || [];
      state.totalExpeditions = parsed.totalExpeditions || 0;
      state.expeditionWins = parsed.expeditionWins || 0;
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

  tick: (delta: number) => void;
  saveGame: () => void;
  resetGame: () => void;
  setTribeName: (name: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...loadSave(),

  canAfford: (cost) => {
    const { resources } = get();
    return Object.entries(cost).every(
      ([key, amount]) => resources[key as keyof Resources] >= (amount as number)
    );
  },

  spendResources: (cost) => {
    const state = get();
    if (!state.canAfford(cost)) return false;
    const newResources = { ...state.resources };
    for (const [key, amount] of Object.entries(cost)) {
      newResources[key as keyof Resources] -= amount as number;
    }
    set({ resources: newResources });
    return true;
  },

  addResources: (gain) => {
    const state = get();
    const newResources = { ...state.resources };
    for (const [key, amount] of Object.entries(gain)) {
      newResources[key as keyof Resources] += amount as number;
    }
    set({ resources: newResources });
  },

  buildBuilding: (type, x, y) => {
    const state = get();
    const config = BUILDINGS[type];
    if (!config) return false;
    if (!state.unlockedBuildings.includes(type)) return false;

    const cost = getBuildingCost(type, 0);
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
    };

    const newUnlocked = [...state.unlockedBuildings];
    if (type === 'barracks') {
      if (!newUnlocked.includes('smithy')) newUnlocked.push('smithy');
    }

    const newBuildings = [...state.buildings, newBuilding];
    set({
      buildings: newBuildings,
      unlockedBuildings: newUnlocked,
      maxPopulation: calculateMaxPopulation(newBuildings),
    });
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

    const cost = getBuildingCost(building.type, building.level);
    if (!state.spendResources(cost)) return false;

    const newWarriors = [...state.unlockedWarriors];
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
      if (b.type === 'barracks') {
        if (newLevel >= 2 && !newWarriors.includes('archer')) newWarriors.push('archer');
        if (newLevel >= 3 && !newWarriors.includes('shaman')) newWarriors.push('shaman');
      }
      if (b.type === 'smithy') {
        if (newLevel >= 2 && !newWarriors.includes('berserker')) newWarriors.push('berserker');
        if (newLevel >= 4 && !newWarriors.includes('warlord')) newWarriors.push('warlord');
      }

      return { ...b, level: newLevel };
    });

    set({
      buildings: newBuildings,
      unlockedWarriors: newWarriors,
      unlockedBuildings: newUnlockedBuildings,
      maxPopulation: calculateMaxPopulation(newBuildings),
    });
    return true;
  },

  collectResources: () => {
    const state = get();
    const now = Date.now();
    const totalGain: Partial<Resources> = {};

    const updatedBuildings = state.buildings.map((b) => {
      if (b.isBuilding) return b;
      const production = getBuildingProduction(b.type, b.level);
      if (Object.keys(production).length === 0) return b;

      const elapsed = (now - b.lastCollect) / 1000;
      for (const [key, rate] of Object.entries(production)) {
        const amount = (rate as number) * elapsed;
        totalGain[key as keyof Resources] = (totalGain[key as keyof Resources] || 0) + amount;
      }

      return { ...b, lastCollect: now };
    });

    if (Object.keys(totalGain).length > 0) {
      state.addResources(totalGain);
    }
    set({ buildings: updatedBuildings });
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

    if (!state.spendResources(config.cost)) return false;

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
    const scaledDelta = delta * efficiency;

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
    } else {
      set({ trainingQueue: newQueue });
    }

    return completed;
  },

  startInvasion: () => {
    const state = get();
    if (state.invasion?.isActive) return;

    const wave = Math.floor(state.day / 2) + 1;
    const invader = generateInvasion(wave);
    const enemies: Enemy[] = [];

    for (let i = 0; i < invader.count; i++) {
      enemies.push({
        id: generateId(),
        type: invader.type as any,
        hp: invader.hp,
        maxHp: invader.maxHp,
        attack: invader.attack,
        defense: invader.defense,
      });
    }

    const invasion: Invasion = {
      id: generateId(),
      wave,
      enemies,
      isActive: true,
      countdown: 30,
      rewards: invader.reward,
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

    const wallLevel = state.buildings
      .filter((b) => b.type === 'wall')
      .reduce((sum, b) => sum + b.level * 10, 0);

    const loyaltyBonus = Math.floor(state.loyalty / 20);
    log.push(`⚔️ 第 ${invasion.wave} 波入侵开始！`);
    log.push(`敌人：${enemies.map((e) => ENEMIES[e.type].name).join(', ')}`);
    log.push(`我方防御加成：+${wallLevel}，士气加成：+${loyaltyBonus}`);

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
        const damage = Math.max(1, enemy.attack - target.defense / 2 - wallLevel / 10);
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
    });
    return true;
  },

  refreshTrades: () => {
    const state = get();
    if (state.resources.gold < 20) return;
    state.spendResources({ gold: 20 });
    set({ trades: generateTrades(6) });
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

    const foodConsumed = state.population * state.foodConsumptionRate * delta;
    let newFood = state.resources.food - foodConsumed;
    let newLoyalty = state.loyalty;
    let newPopulation = state.population;

    if (newFood < 0) {
      newFood = 0;
      newLoyalty -= LOYALTY_DECAY_NO_FOOD * delta;
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
    const expGain = EXP_GAIN[node.difficulty] || 10;
    let warriors = expedition.warriors.map((w) => ({ ...w }));

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

    const newTotalLoot: Partial<Resources> = { ...expedition.totalLoot };
    for (const [key, amount] of Object.entries(loot)) {
      newTotalLoot[key as keyof Resources] = (newTotalLoot[key as keyof Resources] || 0) + (amount as number);
    }

    const result: ExpeditionResult = {
      nodeId: node.id,
      nodeName: node.name,
      type: node.type,
      victory,
      loot,
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

  tick: (delta) => {
    const state = get();

    state.collectResources();
    state.processTraining(delta);
    state.processPopulationTick(delta);
    state.processEventTick(delta);
    state.processExpeditionTick(delta);

    const newBuildings = state.buildings.map((b) => {
      if (b.isBuilding && b.buildProgress < 100) {
        const newProgress = Math.min(100, b.buildProgress + delta * 10);
        return { ...b, buildProgress: newProgress, isBuilding: newProgress < 100 };
      }
      return b;
    });

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
