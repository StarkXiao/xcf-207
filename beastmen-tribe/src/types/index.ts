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

export type EventEffectType =
  | 'population_change'
  | 'loyalty_change'
  | 'food_change'
  | 'resource_change'
  | 'recruit_boost'
  | 'plague'
  | 'festival'
  | 'migration';

export interface EventEffect {
  type: EventEffectType;
  value: number;
  resource?: ResourceType;
}

export interface TribeEventConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  effects: EventEffect[];
  minDay: number;
  minLoyalty?: number;
  maxLoyalty?: number;
  weight: number;
}

export interface ActiveTribeEvent {
  id: string;
  eventId: string;
  name: string;
  icon: string;
  description: string;
  effects: EventEffect[];
  appliedAt: number;
  duration: number;
}

export type ExpeditionDifficulty = 'easy' | 'normal' | 'hard' | 'epic';

export type MapNodeType = 'start' | 'combat' | 'treasure' | 'trap' | 'rest' | 'boss' | 'shrine' | 'ambush';

export type MapEventChoice = 'fight' | 'flee' | 'negotiate' | 'explore' | 'pray' | 'rest';

export interface ExpeditionMapNode {
  id: string;
  type: MapNodeType;
  name: string;
  icon: string;
  description: string;
  position: number;
  choices?: MapEventChoice[];
  enemyType?: EnemyType;
  enemyCount?: number;
  difficulty: ExpeditionDifficulty;
}

export interface ExpeditionMapConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  difficulty: ExpeditionDifficulty;
  requiredWarriors: number;
  nodes: ExpeditionMapNode[];
  bonusLoot?: Partial<Resources>;
}

export interface ExpeditionWarrior {
  id: string;
  type: WarriorType;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  level: number;
  exp: number;
  originalHp: number;
}

export type ExpeditionStatus =
  | 'idle'
  | 'forming'
  | 'marching'
  | 'event'
  | 'settling'
  | 'returning'
  | 'completed';

export interface ExpeditionLoot {
  resources: Partial<Resources>;
  exp: number;
}

export interface ExpeditionResult {
  nodeId: string;
  nodeName: string;
  type: MapNodeType;
  victory: boolean;
  loot: Partial<Resources>;
  casualties: number;
  log: string[];
}

export interface Expedition {
  id: string;
  mapId: string;
  mapName: string;
  mapIcon: string;
  status: ExpeditionStatus;
  warriors: ExpeditionWarrior[];
  currentNodeIndex: number;
  nodes: ExpeditionMapNode[];
  progress: number;
  currentNodeProgress: number;
  results: ExpeditionResult[];
  totalLoot: Partial<Resources>;
  totalExp: number;
  totalCasualties: number;
  pendingEvent: ExpeditionMapNode | null;
  returningProgress: number;
  startedAt: number;
}

export interface ExpeditionNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  icon: string;
  message: string;
  timestamp: number;
  duration: number;
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
  population: number;
  maxPopulation: number;
  loyalty: number;
  foodConsumptionRate: number;
  activeEvents: ActiveTribeEvent[];
  eventCooldown: number;
  recruitEfficiency: number;
  activeExpedition: Expedition | null;
  expeditionNotifications: ExpeditionNotification[];
  totalExpeditions: number;
  expeditionWins: number;
}
