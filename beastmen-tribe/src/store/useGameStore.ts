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
} from '../types';
import { BUILDINGS, getBuildingCost, getBuildingProduction } from '../data/buildings';
import { WARRIORS } from '../data/warriors';
import { generateInvasion, ENEMIES } from '../data/enemies';
import { generateTrades } from '../data/trades';

const SAVE_KEY = 'beastmen_tribe_save';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

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
});

const loadSave = (): GameState => {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as GameState;
      return {
        ...parsed,
        trades: generateTrades(6),
        selectedBuildingId: null,
      };
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

    set({
      buildings: [...state.buildings, newBuilding],
      unlockedBuildings: newUnlocked,
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

    for (const queue of state.trainingQueue) {
      let newProgress = queue.progress + delta;
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

    log.push(`⚔️ 第 ${invasion.wave} 波入侵开始！`);
    log.push(`敌人：${enemies.map((e) => ENEMIES[e.type].name).join(', ')}`);
    log.push(`我方防御加成：+${wallLevel}`);

    let round = 0;
    while (myWarriors.length > 0 && enemies.length > 0 && round < 20) {
      round++;
      log.push(`--- 回合 ${round} ---`);

      for (const warrior of myWarriors) {
        if (enemies.length === 0) break;
        const target = enemies[0];
        const damage = Math.max(1, warrior.attack - target.defense / 2);
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

    if (victory) {
      state.addResources(invasion.rewards);
      log.push(`获得奖励：${Object.entries(invasion.rewards).map(([k, v]) => `${k}+${v}`).join(', ')}`);
    }

    set({
      warriors: myWarriors,
      invasion: { ...invasion, isActive: false, enemies, result: victory ? 'victory' : 'defeat' },
      totalWins: state.totalWins + (victory ? 1 : 0),
      totalLosses: state.totalLosses + (victory ? 0 : 1),
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

  tick: (delta) => {
    const state = get();

    state.collectResources();
    state.processTraining(delta);

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
