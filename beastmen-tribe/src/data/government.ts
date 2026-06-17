import type {
  Chieftain,
  ChieftainTraits,
  Heir,
  PolicyConfig,
  PolicyCategory,
  InheritanceType,
  ChieftainAttribute,
  Trait,
  WarriorType,
} from '../types';

const COMMON_TRAITS: Trait[] = [
  { id: 'brave', name: '勇猛', description: '身先士卒，战士攻击+5%', icon: '🔥', rarity: 'common', effects: [{ type: 'attack_boost', value: 0.05 }] },
  { id: 'cautious', name: '谨慎', description: '防御优先，防御+5%', icon: '🛡️', rarity: 'common', effects: [{ type: 'defense_boost', value: 0.05 }] },
  { id: 'diligent', name: '勤政', description: '政务勤勉，政策点+10%', icon: '📝', rarity: 'common', effects: [{ type: 'policy_point_rate', value: 0.1 }] },
  { id: 'frugal', name: '节俭', description: '开源节流，训练成本-5%', icon: '💰', rarity: 'common', effects: [{ type: 'train_cost', value: -0.05 }] },
  { id: 'charismatic', name: '魅力', description: '民众爱戴，忠诚+5%', icon: '💖', rarity: 'common', effects: [{ type: 'loyalty_boost', value: 0.05 }] },
];

const RARE_TRAITS: Trait[] = [
  { id: 'strategist', name: '战略家', description: '运筹帷幄，攻击+8% 防御+5%', icon: '🎯', rarity: 'rare', effects: [{ type: 'attack_boost', value: 0.08 }, { type: 'defense_boost', value: 0.05 }] },
  { id: 'administrator', name: '能吏', description: '治世之才，生产+10%', icon: '📊', rarity: 'rare', effects: [{ type: 'production_boost', value: 0.1 }] },
  { id: 'diplomat', name: '纵横家', description: '外交奇才，贸易+15%', icon: '🕊️', rarity: 'rare', effects: [{ type: 'trade_bonus', value: 0.15 }] },
  { id: 'warrior_king', name: '武尊', description: '战神化身，攻击+12% 生命+8%', icon: '⚔️', rarity: 'rare', effects: [{ type: 'attack_boost', value: 0.12 }, { type: 'hp_boost', value: 0.08 }] },
  { id: 'long_lived', name: '长寿', description: '延年益寿，首领最大年龄+15岁', icon: '🌳', rarity: 'rare', effects: [{ type: 'chief_longevity', value: 0.25 }] },
];

const LEGENDARY_TRAITS: Trait[] = [
  { id: 'heaven_blood', name: '天选之人', description: '众神眷顾，全属性加成+8%', icon: '👑', rarity: 'legendary', effects: [{ type: 'attack_boost', value: 0.08 }, { type: 'defense_boost', value: 0.08 }, { type: 'hp_boost', value: 0.08 }, { type: 'production_boost', value: 0.08 }] },
  { id: 'conqueror', name: '征服者', description: '四方征伐，战士攻击+15% 训练速度+10%', icon: '🏆', rarity: 'legendary', effects: [{ type: 'attack_boost', value: 0.15 }, { type: 'train_speed', value: 0.1 }] },
  { id: 'sage_ruler', name: '圣贤之君', description: '千古明君，生产+15% 忠诚+10%', icon: '🌟', rarity: 'legendary', effects: [{ type: 'production_boost', value: 0.15 }, { type: 'loyalty_boost', value: 0.1 }] },
];

export const ALL_TRAITS = [...COMMON_TRAITS, ...RARE_TRAITS, ...LEGENDARY_TRAITS];

const generateRandomTraitList = (count: number = 2, attributes: ChieftainTraits): Trait[] => {
  const result: Trait[] = [];
  const pool = [...ALL_TRAITS];
  const highAttrs = Object.entries(attributes).filter(([_, v]) => v >= 7).map(([k]) => k);

  while (result.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    const rarityRoll = Math.random();
    let selected = pool[idx];
    if (rarityRoll > 0.95 && LEGENDARY_TRAITS.some(t => !result.some(r => r.id === t.id))) {
      const opts = LEGENDARY_TRAITS.filter(t => !result.some(r => r.id === t.id));
      if (opts.length > 0) selected = opts[Math.floor(Math.random() * opts.length)];
    } else if (rarityRoll > 0.75 && RARE_TRAITS.some(t => !result.some(r => r.id === t.id))) {
      const opts = RARE_TRAITS.filter(t => !result.some(r => r.id === t.id));
      if (opts.length > 0) selected = opts[Math.floor(Math.random() * opts.length)];
    } else if (highAttrs.length > 0 && rarityRoll > 0.5) {
      const preferredPool = pool.filter(t =>
        highAttrs.some(attr => t.id.includes(attr) || t.effects.some(e => e.type === `${attr}_boost`))
      );
      if (preferredPool.length > 0) {
        selected = preferredPool[Math.floor(Math.random() * preferredPool.length)];
      }
    }
    if (!result.some(r => r.id === selected.id)) {
      result.push(selected);
    }
    pool.splice(idx, 1);
  }
  return result;
};

