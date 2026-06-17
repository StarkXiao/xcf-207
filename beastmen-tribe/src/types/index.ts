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
  | 'caravanserai'
  | 'smugglers_den'
  | 'totem_altar'
  | 'totem_pole'
  | 'shrine';

export interface BuildingRequirement {
  type: 'building' | 'tech' | 'day' | 'population';
  id?: string;
  level?: number;
  amount?: number;
}

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
  requirements?: BuildingRequirement[];
  buildTime: number;
  upgradeTime: number;
  effects?: BuildingEffect[];
}

export interface BuildingEffect {
  type: string;
  target?: string;
  value?: number;
}

export type BuildQueueItemType = 'build' | 'upgrade';

export interface BuildQueueItem {
  id: string;
  type: BuildQueueItemType;
  buildingType: BuildingType;
  buildingId?: string;
  targetLevel: number;
  x?: number;
  y?: number;
  progress: number;
  totalTime: number;
  cost: Partial<Resources>;
}

export interface BuildingUpgradeHint {
  buildingId: string;
  buildingType: BuildingType;
  currentLevel: number;
  nextLevel: number;
  canAfford: boolean;
  productionGain?: Partial<Resources>;
  cost: Partial<Resources>;
}

export interface ProductionEstimate {
  current: Partial<Resources>;
  next: Partial<Resources>;
  gain: Partial<Resources>;
  gainPercent: Partial<Record<ResourceType, number>>;
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
  effectiveDuration: number;
  collected: boolean;
  timestamp: number;
  baseEfficiency: number;
  timeDecayRate: number;
  buildingBonus: number;
  totemBonus: number;
  governmentBonus: number;
  techBonus: number;
  cappedByStorage: Partial<Resources>;
  perBuildingDetail: OfflineBuildingDetail[];
  warnings: string[];
}

export interface OfflineBuildingDetail {
  buildingId: string;
  buildingType: string;
  buildingName: string;
  level: number;
  baseProduction: Partial<Resources>;
  finalGain: Partial<Resources>;
  capped: boolean;
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

export type UnitClass = 'infantry' | 'ranged' | 'cavalry' | 'support' | 'hero';

export type PositionRow = 'front' | 'middle' | 'back';

export type BattleLogType = 
  | 'attack' 
  | 'counter' 
  | 'kill' 
  | 'death' 
  | 'heal' 
  | 'buff' 
  | 'debuff' 
  | 'morale' 
  | 'round' 
  | 'system'
  | 'counter_attack'
  | 'critical'
  | 'crush';

export interface BattleLogEntry {
  id: string;
  type: BattleLogType;
  round: number;
  actor: string;
  actorIcon: string;
  target?: string;
  targetIcon?: string;
  value?: number;
  extra?: string;
  message: string;
}

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
  unitClass: UnitClass;
  preferredPosition: PositionRow;
  healPower?: number;
  moraleBonus?: number;
  counterRate?: number;
  populationCost: number;
  foodConsumption: number;
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
  position: PositionRow;
  morale: number;
}

export interface TrainingQueue {
  type: WarriorType;
  progress: number;
  total: number;
  count: number;
  populationCost: number;
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
  unitClass: UnitClass;
  preferredPosition: PositionRow;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  position: PositionRow;
  morale: number;
}

export interface BattleSummary {
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalHealing: number;
  killsByUnit: Record<string, number>;
  highestDamage: { name: string; value: number };
  mostKills: { name: string; value: number };
  moraleChanges: number;
  countersTriggered: number;
  criticalHits: number;
}

export type BossSkillType = 'aoe' | 'stun' | 'heal_self' | 'buff_minions' | 'wall_breaker';

export interface BossSkillConfig {
  id: string;
  name: string;
  icon: string;
  type: BossSkillType;
  description: string;
  damage?: number;
  healPercent?: number;
  attackBoost?: number;
  defenseBoost?: number;
  stunRounds?: number;
  wallDamage?: number;
  warningRounds: number;
  cooldown: number;
}

