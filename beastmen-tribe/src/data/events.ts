import type { TribeEventConfig, MilestoneStoryEvent } from '../types';

export const TRIBE_EVENTS: TribeEventConfig[] = [
  {
    id: 'harvest_blessing',
    name: '丰收祝福',
    description: '祖灵赐予丰收，食物大幅增加！',
    icon: '🌾',
    effects: [
      { type: 'food_change', value: 80 },
      { type: 'loyalty_change', value: 5 },
    ],
    minDay: 1,
    weight: 8,
  },
  {
    id: 'wandering_clan',
    name: '流浪部族',
    description: '一支流浪部族请求加入你的部落。',
    icon: '🚶',
    effects: [
      { type: 'migration', value: 3 },
      { type: 'food_change', value: -20 },
    ],
    minDay: 3,
    weight: 6,
  },
  {
    id: 'plague_outbreak',
    name: '瘟疫爆发',
    description: '疾病在部落中蔓延，人口和忠诚下降！',
    icon: '☠️',
    effects: [
      { type: 'plague', value: 2 },
      { type: 'loyalty_change', value: -15 },
    ],
    minDay: 5,
    maxLoyalty: 60,
    weight: 3,
  },
  {
    id: 'great_feast',
    name: '盛大宴会',
    description: '举办盛大宴会庆祝，消耗食物但大幅提升忠诚！',
    icon: '🎉',
    effects: [
      { type: 'food_change', value: -60 },
      { type: 'festival', value: 20 },
    ],
    minDay: 2,
    minLoyalty: 30,
    weight: 5,
  },
  {
    id: 'iron_deposit',
    name: '铁矿发现',
    description: '矿工发现了新的铁矿脉！',
    icon: '⛏️',
    effects: [
      { type: 'resource_change', value: 30, resource: 'iron' },
      { type: 'loyalty_change', value: 3 },
    ],
    minDay: 4,
    weight: 4,
  },
  {
    id: 'raider_raid',
    name: '盗匪劫掠',
    description: '盗匪趁夜袭击了部落，抢走部分资源！',
    icon: '🗡️',
    effects: [
      { type: 'resource_change', value: -40, resource: 'food' },
      { type: 'resource_change', value: -20, resource: 'gold' },
      { type: 'loyalty_change', value: -10 },
    ],
    minDay: 6,
    maxLoyalty: 70,
    weight: 4,
  },
  {
    id: 'war_drums',
    name: '战鼓激昂',
    description: '战争号角响彻部落，征兵效率大幅提升！',
    icon: '🥁',
    effects: [
      { type: 'recruit_boost', value: 0.5 },
      { type: 'loyalty_change', value: 8 },
    ],
    minDay: 5,
    minLoyalty: 40,
    weight: 5,
  },
  {
    id: 'drought',
    name: '旱灾降临',
    description: '持续的干旱导致食物减产，忠诚下降！',
    icon: '☀️',
    effects: [
      { type: 'food_change', value: -50 },
      { type: 'loyalty_change', value: -12 },
    ],
    minDay: 8,
    maxLoyalty: 65,
    weight: 3,
  },
  {
    id: 'trade_caravan',
    name: '商队到访',
    description: '远方商队带来丰厚物资！',
    icon: '🐪',
    effects: [
      { type: 'resource_change', value: 40, resource: 'gold' },
      { type: 'resource_change', value: 20, resource: 'wood' },
      { type: 'loyalty_change', value: 5 },
    ],
    minDay: 3,
    weight: 6,
  },
  {
    id: 'shaman_vision',
    name: '巫医预言',
    description: '巫医的神秘预言增强了部落的信心！',
    icon: '🔮',
    effects: [
      { type: 'loyalty_change', value: 15 },
      { type: 'recruit_boost', value: 0.3 },
    ],
    minDay: 7,
    minLoyalty: 35,
    weight: 4,
  },
  {
    id: 'deserters',
    name: '部落逃亡',
    description: '不满的族人趁夜逃离了部落！',
    icon: '🏃',
    effects: [
      { type: 'population_change', value: -3 },
      { type: 'loyalty_change', value: -5 },
    ],
    minDay: 5,
    maxLoyalty: 40,
    weight: 3,
  },
  {
    id: 'new_born',
    name: '婴儿潮',
    description: '部落迎来了一批新生儿，人丁兴旺！',
    icon: '👶',
    effects: [
      { type: 'population_change', value: 2 },
      { type: 'loyalty_change', value: 5 },
    ],
    minDay: 4,
    minLoyalty: 50,
    weight: 5,
  },
  {
    id: 'gold_vein',
    name: '金矿脉发现',
    description: '矿工在山中发现了金矿脉！',
    icon: '✨',
    effects: [
      { type: 'resource_change', value: 60, resource: 'gold' },
      { type: 'loyalty_change', value: 6 },
    ],
    minDay: 10,
    weight: 3,
  },
  {
    id: 'beast_attack',
    name: '野兽袭击',
    description: '猛兽袭击了部落外围，造成了一些损失！',
    icon: '🐻',
    effects: [
      { type: 'population_change', value: -1 },
      { type: 'resource_change', value: -25, resource: 'food' },
      { type: 'loyalty_change', value: -8 },
    ],
    minDay: 3,
    weight: 5,
  },
];