export const generateChieftain = (
  currentDay: number = 1,
  predecessorId: string | null = null,
  dynastyName?: string,
  customTraits?: Partial<ChieftainTraits>
): Chieftain => {
  const personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
  const baseTraits = generateRandomTraits(personality.traits as Partial<ChieftainTraits>);
  const attributes: ChieftainTraits = {
    martial: customTraits?.martial ?? baseTraits.martial,
    diplomacy: customTraits?.diplomacy ?? baseTraits.diplomacy,
    stewardship: customTraits?.stewardship ?? baseTraits.stewardship,
    piety: customTraits?.piety ?? baseTraits.piety,
    cunning: customTraits?.cunning ?? baseTraits.cunning,
    charisma: customTraits?.charisma ?? baseTraits.charisma,
  };
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  const age = 25 + Math.floor(Math.random() * 30);
  const maxAge = 60 + Math.floor(Math.random() * 30);
  const finalDynasty = dynastyName || generateDynastyName();
  const title = getChiefTitleByTrait(attributes);
  const nickname = Math.random() > 0.6 ? getChiefTitleByTrait(attributes) : undefined;
  const traitList = generateRandomTraitList(2 + Math.floor(Math.random() * 2), attributes);

  return {
    id: `chieftain-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: generateChieftainName(),
    title,
    nickname,
    age,
    maxAge,
    traits: traitList,
    attributes,
    personality: personality.name,
    personalityDescription: personality.desc,
    icon: avatar,
    startedDay: currentDay,
    predecessorId,
    dynastyName: finalDynasty,
    dynasty: finalDynasty,
    reignDays: 0,
    achievements: [],
    avatar,
  };
};

export const generateHeir = (chieftain: Chieftain, index: number = 0): Heir => {
  const personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
  const baseTraits = generateRandomTraits(personality.traits as Partial<ChieftainTraits>);
  const chiefAttrs = chieftain.attributes;
  const promisedAttributes: ChieftainTraits = {
    martial: Math.max(1, Math.min(10, Math.floor((chiefAttrs.martial + baseTraits.martial) / 2 + (Math.random() * 2 - 1)))),
    diplomacy: Math.max(1, Math.min(10, Math.floor((chiefAttrs.diplomacy + baseTraits.diplomacy) / 2 + (Math.random() * 2 - 1)))),
    stewardship: Math.max(1, Math.min(10, Math.floor((chiefAttrs.stewardship + baseTraits.stewardship) / 2 + (Math.random() * 2 - 1)))),
    piety: Math.max(1, Math.min(10, Math.floor((chiefAttrs.piety + baseTraits.piety) / 2 + (Math.random() * 2 - 1)))),
    cunning: Math.max(1, Math.min(10, Math.floor((chiefAttrs.cunning + baseTraits.cunning) / 2 + (Math.random() * 2 - 1)))),
    charisma: Math.max(1, Math.min(10, Math.floor((chiefAttrs.charisma + baseTraits.charisma) / 2 + (Math.random() * 2 - 1)))),
  };

  const relations = index === 0 ? ['长子', '长女', '养子'] : HEIR_RELATIONS;
  const relation = relations[Math.floor(Math.random() * relations.length)];
  const age = Math.max(14, chieftain.age - 20 + index * 3 + Math.floor(Math.random() * 5));

  const claimStrength = index === 0
    ? 70 + Math.floor(Math.random() * 30)
    : 40 + Math.floor(Math.random() * 40);

  const support = Math.floor((promisedAttributes.charisma + promisedAttributes.martial) * 3 + Math.random() * 20);
  const heirTraits = generateRandomTraitList(1 + Math.floor(Math.random() * 2), promisedAttributes);
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];

  return {
    id: `heir-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: generateChieftainName(),
    age,
    traits: heirTraits,
    promisedAttributes,
    personality: personality.name,
    claimStrength: claimStrength / 100,
    support,
    avatar,
    icon: avatar,
    relation,
    isCandidate: index < 3,
  };
};

const TRIBE_PREFIXES = [
  '血牙', '黑爪', '赤焰', '霜刃', '暗月', '暴雷', '狂石', '铁骨',
  '迅风', '巨岩', '毒刺', '碎骨', '战歌', '焚天', '寒冰', '幽影',
  '金角', '烈火', '裂地', '苍穹', '银鬃', '紫电', '山崩', '海啸',
];

const TRIBE_SUFFIXES = [
  '部落', '氏族', '部族', '战团', '盟族', '汗国', '联盟', '家族',
];