export interface BossSkillWarning {
  skill: BossSkillConfig;
  remainingRounds: number;
}

export interface BossConfig {
  id: string;
  name: string;
  icon: string;
  attack: number;
  defense: number;
  hp: number;
  reward: Partial<Resources>;
  skills: BossSkillConfig[];
  waveThreshold: number;
  minionType: EnemyType;
  minionCount: number;
}

export interface WallDurability {
  maxHp: number;
  currentHp: number;
  level: number;
}

export type RewardTier = 'base' | 'performance' | 'perfect';

export interface TieredReward {
  tier: RewardTier;
  label: string;
  icon: string;
  resources: Partial<Resources>;
  loyaltyBonus: number;
  expBonus: number;
  condition: string;
}

export interface FailureCompensation {
  resources: Partial<Resources>;
  warriorRecoveryRate: number;
  loyaltyMitigation: number;
  damageDealt: number;
  enemiesDefeated: number;
  roundsSurvived: number;
}

export interface Invasion {
  id: string;
  wave: number;
  enemies: Enemy[];
  isActive: boolean;
  countdown: number;
  rewards: Partial<Resources>;
  result: 'pending' | 'victory' | 'defeat';
  battleLog?: BattleLogEntry[];
  battleSummary?: BattleSummary;
  armyMorale: number;
  enemyMorale: number;
  isBossWave: boolean;
  bossId?: string;
  bossSkillWarnings: BossSkillWarning[];
  wallDurability: WallDurability;
  tieredRewards: TieredReward[];
  achievedTier: RewardTier | null;
  failureCompensation: FailureCompensation | null;
  skillCooldowns: Record<string, number>;
}

export type TradeType = 'buy' | 'sell';

export interface TradeOffer {
  id: string;
  type: TradeType;
  give: { resource: ResourceType; amount: number };
  receive: { resource: ResourceType; amount: number };
  stock: number;
  basePrice: number;
  currentPriceMultiplier: number;
  isBlackMarket?: boolean;
  factionId?: FactionType;
  expiresAt?: number;
  minReputation?: number;
}

export type RiskEventType = 'bandit_attack' | 'storm' | 'landslide' | 'beast_attack' | 'customs_check' | 'plague' | 'betrayal';
export type RouteDifficulty = 'safe' | 'normal' | 'dangerous' | 'deadly';
export type CaravanStatus = 'idle' | 'traveling' | 'trading' | 'returning' | 'completed' | 'failed';

export interface RiskEvent {
  id: RiskEventType;
  name: string;
  icon: string;
  description: string;
  baseChance: number;
  resourceLossPercent: Partial<Record<ResourceType, number>>;
  goldLoss: number;
  warriorCasualtyChance: number;
  reputationChange: number;
  difficultyModifier: Partial<Record<RouteDifficulty, number>>;
}

export interface TradeRoute {
  id: string;
  name: string;
  icon: string;
  description: string;
  destination: string;
  destinationFaction?: FactionType;
  distance: number;
  travelTime: number;
  difficulty: RouteDifficulty;
  riskEvents: RiskEventType[];
  resourceDemand: ResourceType[];
  resourceSupply: ResourceType[];
  priceBonus: number;
  riskReductionBuilding?: BuildingType;
  unlockDay: number;
  requiredReputation?: number;
  unlocked: boolean;
}

export interface Caravan {
  id: string;
  name: string;
  routeId: string;
  status: CaravanStatus;
  cargo: Partial<Record<ResourceType, number>>;
  gold: number;
  warriorIds: string[];
  progress: number;
  totalTime: number;
  startedAt: number;
  currentRisk: RiskEvent | null;
  riskResolved: boolean;
  profit: Partial<Record<ResourceType, number>>;
  log: string[];
}

export interface NegotiationState {
  tradeId: string;
  attempts: number;
  maxAttempts: number;
  currentModifier: number;
  opponentMood: number;
  successThreshold: number;
}

