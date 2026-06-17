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
  | 'hut'
  | 'warehouse'
  | 'caravanserai';

export interface BuildingConfig {
  id: BuildingType;
  name: string;
  description: string;
  icon: string;
  baseCost: Partial<Resources>;
  baseProduction?: Partial<Resources>;
  baseCapacity?: number;
  baseStorageCapacity?: Partial<Resources>;
  maxLevel: number;
  upgradeMultiplier: number;
  requires?: BuildingType;
}

export interface ResourceCapacity {
  food: number;
  wood: number;
  stone: number;
  gold: number;
  iron: number;
}

export type TransportStatus = 'idle' | 'loading' | 'transporting' | 'unloading' | 'completed';

export interface TransportTask {
  id: string;
  resource: ResourceType;
  amount: number;
  fromBuildingId: string;
  toBuildingId: string;
  status: TransportStatus;
  progress: number;
  totalTime: number;
  speed: number;
}

export type SpoilageType = 'rot' | 'theft' | 'disaster' | 'pest';

export interface SpoilageEvent {
  id: string;
  type: SpoilageType;
  name: string;
  icon: string;
  description: string;
  resource: ResourceType;
  lossPercent: number;
  lossAmount: number;
  timestamp: number;
  duration: number;
  active: boolean;
}

export interface OfflineEarnings {
  resources: Partial<Resources>;
  duration: number;
  collected: boolean;
  timestamp: number;
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
  storage: Partial<Resources>;
}

export interface BuildingStorageInfo {
  buildingId: string;
  buildingType: BuildingType;
  buildingName: string;
  storage: Partial<Resources>;
  capacity: Partial<Resources>;
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

export type TechCategory = 'military' | 'economy' | 'defense';

export type TechEffectType =
  | 'attack_boost'
  | 'defense_boost'
  | 'hp_boost'
  | 'train_speed'
  | 'train_cost'
  | 'production_boost'
  | 'resource_cost'
  | 'wall_defense'
  | 'loot_bonus'
  | 'exp_bonus'
  | 'food_consumption'
  | 'population_cap'
  | 'loyalty_decay';

export interface TechEffect {
  type: TechEffectType;
  value: number;
  target?: WarriorType | ResourceType | BuildingType;
}

export interface TechRequirement {
  type: 'building' | 'tech' | 'warrior';
  id: string;
  level?: number;
}

export interface TechConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: TechCategory;
  tier: number;
  cost: Partial<Resources>;
  researchTime: number;
  effects: TechEffect[];
  requires?: TechRequirement[];
  unlocks?: { warriors?: WarriorType[]; buildings?: BuildingType[] };
}

export interface Tech {
  id: string;
  techId: string;
  isResearching: boolean;
  progress: number;
  completed: boolean;
  startedAt: number;
}

export type TaskGoalType =
  | 'collect_resource'
  | 'train_warriors'
  | 'win_battles'
  | 'build_buildings'
  | 'upgrade_buildings'
  | 'expedition_complete'
  | 'trade_count'
  | 'research_complete'
  | 'reach_population'
  | 'reach_loyalty';

export interface TaskGoal {
  type: TaskGoalType;
  target?: string;
  amount: number;
}

export interface TaskStage {
  index: number;
  requiredProgress: number;
  reward: Partial<Resources>;
  bonusLoyalty?: number;
}

export interface TaskConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  goal: TaskGoal;
  stages: TaskStage[];
  failurePenalty: Partial<Resources>;
  penaltyLoyalty?: number;
  duration: number;
}

export type TaskStatus = 'active' | 'completed' | 'failed';

export interface ActiveTask {
  id: string;
  configId: string;
  name: string;
  icon: string;
  description: string;
  goal: TaskGoal;
  progress: number;
  currentStage: number;
  stages: TaskStage[];
  status: TaskStatus;
  startedAtDay: number;
  duration: number;
  failurePenalty: Partial<Resources>;
  penaltyLoyalty?: number;
  claimedStages: number[];
}

export interface TaskChain {
  id: string;
  name: string;
  icon: string;
  tasks: ActiveTask[];
  currentTaskIndex: number;
  chainReward: Partial<Resources>;
  chainBonusLoyalty: number;
  completed: boolean;
  chainRewardClaimed: boolean;
  failed: boolean;
}

export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

export type WeatherType = 'sunny' | 'rainy' | 'stormy' | 'snowy' | 'foggy' | 'drought';

export interface SeasonConfig {
  id: SeasonType;
  name: string;
  icon: string;
  description: string;
  duration: number;
  color: string;
  bgColor: string;
  resourceModifiers: Partial<Record<ResourceType, number>>;
  trainingSpeedModifier: number;
  invasionModifier: number;
  tradeModifier: number;
  availableWeathers: WeatherType[];
  weatherWeights: Partial<Record<WeatherType, number>>;
}