const CHIEFTAIN_FIRST_NAMES = [
  '古拉格', '莫尔卡', '扎克汗', '布隆克', '瓦格里', '索恩达尔',
  '克罗姆', '乌瑟克', '格罗姆', '杜罗坦', '奥格瑞姆', '萨尔',
  '加尔鲁什', '沃金', '凯恩', '贝恩', '希尔瓦娜斯', '卡尔洛斯',
  '阿尔萨斯', '瓦里安', '泰兰德', '玛法里奥', '伊利丹', '萨尔',
  '阿莱克斯', '诺兹多姆', '伊瑟拉', '玛里苟斯', '耐萨里奥',
  '拉格纳罗斯', '奥拉基尔', '塞拉赞恩', ' Neptulon', '提里恩',
  '乌瑟尔', '图拉扬', '卡德加', '麦迪文', '古尔丹', '耐奥祖',
];

const DYNASTY_NAMES = [
  '血手', '铁拳', '烈焰', '寒心', '风暴', '雷霆', '碎颅', '断骨',
  '斩龙', '屠熊', '裂狼', '撕虎', '灭鹰', '破蛇', '焚天', '冻地',
  '撼山', '填海', '逐日', '奔月', '追星', '破晓', '黄昏', '永夜',
];

const PERSONALITIES = [
  { id: 'warrior', name: '战神', desc: '身先士卒，每战必先登，军事才能卓越但外交稍逊。', traits: { martial: 3, diplomacy: -1, stewardship: 0, piety: 0, cunning: 0, charisma: 1 } },
  { id: 'diplomat', name: '贤者', desc: '善于斡旋，能化干戈为玉帛，纵横捭阖之道精通。', traits: { martial: -1, diplomacy: 3, stewardship: 1, piety: 0, cunning: 1, charisma: 1 } },
  { id: 'administrator', name: '明君', desc: '治世之能臣，发展经济、整顿吏治为其所长。', traits: { martial: 0, diplomacy: 1, stewardship: 3, piety: 1, cunning: 0, charisma: 0 } },
  { id: 'zealot', name: '圣徒', desc: '虔诚的图腾信徒，能感召族人凝聚信仰之力。', traits: { martial: 0, diplomacy: 0, stewardship: -1, piety: 4, cunning: 0, charisma: 2 } },
  { id: 'schemer', name: '诡谋', desc: '阴谋诡计层出不穷，政治斗争中罕逢敌手。', traits: { martial: 0, diplomacy: 1, stewardship: 0, piety: -1, cunning: 4, charisma: 0 } },
  { id: 'charmer', name: '魅主', desc: '天生具有领袖魅力，能令部众心甘情愿效死。', traits: { martial: 1, diplomacy: 1, stewardship: 0, piety: 0, cunning: 1, charisma: 3 } },
  { id: 'balanced', name: '中庸', desc: '各方面才能均衡，虽无突出之处却也无明显短板。', traits: { martial: 1, diplomacy: 1, stewardship: 1, piety: 1, cunning: 1, charisma: 1 } },
  { id: 'builder', name: '巨匠', desc: '热衷于建设与工程，能带领部落大兴土木。', traits: { martial: -1, diplomacy: 0, stewardship: 2, piety: 1, cunning: 0, charisma: 0, martial2: 0 } as any },
  { id: 'conqueror', name: '征服者', desc: '开疆拓土之主，志在四方，以武力建立不朽功勋。', traits: { martial: 4, diplomacy: -1, stewardship: -1, piety: 0, cunning: 1, charisma: 2 } },
  { id: 'merchant', name: '商王', desc: '精于贸易理财之道，能使部落财富充盈。', traits: { martial: -1, diplomacy: 2, stewardship: 3, piety: 0, cunning: 1, charisma: 0 } },
];

const TITLES = [
  '大酋长', '战争领主', '血祭大祭司', '铁腕统治者', '万族之王',
  '圣山守护者', '风暴之子', '战神化身', '龙语者', '先祖代言人',
  '雷霆裁决者', '烈焰主宰', '寒域霸主', '部落共主', '百兽之王',
];

const AVATARS = ['🦁', '🐺', '🐻', '🦅', '🐍', '🦊', '🐯', '🐗', '🦈', '🦅', '🐲', '🦬', '🦏', '🦍', '🐆'];

const HEIR_RELATIONS = [
  '长子', '次子', '长女', '兄弟', '侄儿', '外甥', '养子', '义子',
  '心腹爱将', '部落贤者', '战功赫赫者', '大祭司',
];

export const generateTribeName = (): string => {
  const prefix = TRIBE_PREFIXES[Math.floor(Math.random() * TRIBE_PREFIXES.length)];
  const suffix = TRIBE_SUFFIXES[Math.floor(Math.random() * TRIBE_SUFFIXES.length)];
  return `${prefix}${suffix}`;
};

export const generateDynastyName = (): string => {
  return DYNASTY_NAMES[Math.floor(Math.random() * DYNASTY_NAMES.length)];
};

export const generateChieftainName = (): string => {
  return CHIEFTAIN_FIRST_NAMES[Math.floor(Math.random() * CHIEFTAIN_FIRST_NAMES.length)];
};

const rollTrait = (base: number, bonus: number = 0): number => {
  const roll = Math.floor(Math.random() * 7) + 1;
  return Math.max(1, Math.min(10, base + roll + bonus));
};