export interface BlackMarketOffer {
  id: string;
  tradeOffer: TradeOffer;
  riskLevel: number;
  detectionChance: number;
  reputationPenalty: number;
  expiresAt: number;
  isDiscovered: boolean;
}

export interface PriceFluctuation {
  resource: ResourceType;
  currentMultiplier: number;
  trend: 'rising' | 'falling' | 'stable';
  volatility: number;
  nextUpdateAt: number;
  eventInfluence?: string;
}

export interface CaravanLogEntry {
  id: string;
  caravanId: string;
  timestamp: number;
  day: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
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

export type TotemType =
  | 'wolf'
  | 'bear'
  | 'eagle'
  | 'snake'
  | 'crow'
  | 'sun'
  | 'moon'
  | 'ancestor';

export type TotemEffectType =
  | 'faith_gain'
  | 'attack_boost'
  | 'defense_boost'
  | 'hp_boost'
  | 'production_boost'
  | 'loyalty_boost'
  | 'population_growth'
  | 'food_consumption'
  | 'loot_bonus'
  | 'exp_bonus'
  | 'train_speed'
  | 'wall_defense';

export interface TotemEffect {
  type: TotemEffectType;
  value: number;
  target?: WarriorType | ResourceType | BuildingType;
}

export interface TotemConfig {
  id: TotemType;
  name: string;
  description: string;
  icon: string;
  tier: 1 | 2 | 3 | 4;
  baseCost: Partial<Resources>;
  faithCost: number;
  requires?: { totem?: TotemType; building?: BuildingType; faith?: number };
  effects: TotemEffect[];
  blessingEffect?: BlessingEffect;
}

export type TotemUnlocked = {
  totemId: TotemType;
  activated: boolean;
  level: number;
  maxLevel: number;
};

export type BlessingType =
  | 'war_banner'
  | 'iron_skin'
  | 'bloodlust'
  | 'ancestor_guidance'
  | 'fertility'
  | 'harvest'
  | 'shield_of_faith'
  | 'storm_call';

export interface BlessingEffect {
  type: BlessingType;
  name: string;
  description: string;
  icon: string;
  duration: number;
  effects: TotemEffect[];
  faithCost: number;
  requires?: { totem?: TotemType; building?: BuildingType; minFaith?: number };
}

export interface ActiveBlessing {
  id: string;
  blessingType: BlessingType;
  name: string;
  icon: string;
  effects: TotemEffect[];
  duration: number;
  remaining: number;
  startedAt: number;
}

export interface TotemOffer {
  id: string;
  totemId: TotemType;
  name: string;
  icon: string;
  description: string;
  faithReward: number;
  resourceCost: Partial<Resources>;
  cooldown: number;
}

export interface FaithAccumulation {
  lastTick: number;
  perSecond: number;
}

export interface TotemState {
  faith: number;
  maxFaith: number;
  unlockedTotems: TotemUnlocked[];
  activeBlessings: ActiveBlessing[];
  availableBlessings: BlessingType[];
  offers: TotemOffer[];
  offerCooldowns: Record<string, number>;
  accumulation: FaithAccumulation;
  totalFaithGained: number;
  totalOfferings: number;
  totalBlessings: number;
}

export type TrapType = 'spike' | 'fire' | 'poison' | 'net' | 'boulder';

export interface TrapConfig {
  id: TrapType;
  name: string;
  icon: string;
  description: string;
  cost: Partial<Resources>;
  damage: number;
  effect?: 'slow' | 'poison' | 'stun' | 'burn';
  effectValue?: number;
  maxCount: number;
  requires?: { building: BuildingType; level: number };
}

export interface Trap {
  id: string;
  type: TrapType;
  triggered: boolean;
  position: number;
}

export interface GarrisonSlot {
  id: string;
  warriorType: WarriorType | null;
  warriorId: string | null;
  position: 'front' | 'middle' | 'back';
}

export type NightRaidPhase = 'idle' | 'warning' | 'preparing' | 'fighting' | 'result';

export interface NightRaidEnemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  affectedByTrap?: boolean;
  trapDamage?: number;
}