export interface WeatherConfig {
  id: WeatherType;
  name: string;
  icon: string;
  description: string;
  minDuration: number;
  maxDuration: number;
  resourceModifiers: Partial<Record<ResourceType, number>>;
  trainingSpeedModifier: number;
  invasionModifier: number;
  tradeModifier: number;
  particleColor: number;
  particleCount: number;
}

export interface WeatherEffects {
  resourceModifiers: Partial<Record<ResourceType, number>>;
  trainingSpeedModifier: number;
  invasionModifier: number;
  tradeModifier: number;
}

export type FactionType = 'ironclaw' | 'shadowfang' | 'sunhorn' | 'moonscar' | 'bloodtooth';

export type FactionStance = 'enemy' | 'neutral' | 'friendly' | 'ally';

export interface FactionConfig {
  id: FactionType;
  name: string;
  icon: string;
  description: string;
  color: string;
  baseReputation: number;
  tradeBonus: number;
  militaryStrength: number;
  speciality: ResourceType | 'warriors' | 'knowledge';
}

export interface Faction {
  id: FactionType;
  reputation: number;
  stance: FactionStance;
  tradeUnlocked: boolean;
  militaryAid: number;
  lastInteraction: number;
}

export type DiplomaticActionType =
  | 'gift'
  | 'trade_treaty'
  | 'military_aid_request'
  | 'alliance_proposal'
  | 'threaten'
  | 'espionage'
  | 'denounce';

export interface DiplomaticAction {
  id: string;
  type: DiplomaticActionType;
  factionId: FactionType;
  name: string;
  icon: string;
  description: string;
  cost: Partial<Resources>;
  minReputation?: number;
  maxReputation?: number;
  cooldown: number;
  reputationChange: { success: number; fail: number };
  successRate: number;
}

export interface AllyReinforcement {
  id: string;
  factionId: FactionType;
  factionName: string;
  factionIcon: string;
  warriors: { type: WarriorType; count: number; attack: number; defense: number; hp: number }[];
  duration: number;
  summonedAt: number;
}

export type DiplomaticEventType =
  | 'faction_trade_request'
  | 'border_conflict'
  | 'royal_marriage'
  | 'refugee_crisis'
  | 'alliance_call'
  | 'espionage_detected'
  | 'great_festival'
  | 'plague_spread';

export interface DiplomaticEventChoice {
  id: string;
  text: string;
  effects: {
    reputationChanges?: Partial<Record<FactionType, number>>;
    resourceChanges?: Partial<Resources>;
    populationChange?: number;
    loyaltyChange?: number;
    unlockFaction?: FactionType;
    triggerEnding?: EndingType;
  };
}

export interface DiplomaticEventConfig {
  id: string;
  type: DiplomaticEventType;
  name: string;
  icon: string;
  description: string;
  factionId?: FactionType;
  minDay: number;
  minReputation?: Partial<Record<FactionType, number>>;
  maxReputation?: Partial<Record<FactionType, number>>;
  weight: number;
  choices: DiplomaticEventChoice[];
}

export interface ActiveDiplomaticEvent {
  id: string;
  eventId: string;
  type: DiplomaticEventType;
  name: string;
  icon: string;
  description: string;
  factionId?: FactionType;
  choices: DiplomaticEventChoice[];
  triggeredAt: number;
}

export type EndingType =
  | 'conqueror'
  | 'diplomat'
  | 'trader'
  | 'hermit'
  | 'destroyed'
  | 'legendary';

export interface EndingConfig {
  id: EndingType;
  name: string;
  icon: string;
  description: string;
  epilogue: string;
  conditions: {
    minTotalReputation?: number;
    maxEnemyFactions?: number;
    minAllyFactions?: number;
    minDay?: number;
    minTotalWins?: number;
    minWealth?: number;
    populationDestroyed?: boolean;
    allFactionsAllied?: boolean;
  };
}

export interface GameEnding {
  ending: EndingType;
  triggeredAt: number;
  stats: {
    finalDay: number;
    totalWins: number;
    totalLosses: number;
    finalPopulation: number;
    totalTrades: number;
    totalExpeditions: number;
    factionRelations: Record<FactionType, number>;
  };
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
  technologies: Tech[];
  activeResearch: Tech | null;
  unlockedTechnologies: string[];
  taskChains: TaskChain[];
  lastTaskRefreshDay: number;
  taskRefreshInterval: number;
  totalChainsCompleted: number;
  totalChainsFailed: number;
  season: SeasonType;
  weather: WeatherType;
  seasonProgress: number;
  weatherDuration: number;
  factions: Record<FactionType, Faction>;
  activeDiplomaticEvents: ActiveDiplomaticEvent[];
  diplomaticEventCooldown: number;
  allyReinforcements: AllyReinforcement[];
  totalTrades: number;
  resourceCapacity: ResourceCapacity;
  transportTasks: TransportTask[];
  spoilageEvents: SpoilageEvent[];
  spoilageCooldown: number;
  offlineEarnings: OfflineEarnings | null;
  lastOnlineTime: number;
  gameEnding: GameEnding | null;
}