export const generateRandomTraits = (personalityBonus: Partial<ChieftainTraits> = {}): ChieftainTraits => {
  return {
    martial: rollTrait(2, personalityBonus.martial || 0),
    diplomacy: rollTrait(2, personalityBonus.diplomacy || 0),
    stewardship: rollTrait(2, personalityBonus.stewardship || 0),
    piety: rollTrait(2, personalityBonus.piety || 0),
    cunning: rollTrait(2, personalityBonus.cunning || 0),
    charisma: rollTrait(2, personalityBonus.charisma || 0),
  };
};

export const generateHeirs = (chieftain: Chieftain, count: number = 3): Heir[] => {
  const heirs: Heir[] = [];
  for (let i = 0; i < count; i++) {
    heirs.push(generateHeir(chieftain, i));
  }
  return heirs;
};

export const INHERITANCE_CONFIGS: Record<InheritanceType, { name: string; icon: string; desc: string; loyaltyModifier: number }> = {
  hereditary: { name: '世袭制', icon: '👑', desc: '首领之位在家族内传承，长幼有序。忠诚稳定但可能出现昏君。', loyaltyModifier: 0 },
  election: { name: '选举制', icon: '🗳️', desc: '由部落长老会选举新首领，贤能者居之。更能凝聚人心但选举过程可能动荡。', loyaltyModifier: 5 },
  challenge: { name: '武斗制', icon: '⚔️', desc: '强者为尊，以武力决胜负。能保证首领勇武但内耗严重。', loyaltyModifier: -5 },
  abdication: { name: '禅让制', icon: '🤲', desc: '首领年老或力不从心时主动让贤。平稳过渡但考验首领胸怀。', loyaltyModifier: 3 },
};

export const getChiefTitleByTrait = (traits: ChieftainTraits): string => {
  const maxAttr = Object.entries(traits).reduce((max, [, val]) => Math.max(max, val), 0);
  const dominant = (Object.entries(traits).find(([, v]) => v === maxAttr) as [ChieftainAttribute, number])[0];

  if (maxAttr >= 9) {
    return TITLES[Math.floor(Math.random() * TITLES.length)];
  }

  const titleMap: Record<ChieftainAttribute, string[]> = {
    martial: ['战神', '征服者', '铁腕统帅', '百战之主'],
    diplomacy: ['纵横家', '贤明之主', '万邦之友', '和平使者'],
    stewardship: ['治世能臣', '富族之主', '建设大师', '理财圣手'],
    piety: ['圣徒', '大祭司', '先知', '神之代言人'],
    cunning: ['诡谋大师', '幕后之主', '算无遗策', '潜龙'],
    charisma: ['万民之主', '魅力领袖', '众望所归', '天生王者'],
  };

  const options = titleMap[dominant];
  return options[Math.floor(Math.random() * options.length)];
};

export const POLICY_CATEGORIES: Record<PolicyCategory, { id: PolicyCategory; name: string; icon: string; color: string; description: string }> = {
  military: { id: 'military', name: '军事', icon: '⚔️', color: '#e74c3c', description: '整军经武，开疆拓土' },
  economy: { id: 'economy', name: '经济', icon: '💰', color: '#f39c12', description: '富民兴族，财货充盈' },
  diplomacy: { id: 'diplomacy', name: '外交', icon: '🤝', color: '#3498db', description: '纵横捭阖，邦交和睦' },
  culture: { id: 'culture', name: '文化', icon: '🎭', color: '#9b59b6', description: '昌明教化，凝聚人心' },
  religion: { id: 'religion', name: '宗教', icon: '🗿', color: '#1abc9c', description: '敬天法祖，神道设教' },
  law: { id: 'law', name: '律法', icon: '⚖️', color: '#7f8c8d', description: '定分止争，规矩方圆' },
};

