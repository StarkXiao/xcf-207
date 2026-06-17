import type { DiplomaticEventConfig, FactionType, Faction } from '../types';

export const DIPLOMATIC_EVENTS: DiplomaticEventConfig[] = [
  {
    id: 'ironclaw_trade_request',
    type: 'faction_trade_request',
    name: '铁爪氏族的贸易请求',
    icon: '⚒️',
    description: '铁爪氏族的使者带来了一份贸易协议，希望用铁矿换取你们的粮食。',
    factionId: 'ironclaw',
    minDay: 5,
    minReputation: { ironclaw: 10 },
    weight: 5,
    choices: [
      {
        id: 'accept',
        text: '接受提议，展现诚意',
        effects: {
          reputationChanges: { ironclaw: 15 },
          resourceChanges: { food: -80, iron: 60 },
        },
      },
      {
        id: 'negotiate',
        text: '讨价还价，争取更多利益',
        effects: {
          reputationChanges: { ironclaw: 5 },
          resourceChanges: { food: -60, iron: 60, gold: 20 },
        },
      },
      {
        id: 'reject',
        text: '拒绝这个不合理的要求',
        effects: {
          reputationChanges: { ironclaw: -10 },
        },
      },
    ],
  },
  {
    id: 'shadowfang_border_conflict',
    type: 'border_conflict',
    name: '暗影牙的边境摩擦',
    icon: '🗡️',
    description: '暗影牙部落的侦察兵在边境与你们的巡逻队发生了冲突，双方互有损伤。',
    factionId: 'shadowfang',
    minDay: 8,
    weight: 4,
    choices: [
      {
        id: 'apologize',
        text: '主动道歉，赔偿损失',
        effects: {
          reputationChanges: { shadowfang: 20 },
          resourceChanges: { gold: 50 },
          loyaltyChange: -5,
        },
      },
      {
        id: 'demand',
        text: '要求对方道歉并赔偿',
        effects: {
          reputationChanges: { shadowfang: -20, bloodtooth: 10 },
          resourceChanges: { gold: 30 },
        },
      },
      {
        id: 'ignore',
        text: '不予理会，加强边防',
        effects: {
          reputationChanges: { shadowfang: -5 },
          resourceChanges: { stone: -30 },
        },
      },
    ],
  },
  {
    id: 'sunhorn_refugee_crisis',
    type: 'refugee_crisis',
    name: '阳光角的难民潮',
    icon: '🚶',
    description: '战争导致阳光角族大量难民涌入你的领地，他们请求庇护。',
    factionId: 'sunhorn',
    minDay: 12,
    minReputation: { sunhorn: 30 },
    weight: 3,
    choices: [
      {
        id: 'welcome',
        text: '热烈欢迎，提供安置',
        effects: {
          reputationChanges: { sunhorn: 30, moonscar: 10 },
          populationChange: 5,
          resourceChanges: { food: -100, wood: -50 },
          loyaltyChange: 10,
        },
      },
      {
        id: 'limited',
        text: '有限度接收青壮年',
        effects: {
          reputationChanges: { sunhorn: 10 },
          populationChange: 2,
          resourceChanges: { food: -40 },
        },
      },
      {
        id: 'refuse',
        text: '紧闭城门，拒绝接收',
        effects: {
          reputationChanges: { sunhorn: -25, moonscar: -10 },
          loyaltyChange: -10,
        },
      },
    ],
  },
  {
    id: 'moonscar_alliance_call',
    type: 'alliance_call',
    name: '月痕萨满团的求援',
    icon: '🌙',
    description: '月痕萨满团遭到血牙战团的猛烈进攻，紧急向你求援。',
    factionId: 'moonscar',
    minDay: 15,
    minReputation: { moonscar: 50 },
    weight: 3,
    choices: [
      {
        id: 'full_support',
        text: '全力支援，派遣全部战士',
        effects: {
          reputationChanges: { moonscar: 40, bloodtooth: -30 },
          resourceChanges: { food: -150, gold: -50 },
          loyaltyChange: 15,
        },
      },
      {
        id: 'partial_support',
        text: '派遣部分援军，量力而行',
        effects: {
          reputationChanges: { moonscar: 15, bloodtooth: -10 },
          resourceChanges: { food: -60 },
        },
      },
      {
        id: 'refuse_aid',
        text: '婉拒请求，保持中立',
        effects: {
          reputationChanges: { moonscar: -20 },
        },
      },
    ],
  },
  {
    id: 'bloodtooth_espionage',
    type: 'espionage_detected',
    name: '血牙战团的间谍',
    icon: '🕵️',
    description: '你的守卫抓获了一名血牙战团的间谍，他正在试图窃取军事机密。',
    factionId: 'bloodtooth',
    minDay: 10,
    weight: 4,
    choices: [
      {
        id: 'execute',
        text: '公开处决，以儆效尤',
        effects: {
          reputationChanges: { bloodtooth: -30, ironclaw: 10, shadowfang: -5 },
          loyaltyChange: 5,
        },
      },
      {
        id: 'exchange',
        text: '秘密交换，换取资源',
        effects: {
          reputationChanges: { bloodtooth: 5 },
          resourceChanges: { gold: 80, iron: 30 },
        },
      },
      {
        id: 'recruit',
        text: '策反问谍，为我所用',
        effects: {
          reputationChanges: { bloodtooth: -10 },
          resourceChanges: { gold: 40 },
        },
      },
    ],
  },
  {
    id: 'great_diplomatic_festival',
    type: 'great_festival',
    name: '大陆外交盛宴',
    icon: '🎉',
    description: '各大部落齐聚一堂，举办盛大的外交宴会，这是展示实力和结交盟友的绝佳机会。',
    minDay: 20,
    weight: 2,
    choices: [
      {
        id: 'grand',
        text: '举办盛大宴会，不惜重金',
        effects: {
          reputationChanges: { ironclaw: 15, shadowfang: 15, sunhorn: 15, moonscar: 15, bloodtooth: 5 },
          resourceChanges: { gold: -200, food: -200, wood: -100 },
          loyaltyChange: 20,
        },
      },
      {
        id: 'modest',
        text: '适度招待，量力而行',
        effects: {
          reputationChanges: { ironclaw: 5, shadowfang: 5, sunhorn: 5, moonscar: 5 },
          resourceChanges: { gold: -60, food: -80 },
          loyaltyChange: 5,
        },
      },
      {
        id: 'skip',
        text: '不参加，专注发展',
        effects: {
          reputationChanges: { ironclaw: -5, shadowfang: -5, sunhorn: -5, moonscar: -5, bloodtooth: -5 },
          loyaltyChange: -5,
        },
      },
    ],
  },
  {
    id: 'royal_marriage_sunhorn',
    type: 'royal_marriage',
    name: '阳光角的联姻提议',
    icon: '💒',
    description: '阳光角族的首领希望通过联姻巩固两族关系，将公主嫁给你的继承人。',
    factionId: 'sunhorn',
    minDay: 25,
    minReputation: { sunhorn: 60 },
    weight: 2,
    choices: [
      {
        id: 'accept_marriage',
        text: '欣然接受，永结同好',
        effects: {
          reputationChanges: { sunhorn: 40, moonscar: 10 },
          resourceChanges: { food: 200, gold: 100 },
          loyaltyChange: 15,
          populationChange: 3,
        },
      },
      {
        id: 'politely_decline',
        text: '婉言谢绝，保持现状',
        effects: {
          reputationChanges: { sunhorn: -5 },
        },
      },
    ],
  },
  {
    id: 'plague_from_bloodtooth',
    type: 'plague_spread',
    name: '血牙领地的瘟疫',
    icon: '☠️',
    description: '血牙战团领地爆发了可怕的瘟疫，有向周边蔓延的趋势。',
    factionId: 'bloodtooth',
    minDay: 18,
    weight: 3,
    choices: [
      {
        id: 'send_medicine',
        text: '派遣医者，赠送药品',
        effects: {
          reputationChanges: { bloodtooth: 25, sunhorn: 10, moonscar: 10 },
          resourceChanges: { gold: -100, food: -50 },
          loyaltyChange: 10,
        },
      },
      {
        id: 'close_border',
        text: '封锁边境，防止蔓延',
        effects: {
          reputationChanges: { bloodtooth: -15 },
          resourceChanges: { stone: -40 },
          populationChange: -1,
        },
      },
      {
        id: 'exploit',
        text: '趁虚而入，发动进攻',
        effects: {
          reputationChanges: { bloodtooth: -40, sunhorn: -20, moonscar: -20, ironclaw: -10, shadowfang: -10 },
          resourceChanges: { gold: 150, stone: 80, food: 100 },
          loyaltyChange: -15,
        },
      },
    ],
  },
];