export const triggerRandomEvent = (
  day: number,
  loyalty: number,
  population: number
): TribeEventConfig | null => {
  if (population <= 0) return null;

  const eligible = TRIBE_EVENTS.filter((e) => {
    if (day < e.minDay) return false;
    if (e.minLoyalty !== undefined && loyalty < e.minLoyalty) return false;
    if (e.maxLoyalty !== undefined && loyalty > e.maxLoyalty) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const event of eligible) {
    roll -= event.weight;
    if (roll <= 0) return event;
  }

  return eligible[eligible.length - 1];
};

export const MILESTONE_STORY_EVENTS: MilestoneStoryEvent[] = [
  {
    id: 'military_era_begins',
    milestoneId: 'th_2',
    name: '军事纪元开启',
    description: '随着兵营和市场的建立，部落正式进入军事时代！',
    icon: '⚔️',
    effects: [
      { type: 'loyalty_change', value: 10 },
      { type: 'recruit_boost', value: 0.5 },
    ],
    storyText: '酋长站在新落成的兵营前，看着年轻的兽人战士们挥舞着粗糙的武器。远处的交易市场传来嘈杂的叫卖声——部落不再只是采集和建造，它开始拥有了力量和野心。巫医在图腾祭坛前低声吟唱，祈求祖灵庇佑这个崭新的时代。',
    autoApply: true,
  },
  {
    id: 'smithy_opening',
    milestoneId: 'th_3',
    name: '钢铁之火',
    description: '铁匠铺的炉火点亮了部落的夜晚，武器锻造技术令战士们士气大振！',
    icon: '🔨',
    effects: [
      { type: 'loyalty_change', value: 8 },
      { type: 'resource_change', value: 30, resource: 'iron' },
    ],
    storyText: '铁锤敲击铁砧的声音在部落中回荡，这是文明进步的声音。第一把精制战斧从炉火中诞生，射手塔上的弓箭手警惕地注视着夜幕——夜袭的威胁从未远去，但现在部落有了更强的武器来守护自己。',
    autoApply: true,
  },
  {
    id: 'expedition_unlock',
    milestoneId: 'th_4',
    name: '远方的召唤',
    description: '巫医萨满的预言指引部落踏上远征之路，委托任务也从各地涌来！',
    icon: '🗺️',
    effects: [
      { type: 'loyalty_change', value: 12 },
      { type: 'food_change', value: 100 },
    ],
    storyText: '萨满在篝火前进入了恍惚状态，她的眼中映射出远方的山川与宝藏。"越过山脉，穿过密林，那里有无尽的财富和荣耀在等待着我们。"部落勇士们握紧武器，远征的号角即将吹响。各地的商人也闻讯而来，带来了五花八门的委托。',
    autoApply: true,
  },
  {
    id: 'trade_route_opens',
    milestoneId: 'th_5',
    name: '商路开辟',
    description: '商队驿站的建立让部落与外界的贸易往来更加频繁！',
    icon: '🐪',
    effects: [
      { type: 'resource_change', value: 80, resource: 'gold' },
      { type: 'resource_change', value: 40, resource: 'wood' },
    ],
    storyText: '第一支商队满载货物踏入了驿站，驼铃声在荒原上传出很远。从今以后，部落不再局限于自给自足，商路的开辟意味着无限的可能。仓储管理系统也同步上线，确保每一份资源都不会被浪费。',
    autoApply: true,
  },
  {
    id: 'diplomatic_contact',
    milestoneId: 'th_6',
    name: '外交接触',
    description: '周边势力注意到了日益强大的部落，外交的大门缓缓打开！',
    icon: '🤝',
    effects: [
      { type: 'loyalty_change', value: 10 },
      { type: 'resource_change', value: 60, resource: 'gold' },
    ],
    storyText: '来自狼族联盟的信使带来了外交文书，鹰族帝国的斥候在部落外围徘徊，蛇族教派的密使则暗中观察着一切。部落已不再是蛮荒中的孤岛，与各势力的交往将决定未来的命运。与此同时，狂战士的加入让军队战力更上一层楼。',
    autoApply: true,
  },
  {
    id: 'shadow_market_opens',
    milestoneId: 'th_7',
    name: '暗影市场',
    description: '走私者的巢穴带来了禁忌的货物，政务系统也在暗中运作！',
    icon: '🌑',
    effects: [
      { type: 'resource_change', value: 100, resource: 'gold' },
      { type: 'resource_change', value: 50, resource: 'iron' },
    ],
    storyText: '月光下，走私者将一箱箱来路不明的货物搬入巢穴。这些物品在正规市场上绝无踪影——禁忌的药剂、失落的技术图纸、甚至是来自敌对势力的情报。与此同时，酋长开始建立正式的政务体系，任命官员管理日益庞大的部落事务。',
    autoApply: true,
  },
  {
    id: 'divine_revelation',
    milestoneId: 'th_8',
    name: '神圣启示',
    description: '圣殿的落成让信仰之力达到了新的高度！',
    icon: '⛩️',
    effects: [
      { type: 'loyalty_change', value: 15 },
      { type: 'resource_change', value: 100, resource: 'gold' },
    ],
    storyText: '圣殿的金色穹顶在晨光中闪耀，巫医们在此日夜祈祷。祖灵的声音从未如此清晰——它们赐予了部落神圣的启示。信仰不再是虚无缥缈的传说，而是切实的力量。所有族人的眼中都燃起了虔诚的火焰。',
    autoApply: true,
  },
  {
    id: 'warlord_arises',
    milestoneId: 'th_9',
    name: '战争酋长降临',
    description: '传说中的战争酋长加入部落，全体战士战力飙升！',
    icon: '👑',
    effects: [
      { type: 'loyalty_change', value: 20 },
      { type: 'recruit_boost', value: 0.8 },
    ],
    storyText: '他踏着尸山血海走来，每一道伤疤都是一场胜利的勋章。战争酋长——兽人中最强大的存在，他的到来让所有战士热血沸腾。在他的号令下，即便是普通的兽人战士也能爆发出惊人的战力。部落的军事力量达到了前所未有的巅峰！',
    autoApply: true,
  },
  {
    id: 'tribe_empire',
    milestoneId: 'th_10',
    name: '帝国加冕',
    description: '部落正式升格为帝国，你已成为这片大陆上的传奇！',
    icon: '🏆',
    effects: [
      { type: 'loyalty_change', value: 30 },
      { type: 'food_change', value: 500 },
      { type: 'resource_change', value: 500, resource: 'gold' },
    ],
    storyText: '部落的旗帜在大陆的最高处飘扬。从荒原上的一个小营地，到横跨大陆的庞大帝国——这是你创造的传奇。巫医、战士、商人、外交官……所有人都在这一刻欢呼。你的名字将被铭刻在历史上，永远不会被遗忘。',
    autoApply: true,
  },
];

export const getStoryEventByMilestone = (milestoneId: string): MilestoneStoryEvent | undefined => {
  return MILESTONE_STORY_EVENTS.find((e) => e.milestoneId === milestoneId);
};

export const getStoryEventsByMilestones = (milestoneIds: string[]): MilestoneStoryEvent[] => {
  return MILESTONE_STORY_EVENTS.filter((e) => milestoneIds.includes(e.milestoneId));
};