export const POLICIES: PolicyConfig[] = [
  {
    id: 'mil_conscription',
    name: '强制征兵',
    description: '所有壮丁必须服役，训练速度提升但忠诚略有下降。',
    icon: '🎖️',
    category: 'military',
    tier: 1,
    cost: 20,
    researchTime: 30,
    effects: [
      { type: 'train_speed', value: 0.15 },
      { type: 'train_cost', value: -0.1 },
      { type: 'loyalty_decay', value: 0.1 },
    ],
  },
  {
    id: 'mil_elite_guard',
    name: '精锐近卫',
    description: '组建首领亲卫军，大幅提升战士攻击防御。',
    icon: '🛡️',
    category: 'military',
    tier: 2,
    cost: 40,
    researchTime: 60,
    effects: [
      { type: 'attack_boost', value: 0.1 },
      { type: 'defense_boost', value: 0.1 },
      { type: 'train_cost', value: 0.15 },
    ],
    requires: [{ type: 'policy', id: 'mil_conscription' }],
  },
  {
    id: 'mil_warrior_caste',
    name: '武士种姓',
    description: '建立世袭武士阶层，战士能力代代相传。',
    icon: '🏅',
    category: 'military',
    tier: 3,
    cost: 80,
    researchTime: 120,
    effects: [
      { type: 'attack_boost', value: 0.15 },
      { type: 'hp_boost', value: 0.15 },
      { type: 'exp_bonus', value: 0.2 },
      { type: 'train_cost', value: 0.2 },
    ],
    requires: [{ type: 'policy', id: 'mil_elite_guard' }, { type: 'trait', attribute: 'martial', minValue: 6 }],
  },
  {
    id: 'mil_berserker_rite',
    name: '狂战士仪式',
    description: '通过远古仪式激发战士狂性，攻击暴涨但防御下降。',
    icon: '🪓',
    category: 'military',
    tier: 2,
    cost: 45,
    researchTime: 75,
    effects: [
      { type: 'attack_boost', value: 0.25 },
      { type: 'defense_boost', value: -0.1 },
      { type: 'hp_boost', value: 0.1 },
    ],
    requires: [{ type: 'trait', attribute: 'martial', minValue: 5 }],
  },
  {
    id: 'mil_fortification',
    name: '壁垒强化',
    description: '加固防御工事，城墙防御力大幅提升。',
    icon: '🏰',
    category: 'military',
    tier: 1,
    cost: 25,
    researchTime: 35,
    effects: [
      { type: 'wall_defense', value: 0.25 },
      { type: 'resource_cost', value: 0.1 },
    ],
  },
  {
    id: 'eco_agrarian_reform',
    name: '农耕改革',
    description: '改进农耕技术，食物产量显著提升。',
    icon: '🌾',
    category: 'economy',
    tier: 1,
    cost: 20,
    researchTime: 30,
    effects: [
      { type: 'production_boost', value: 0.2, target: 'farm' },
      { type: 'food_consumption', value: -0.1 },
    ],
  },
  {
    id: 'eco_trade_routes',
    name: '商路拓展',
    description: '开辟新的贸易路线，交易收益增加。',
    icon: '🛤️',
    category: 'economy',
    tier: 1,
    cost: 20,
    researchTime: 30,
    effects: [
      { type: 'trade_bonus', value: 0.2 },
      { type: 'production_boost', value: 0.1, target: 'market' },
    ],
  },
  {
    id: 'eco_industrialization',
    name: '产业集中',
    description: '集中资源发展手工业，木材石料产量大增。',
    icon: '⚒️',
    category: 'economy',
    tier: 2,
    cost: 40,
    researchTime: 60,
    effects: [
      { type: 'production_boost', value: 0.2, target: 'lumbermill' },
      { type: 'production_boost', value: 0.2, target: 'quarry' },
      { type: 'construction_speed', value: 0.15 },
    ],
    requires: [{ type: 'policy', id: 'eco_agrarian_reform' }],
  },
  {
    id: 'eco_gold_standard',
    name: '金本位制',
    description: '确立黄金为本位货币，金币收入大幅增加。',
    icon: '🪙',
    category: 'economy',
    tier: 2,
    cost: 50,
    researchTime: 70,
    effects: [
      { type: 'production_boost', value: 0.3, target: 'market' },
      { type: 'tax_gold', value: 0.1 },
      { type: 'trade_bonus', value: 0.15 },
    ],
    requires: [{ type: 'policy', id: 'eco_trade_routes' }, { type: 'trait', attribute: 'stewardship', minValue: 5 }],
  },
  {
    id: 'eco_tax_reform',
    name: '税制改革',
    description: '建立完善的税收体系，所有资源税率提升但忠诚下降。',
    icon: '📋',
    category: 'economy',
    tier: 3,
    cost: 70,
    researchTime: 110,
    effects: [
      { type: 'tax_food', value: 0.1 },
      { type: 'tax_wood', value: 0.1 },
      { type: 'tax_stone', value: 0.1 },
      { type: 'tax_gold', value: 0.1 },
      { type: 'tax_iron', value: 0.1 },
      { type: 'loyalty_decay', value: 0.15 },
    ],
    requires: [{ type: 'policy', id: 'eco_gold_standard' }, { type: 'policy', id: 'eco_industrialization' }],
  },
  {
    id: 'dip_alliance_network',
    name: '盟约网络',
    description: '积极对外联络，外交行动成功率提升。',
    icon: '🕸️',
    category: 'diplomacy',
    tier: 1,
    cost: 25,
    researchTime: 35,
    effects: [
      { type: 'diplomacy_bonus', value: 0.2 },
    ],
  },
  {
    id: 'dip_ambassador_corps',
    name: '使节团',
    description: '训练专业使节，提升对外关系改善速度。',
    icon: '🎗️',
    category: 'diplomacy',
    tier: 2,
    cost: 45,
    researchTime: 65,
    effects: [
      { type: 'diplomacy_bonus', value: 0.15 },
      { type: 'trade_bonus', value: 0.1 },
    ],
    requires: [{ type: 'policy', id: 'dip_alliance_network' }, { type: 'trait', attribute: 'diplomacy', minValue: 5 }],
  },
  {
    id: 'dip_open_borders',
    name: '开放边境',
    description: '开放边境与各族通商贸易，贸易与人口增长均获提升。',
    icon: '🚪',
    category: 'diplomacy',
    tier: 2,
    cost: 40,
    researchTime: 60,
    effects: [
      { type: 'trade_bonus', value: 0.2 },
      { type: 'population_growth', value: 0.15 },
      { type: 'population_cap', value: 0.1 },
    ],
  },
  {
    id: 'dip_pax_brutalis',
    name: '强势和平',
    description: '以绝对实力为后盾的和平，既能威慑外敌又能安抚友邦。',
    icon: '🕊️',
    category: 'diplomacy',
    tier: 3,
    cost: 80,
    researchTime: 120,
    effects: [
      { type: 'diplomacy_bonus', value: 0.25 },
      { type: 'defense_boost', value: 0.1 },
      { type: 'loyalty_boost', value: 0.1 },
    ],
    requires: [{ type: 'policy', id: 'dip_ambassador_corps' }, { type: 'policy', id: 'mil_fortification' }],
    mutuallyExclusive: ['mil_berserker_rite'],
  },
  {
    id: 'cul_oral_tradition',
    name: '口述传统',
    description: '传承部落史诗与传说，激发族人民族自豪感。',
    icon: '📖',
    category: 'culture',
    tier: 1,
    cost: 20,
    researchTime: 30,
    effects: [
      { type: 'loyalty_boost', value: 0.1 },
      { type: 'exp_bonus', value: 0.1 },
    ],
  },
  {
    id: 'cul_gladiatorial_games',
    name: '角斗竞技',
    description: '举办盛大角斗竞技，提升尚武精神与民望。',
    icon: '🏟️',
    category: 'culture',
    tier: 2,
    cost: 40,
    researchTime: 60,
    effects: [
      { type: 'loyalty_boost', value: 0.15 },
      { type: 'train_speed', value: 0.1 },
      { type: 'warrior_preference_attack', value: 0.05 },
    ],
    requires: [{ type: 'policy', id: 'cul_oral_tradition' }, { type: 'trait', attribute: 'charisma', minValue: 5 }],
  },
  {
    id: 'cul_monument_building',
    name: '丰碑建造',
    description: '建造宏伟纪念碑以传颂首领功绩，大幅提升威望。',
    icon: '🗿',
    category: 'culture',
    tier: 3,
    cost: 75,
    researchTime: 115,
    effects: [
      { type: 'loyalty_boost', value: 0.2 },
      { type: 'population_growth', value: 0.1 },
      { type: 'construction_speed', value: -0.1 },
    ],
    requires: [{ type: 'policy', id: 'cul_gladiatorial_games' }, { type: 'trait', attribute: 'charisma', minValue: 7 }],
  },
  {
    id: 'rel_ancestor_worship',
    name: '祖先崇拜',
    description: '尊奉祖先英灵，获取先祖的庇佑与智慧。',
    icon: '👻',
    category: 'religion',
    tier: 1,
    cost: 20,
    researchTime: 30,
    effects: [
      { type: 'faith_gain', value: 0.2 },
      { type: 'loyalty_boost', value: 0.05 },
    ],
  },
  {
    id: 'rel_totem_pilgrimage',
    name: '圣山朝觐',
    description: '组织前往圣山的朝觐活动，大幅提升信仰力。',
    icon: '⛰️',
    category: 'religion',
    tier: 2,
    cost: 45,
    researchTime: 70,
    effects: [
      { type: 'faith_gain', value: 0.3 },
      { type: 'loyalty_boost', value: 0.1 },
    ],
    requires: [{ type: 'policy', id: 'rel_ancestor_worship' }, { type: 'trait', attribute: 'piety', minValue: 5 }],
  },
  {
    id: 'rel_divine_mandate',
    name: '君权神授',
    description: '宣称首领之位来自神授，极大巩固统治合法性。',
    icon: '✨',
    category: 'religion',
    tier: 3,
    cost: 85,
    researchTime: 130,
    effects: [
      { type: 'loyalty_boost', value: 0.25 },
      { type: 'faith_gain', value: 0.25 },
    ],
    requires: [{ type: 'policy', id: 'rel_totem_pilgrimage' }, { type: 'trait', attribute: 'piety', minValue: 7 }],
    mutuallyExclusive: ['law_constitutional_law'],
  },
  {
    id: 'law_tribal_law',
    name: '部族法典',
    description: '编纂成文法典，规范族人行为，稳定社会秩序。',
    icon: '📜',
    category: 'law',
    tier: 1,
    cost: 25,
    researchTime: 35,
    effects: [
      { type: 'loyalty_decay', value: -0.15 },
    ],
  },
  {
    id: 'law_bureaucratic_system',
    name: '官僚体系',
    description: '建立官僚行政系统，管理效率大幅提升。',
    icon: '🏛️',
    category: 'law',
    tier: 2,
    cost: 45,
    researchTime: 70,
    effects: [
      { type: 'production_boost', value: 0.1 },
      { type: 'research_speed', value: 0.15 },
      { type: 'construction_speed', value: 0.1 },
    ],
    requires: [{ type: 'policy', id: 'law_tribal_law' }, { type: 'trait', attribute: 'stewardship', minValue: 5 }],
  },
  {
    id: 'law_constitutional_law',
    name: '立宪之治',
    description: '确立部落宪法，以法治取代人治，长治久安之道。',
    icon: '💎',
    category: 'law',
    tier: 3,
    cost: 90,
    researchTime: 140,
    effects: [
      { type: 'loyalty_boost', value: 0.2 },
      { type: 'loyalty_decay', value: -0.2 },
      { type: 'production_boost', value: 0.15 },
      { type: 'research_speed', value: 0.2 },
    ],
    requires: [{ type: 'policy', id: 'law_bureaucratic_system' }, { type: 'trait', attribute: 'cunning', minValue: 7 }, { type: 'trait', attribute: 'stewardship', minValue: 6 }],
  },
  {
    id: 'law_corruption_crackdown',
    name: '反腐风暴',
    description: '严厉打击贪腐，整肃吏治。',
    icon: '🔍',
    category: 'law',
    tier: 2,
    cost: 40,
    researchTime: 65,
    effects: [
      { type: 'loyalty_boost', value: 0.1 },
      { type: 'resource_cost', value: -0.1 },
      { type: 'train_cost', value: -0.1 },
    ],
    requires: [{ type: 'trait', attribute: 'cunning', minValue: 5 }],
  },
];

