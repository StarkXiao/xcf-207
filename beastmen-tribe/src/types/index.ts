export type ResourceType = 'food' | 'wood' | 'stone' | 'gold' | 'iron';

export interface Resources {
  food: number;
  wood: number;
  stone: number;
  gold: number;
  iron: number;
}

export type BuildingType =
  | 'townhall'
  | 'lumbermill'
  | 'quarry'
  | 'farm'
  | 'barracks'
  | 'market'
  | 'smithy'
  | 'wall'
  | 'hut';

export interface BuildingConfig {
  id: BuildingType;
  name: string;
  description: string;
  icon: string;
  baseCost: Partial<Resources>;
  baseProduction?: Partial<Resources>;
  baseCapacity?: number;
  maxLevel: number;
  upgradeMultiplier: number;
  requires?: BuildingType;
}

export interface Building {
  id: string;
  type: BuildingType;
  level: number;
  x: number;
  y: number;
  isBuilding: boolean;
  buildProgress: number;
  lastCollect: number;
}

export type WarriorType = 'grunt' | 'archer' | 'shaman' | 'berserker' | 'warlord';

export interface WarriorConfig {
  id: WarriorType;
  name: string;
  description: string;
  icon: string;
  cost: Partial<Resources>;
  trainTime: number;
  attack: number;
  defense: number;
  hp: number;
  requires?: { building: BuildingType; level: number };
}

export interface Warrior {
  id: string;
  type: WarriorType;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  level: number;
  exp: number;
}

export interface TrainingQueue {
  type: WarriorType;
  progress: number;
  total: number;
  count: number;
}

export type EnemyType = 'goblin' | 'wolf' | 'troll' | 'orc' | 'dragon';

export interface EnemyConfig {
  id: EnemyType;
  name: string;
  icon: string;
  attack: number;
  defense: number;
  hp: number;
  count: number;
  reward: Partial<Resources>;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}

export interface Invasion {
  id: string;
  wave: number;
  enemies: Enemy[];
  isActive: boolean;
  countdown: number;
  rewards: Partial<Resources>;
  result: 'pending' | 'victory' | 'defeat';
}

export type TradeType = 'buy' | 'sell';

export interface TradeOffer {
  id: string;
  type: TradeType;
  give: { resource: ResourceType; amount: number };
  receive: { resource: ResourceType; amount: number };
  stock: number;
}

export interface GameState {
  tribeName: string;
  day: number;
  resources: Resources;
  buildings: Building[];
  warriors: Warrior[];
  trainingQueue: TrainingQueue[];
  invasion: Invasion | null;
  trades: TradeOffer[];
  unlockedBuildings: BuildingType[];
  unlockedWarriors: WarriorType[];
  selectedBuildingId: string | null;
  lastSave: number;
  totalWins: number;
  totalLosses: number;
}