export interface NightRaidReport {
  id: string;
  wave: number;
  result: 'victory' | 'defeat';
  timestamp: number;
  enemiesDefeated: number;
  trapsTriggered: number;
  casualties: number;
  rewards: Partial<Resources>;
  log: string[];
  claimed: boolean;
}

export interface NightRaid {
  id: string;
  wave: number;
  phase: NightRaidPhase;
  warningCountdown: number;
  preparationTime: number;
  enemies: NightRaidEnemy[];
  traps: Trap[];
  garrison: GarrisonSlot[];
  rewards: Partial<Resources>;
  result: 'pending' | 'victory' | 'defeat';
  battleLog: string[];
}

export interface NightRaidState {
  activeRaid: NightRaid | null;
  reports: NightRaidReport[];
  totalRaids: number;
  totalRaidWins: number;
  totalRaidLosses: number;
  raidCooldown: number;
  nextRaidIn: number;
  availableTraps: Record<TrapType, number>;
  placedTraps: Trap[];
  garrisonWarriors: string[];
}

export type ChieftainAttribute =
  | 'martial'
  | 'diplomacy'
  | 'stewardship'
  | 'piety'
  | 'cunning'
  | 'charisma';

export type InheritanceType = 'hereditary'
  | 'election'
  | 'challenge'
  | 'abdication';

export interface Trait {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'legendary';
  effects: PolicyEffect[];
}

export interface ChieftainTraits {
  martial: number;
  diplomacy: number;
  stewardship: number;
  piety: number;
  cunning: number;
  charisma: number;
}

export interface Chieftain {
  id: string;
  name: string;
  title: string;
  nickname?: string;
  age: number;
  maxAge: number;
  traits: Trait[];
  attributes: ChieftainTraits;
  personality: string;
  personalityDescription: string;
  icon: string;
  startedDay: number;
  predecessorId: string | null;
  dynastyName: string;
  dynasty: string;
  reignDays: number;
  achievements: string[];
  causeOfDeath?: string;
  avatar: string;
}

export type Heir = {
  id: string;
  name: string;
  age: number;
  traits: Trait[];
  promisedAttributes: ChieftainTraits;
  personality: string;
  claimStrength: number;
  support: number;
  avatar: string;
  icon: string;
  relation: string;
  isCandidate: boolean;
};

export type InheritanceCandidate = Heir & {
  isHeir: boolean;
};

export type PolicyCategory =
  | 'military'
  | 'economy'
  | 'diplomacy'
  | 'culture'
  | 'religion'
  | 'law';

export type PolicyEffectType =
  | 'attack_boost'
  | 'defense_boost'
  | 'hp_boost'
  | 'train_speed'
  | 'train_cost'
  | 'production_boost'
  | 'resource_cost'
  | 'loyalty_boost'
  | 'population_growth'
  | 'food_consumption'
  | 'loot_bonus'
  | 'exp_bonus'
  | 'warrior_preference_attack'
  | 'warrior_preference_defense'
  | 'warrior_preference_hp'
  | 'tax_food'
  | 'tax_wood'
  | 'tax_stone'
  | 'tax_gold'
  | 'tax_iron'
  | 'loyalty_decay'
  | 'population_cap'
  | 'faith_gain'
  | 'trade_bonus'
  | 'wall_defense'
  | 'diplomacy_bonus'
  | 'warrior_unlock_boost'
  | 'construction_speed'
  | 'research_speed'
  | 'tax_rate'
  | 'policy_point_rate'
  | 'prestige_gain'
  | 'chief_longevity';

export interface PolicyEffect {
  type: PolicyEffectType;
  value: number;
  target?: WarriorType | ResourceType | BuildingType;
}