export const getPoliciesByCategory = (category: PolicyCategory): PolicyConfig[] => {
  return POLICIES.filter(p => p.category === category);
};

export const getPolicyById = (id: string): PolicyConfig | undefined => {
  return POLICIES.find(p => p.id === id);
};

export const getPolicyResearchTime = (policy: PolicyConfig, stewardship: number = 5): number => {
  const baseTime = policy.tier * 20;
  const traitModifier = 1 + (5 - stewardship) * 0.08;
  return Math.max(5, baseTime * traitModifier);
};

export const getPolicyPointGainPerDay = (
  chieftain: Chieftain | null,
  activePolicies: { policyId: string }[]
): number => {
  if (!chieftain) return 0.1;
  let rate = 0.1;
  rate += chieftain.attributes.stewardship * 0.015;
  rate += chieftain.attributes.cunning * 0.01;
  rate += chieftain.attributes.charisma * 0.008;

  for (const ap of activePolicies) {
    const policy = getPolicyById(ap.policyId);
    if (policy?.effects.some(e => e.type === 'research_speed')) {
      const bonus = policy.effects.find(e => e.type === 'research_speed');
      if (bonus) rate *= (1 + bonus.value);
    }
  }

  return rate;
};

export const getMaxPolicyPoints = (day: number): number => {
  return 50 + Math.floor(day / 10) * 10;
};

