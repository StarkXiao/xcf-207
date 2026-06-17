import type { EndingConfig, EndingType, GameState, FactionType } from '../types';
import { calculateTotalReputation, countAllyFactions, countEnemyFactions } from './factions';

export const ENDINGS: Record<EndingType, EndingConfig> = {
  conqueror: {
    id: 'conqueror',
    name: '征服者',
    icon: '👑',
    description: '通过武力征服了所有敌对势力',
    epilogue: `在无数次血腥的战斗后，你的部落终于统一了这片大陆。每一个曾经的敌人都在你的铁蹄下颤抖，你建立起了一个强大的军事帝国。后世的诗人们将永远传唱你征服的史诗。`,
    conditions: {
      minTotalWins: 30,
      minAllyFactions: 0,
      maxEnemyFactions: 1,
      minDay: 60,
    },
  },
  diplomat: {
    id: 'diplomat',
    name: '外交大师',
    icon: '🕊️',
    description: '通过卓越的外交手段与所有部落结盟',
    epilogue: `你没有用刀剑，而是用智慧和言辞征服了这片大陆。所有部落都愿意与你结为盟友，一个前所未有的和平联盟在你的斡旋下诞生。你被誉为这片土地上最伟大的和平缔造者。`,
    conditions: {
      minAllyFactions: 5,
      allFactionsAllied: true,
      minDay: 80,
    },
  },
  trader: {
    id: 'trader',
    name: '商业巨擘',
    icon: '💰',
    description: '建立了覆盖大陆的商业帝国',
    epilogue: `你的部落成为了大陆贸易的中心。金币如流水般涌入你的宝库，各大部落都依赖于你的商路。虽然你的军团可能不是最强大的，但你的财富足以买下整个大陆。`,
    conditions: {
      minWealth: 5000,
      minTotalReputation: 150,
      minDay: 60,
    },
  },
  hermit: {
    id: 'hermit',
    name: '隐世智者',
    icon: '🏔️',
    description: '与世隔绝，专注于自身发展',
    epilogue: `你的部落选择了与世无争的道路。在偏远的山谷中，你们过着自给自足的生活，不参与外界的纷争。岁月静好，你的部落成为了传说中神秘而祥和的世外桃源。`,
    conditions: {
      minTotalReputation: -50,
      maxEnemyFactions: 2,
      minDay: 50,
      minTotalWins: 5,
    },
  },
  destroyed: {
    id: 'destroyed',
    name: '部落覆灭',
    icon: '💀',
    description: '部落未能在乱世中存续',
    epilogue: `在无尽的战乱和饥荒中，你的部落最终走向了灭亡。族人四散奔逃，曾经的家园化为废墟。多年后，只有风中的残垣断壁还在诉说着这个部落曾经存在过的故事。`,
    conditions: {
      populationDestroyed: true,
    },
  },
  legendary: {
    id: 'legendary',
    name: '传奇霸主',
    icon: '🌟',
    description: '文武双全，成为大陆的传奇',
    epilogue: `你不仅征服了敌人的土地，更赢得了他们的心。你的武勇无人能敌，你的智慧令人折服。在你的统治下，这片大陆迎来了前所未有的黄金时代，你的名字将被传颂千年万年。`,
    conditions: {
      allFactionsAllied: true,
      minTotalWins: 20,
      minWealth: 3000,
      minDay: 100,
      minTotalReputation: 400,
    },
  },
};

export const checkEndingConditions = (state: GameState): EndingType | null => {
  if (state.gameEnding) return null;

  if (state.population <= 0) {
    return 'destroyed';
  }

  const totalReputation = calculateTotalReputation(state.factions);
  const allyCount = countAllyFactions(state.factions);
  const enemyCount = countEnemyFactions(state.factions);
  const totalWealth = state.resources.gold + state.resources.iron * 5 + state.resources.food * 0.5;
  const allAllied = allyCount === 5;

  const checkEnding = (endingType: EndingType): boolean => {
    const config = ENDINGS[endingType];
    const c = config.conditions;

    if (c.populationDestroyed && state.population > 0) return false;
    if (c.allFactionsAllied && !allAllied) return false;
    if (c.minTotalReputation !== undefined && totalReputation < c.minTotalReputation) return false;
    if (c.maxEnemyFactions !== undefined && enemyCount > c.maxEnemyFactions) return false;
    if (c.minAllyFactions !== undefined && allyCount < c.minAllyFactions) return false;
    if (c.minDay !== undefined && state.day < c.minDay) return false;
    if (c.minTotalWins !== undefined && state.totalWins < c.minTotalWins) return false;
    if (c.minWealth !== undefined && totalWealth < c.minWealth) return false;

    return true;
  };

  const priorityOrder: EndingType[] = [
    'legendary',
    'destroyed',
    'conqueror',
    'diplomat',
    'trader',
    'hermit',
  ];

  for (const endingType of priorityOrder) {
    if (checkEnding(endingType)) {
      return endingType;
    }
  }

  return null;
};

export const getFactionRelationsSnapshot = (
  factions: Record<FactionType, number>
): string => {
  const names: Record<FactionType, string> = {
    ironclaw: '铁爪氏族',
    shadowfang: '暗影牙部落',
    sunhorn: '阳光角族',
    moonscar: '月痕萨满团',
    bloodtooth: '血牙战团',
  };

  return Object.entries(factions)
    .map(([id, rep]) => `${names[id as FactionType]}: ${rep}`)
    .join(', ');
};