const DIPLOMATIC_EVENT_INTERVAL_MIN = 90;
const DIPLOMATIC_EVENT_INTERVAL_MAX = 180;

export const getDiplomaticEventInterval = () =>
  DIPLOMATIC_EVENT_INTERVAL_MIN + Math.random() * (DIPLOMATIC_EVENT_INTERVAL_MAX - DIPLOMATIC_EVENT_INTERVAL_MIN);

export const triggerRandomDiplomaticEvent = (
  day: number,
  factions: Record<FactionType, Faction>
): DiplomaticEventConfig | null => {
  const eligible = DIPLOMATIC_EVENTS.filter((e) => {
    if (day < e.minDay) return false;
    if (e.factionId) {
      const factionRep = factions[e.factionId]?.reputation ?? 0;
      const minRep = e.minReputation?.[e.factionId];
      const maxRep = e.maxReputation?.[e.factionId];
      if (minRep !== undefined && factionRep < minRep) return false;
      if (maxRep !== undefined && factionRep > maxRep) return false;
    }
    if (e.minReputation) {
      for (const [fid, minRep] of Object.entries(e.minReputation)) {
        if ((factions[fid as FactionType]?.reputation ?? -999) < (minRep as number)) return false;
      }
    }
    if (e.maxReputation) {
      for (const [fid, maxRep] of Object.entries(e.maxReputation)) {
        if ((factions[fid as FactionType]?.reputation ?? 999) > (maxRep as number)) return false;
      }
    }
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