export const calculateTraitBonus = (traits: ChieftainTraits) => {
  return {
    attack: (traits.martial - 5) * 0.02,
    defense: (traits.martial - 5) * 0.015,
    trainSpeed: (traits.martial - 5) * 0.015,
    production: (traits.stewardship - 5) * 0.02,
    taxEfficiency: (traits.stewardship - 5) * 0.02,
    constructionSpeed: (traits.stewardship - 5) * 0.015,
    diplomacy: (traits.diplomacy - 5) * 0.03,
    tradeBonus: (traits.diplomacy - 5) * 0.02,
    faithGain: (traits.piety - 5) * 0.03,
    loyaltyBoost: (traits.piety - 5) * 0.01 + (traits.charisma - 5) * 0.015,
    policyGain: (traits.cunning - 5) * 0.01 + (traits.stewardship - 5) * 0.01,
    populationGrowth: (traits.charisma - 5) * 0.02,
    recruitment: (traits.charisma - 5) * 0.015,
    researchSpeed: (traits.cunning - 5) * 0.02,
    lootBonus: (traits.martial - 5) * 0.01 + (traits.cunning - 5) * 0.01,
  };
};

export const getPreferredWarriorType = (traits: ChieftainTraits): WarriorType[] => {
  const preferred: WarriorType[] = [];
  if (traits.martial >= 7) preferred.push('berserker', 'warlord');
  if (traits.martial >= 5) preferred.push('grunt');
  if (traits.cunning >= 6) preferred.push('archer');
  if (traits.piety >= 6) preferred.push('shaman');
  if (preferred.length === 0) preferred.push('grunt');
  return preferred;
};

export const calculateTaxRate = (
  baseTax: number,
  stewardship: number,
  loyalty: number,
  policyBonuses: number = 0
): number => {
  const traitMod = 1 + (stewardship - 5) * 0.02;
  const loyaltyMod = 0.7 + (loyalty / 100) * 0.6;
  return Math.max(0, Math.min(0.5, baseTax * traitMod * loyaltyMod + policyBonuses));
};