export interface PolicyRequirement {
  type: 'trait' | 'policy' | 'building' | 'tech' | 'day' | 'tier';
  id?: string;
  attribute?: ChieftainAttribute;
  minValue?: number;
  name?: string;
}

export interface PolicyConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: PolicyCategory;
  tier: 1 | 2 | 3;
  cost: number;
  researchTime: number;
  effects: PolicyEffect[];
  requires?: PolicyRequirement[];
  mutuallyExclusive?: string[];
}

export interface ActivePolicy {
  id: string;
  policyId: string;
  activatedAt: number;
  activatedDay: number;
}

export interface ResearchingPolicy {
  policyId: string;
  progress: number;
  total: number;
  startedAt: number;
}

export type UnitPreference = {
  primary: 'balanced' | 'infantry' | 'cavalry' | 'archer' | 'shaman' | 'beast';
  preferred: WarriorType[];
  bonus: Partial<Record<WarriorType, number>>;
};

export type TaxRates = {
  food: number;
  wood: number;
  stone: number;
  gold: number;
  iron: number;
  leather?: number;
};

export interface ChieftainState {
  current: Chieftain | null;
  history: Chieftain[];
  dynastyName: string;
  inheritanceType: InheritanceType;
  heir: Heir | null;
  heirs: Heir[];
  selectedHeirId: string | null;
  successionCrisis: boolean;
  successionCrisisTimer: number;
  abdicationAvailable: boolean;
}

export interface GovernmentState {
  chieftain: ChieftainState;
  policyPoints: number;
  maxPolicyPoints: number;
  policyPointRate: number;
  activePolicies: ActivePolicy[];
  researchingPolicy: ResearchingPolicy | null;
  availablePolicies: string[];
  completedPolicies: string[];
  policyCooldowns: Record<string, number>;
  unlockedPolicyCategories: PolicyCategory[];
  unitPreference: UnitPreference;
  taxRates: TaxRates;
  lastPolicyPointTick: number;
  reignBonuses: {
    totalDays: number;
    bonusAttack: number;
    bonusProduction: number;
    bonusLoyalty: number;
    dynastyRenown: number;
  };
  achievements: string[];
  prestige: number;
}

export const SAVE_VERSION = 1;

export type SaveType = 'manual' | 'auto' | 'quicksave';

export interface SaveSlot {
  id: string;
  slotIndex: number;
  type: SaveType;
  note: string;
  tribeName: string;
  day: number;
  population: number;
  totalWins: number;
  totalLosses: number;
  timestamp: number;
  version: number;
  data: GameState;
  isCorrupted: boolean;
  corruptionReason?: string;
}

export interface SaveSlotInfo {
  id: string;
  slotIndex: number;
  type: SaveType;
  note: string;
  tribeName: string;
  day: number;
  population: number;
  totalWins: number;
  totalLosses: number;
  timestamp: number;
  version: number;
  isCorrupted: boolean;
  corruptionReason?: string;
}

export interface LoadSaveResult {
  success: boolean;
  state?: GameState;
  error?: string;
  warnings?: string[];
  needsMigration?: boolean;
  hasBackup?: boolean;
  versionMismatch?: { saveVersion: number; currentVersion: number };
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
  totem: TotemState;
  nightRaid: NightRaidState;
  government: GovernmentState;
  tradeRoutes: TradeRoute[];
  caravans: Caravan[];
  caravanLogs: CaravanLogEntry[];
  blackMarketOffers: BlackMarketOffer[];
  priceFluctuations: Record<ResourceType, PriceFluctuation>;
  currentNegotiation: NegotiationState | null;
  lastStockRefresh: number;
  stockRefreshInterval: number;
  caravanCooldown: number;
  activeCaravanCount: number;
  maxCaravans: number;
  wantedLevel: number;
  lastBlackMarketRefresh: number;
  blackMarketRefreshInterval: number;
  buildQueue: BuildQueueItem[];
  maxBuildQueueSize: number;
}