export const getReignBonus = (reignDays: number) => {
  const years = Math.floor(reignDays / 30);
  return {
    attackBonus: Math.min(0.2, years * 0.01),
    productionBonus: Math.min(0.25, years * 0.015),
    loyaltyBonus: Math.min(0.15, years * 0.01),
    dynastyRenown: Math.min(100, years * 2),
  };
};

export const generateGovernmentAchievements = (
  chieftain: Chieftain,
  reignDays: number,
  wins: number,
  completedPolicies: string[]
): string[] => {
  const achievements: string[] = [];
  const years = Math.floor(reignDays / 30);

  if (years >= 1) achievements.push('稳定统治满一年');
  if (years >= 3) achievements.push('三年之治，根基初固');
  if (years >= 5) achievements.push('五年太平，部族兴旺');
  if (years >= 10) achievements.push('十年霸业，威震四方');

  if (wins >= 5) achievements.push('五战五胜，勇名显赫');
  if (wins >= 10) achievements.push('十战十捷，战神转世');
  if (wins >= 20) achievements.push('百战百胜，千古一帝');

  if (completedPolicies.length >= 3) achievements.push('推行新政，革故鼎新');
  if (completedPolicies.length >= 6) achievements.push('文治武功，法度完备');
  if (completedPolicies.length >= 10) achievements.push('百废俱兴，盛世之君');

  if (chieftain.attributes.martial >= 9) achievements.push('天生神武，万夫莫当');
  if (chieftain.attributes.diplomacy >= 9) achievements.push('纵横捭阖，舌灿莲花');
  if (chieftain.attributes.stewardship >= 9) achievements.push('治国安邦，经天纬地');
  if (chieftain.attributes.piety >= 9) achievements.push('虔诚至极，神之选民');
  if (chieftain.attributes.cunning >= 9) achievements.push('运筹帷幄，决胜千里');
  if (chieftain.attributes.charisma >= 9) achievements.push('天纵英姿，万民归心');

  return achievements;
};

export const getTraitName = (trait: ChieftainAttribute): string => {
  const names: Record<ChieftainAttribute, string> = {
    martial: '军事',
    diplomacy: '外交',
    stewardship: '管理',
    piety: '信仰',
    cunning: '谋略',
    charisma: '魅力',
  };
  return names[trait];
};

export const getTraitIcon = (trait: ChieftainAttribute): string => {
  const icons: Record<ChieftainAttribute, string> = {
    martial: '⚔️',
    diplomacy: '🤝',
    stewardship: '🏛️',
    piety: '🙏',
    cunning: '🧠',
    charisma: '⭐',
  };
  return icons[trait];
};

export const createInitialGovernmentState = (currentDay: number = 1): any => {
  const firstChieftain = generateChieftain(currentDay);
  firstChieftain.age = 30 + Math.floor(Math.random() * 15);
  firstChieftain.attributes = {
    martial: 5 + Math.floor(Math.random() * 3),
    diplomacy: 4 + Math.floor(Math.random() * 3),
    stewardship: 4 + Math.floor(Math.random() * 3),
    piety: 4 + Math.floor(Math.random() * 3),
    cunning: 4 + Math.floor(Math.random() * 3),
    charisma: 5 + Math.floor(Math.random() * 3),
  };

  const inheritanceTypes: InheritanceType[] = ['hereditary', 'election', 'challenge', 'abdication'];
  const inheritanceType = inheritanceTypes[Math.floor(Math.random() * inheritanceTypes.length)];
  const firstHeirs = generateHeirs(firstChieftain, 3);

  return {
    chieftain: {
      current: firstChieftain,
      history: [],
      dynastyName: firstChieftain.dynastyName,
      inheritanceType,
      heir: firstHeirs[0] || null,
      heirs: firstHeirs,
      selectedHeirId: firstHeirs[0]?.id || null,
      successionCrisis: false,
      successionCrisisTimer: 0,
      abdicationAvailable: firstChieftain.age >= 50,
    },
    policyPoints: 30,
    maxPolicyPoints: 50,
    policyPointRate: 0.15,
    activePolicies: [],
    researchingPolicy: null,
    availablePolicies: POLICIES.filter(p => p.tier === 1).map(p => p.id),
    completedPolicies: [],
    policyCooldowns: {},
    unlockedPolicyCategories: ['military', 'economy', 'culture'],
    unitPreference: {
      primary: 'balanced',
      preferred: getPreferredWarriorType(firstChieftain.attributes),
      bonus: {},
    },
    taxRates: {
      food: 0.05,
      wood: 0.05,
      stone: 0.05,
      gold: 0.08,
      iron: 0.03,
    },
    lastPolicyPointTick: Date.now(),
    reignBonuses: {
      totalDays: 0,
      bonusAttack: 0,
      bonusProduction: 0,
      bonusLoyalty: 0,
      dynastyRenown: 0,
    },
    achievements: [],
    prestige: 0,
  };
};
