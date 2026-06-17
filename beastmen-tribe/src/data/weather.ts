import type { SeasonConfig, WeatherConfig, SeasonType, WeatherType, WeatherEffects } from '../types';

export const SEASONS: Record<SeasonType, SeasonConfig> = {
  spring: {
    id: 'spring',
    name: '春季',
    icon: '🌸',
    description: '万物复苏，狩猎和采集效率提升',
    duration: 30,
    color: '#86efac',
    bgColor: '#14532d',
    resourceModifiers: {
      food: 0.2,
      wood: 0.1,
    },
    trainingSpeedModifier: 0.05,
    invasionModifier: -0.1,
    tradeModifier: 0.1,
    availableWeathers: ['sunny', 'rainy', 'foggy'],
    weatherWeights: {
      sunny: 40,
      rainy: 40,
      foggy: 20,
    },
  },
  summer: {
    id: 'summer',
    name: '夏季',
    icon: '☀️',
    description: '炎热干燥，训练效率最高，但可能出现干旱',
    duration: 30,
    color: '#fcd34d',
    bgColor: '#78350f',
    resourceModifiers: {
      food: 0.1,
      wood: 0.15,
      stone: 0.1,
    },
    trainingSpeedModifier: 0.15,
    invasionModifier: 0,
    tradeModifier: 0,
    availableWeathers: ['sunny', 'drought', 'stormy'],
    weatherWeights: {
      sunny: 50,
      drought: 25,
      stormy: 25,
    },
  },
  autumn: {
    id: 'autumn',
    name: '秋季',
    icon: '🍂',
    description: '丰收季节，资源产出丰厚，交易活跃',
    duration: 30,
    color: '#fb923c',
    bgColor: '#7c2d12',
    resourceModifiers: {
      food: 0.3,
      wood: 0.2,
      stone: 0.1,
      iron: 0.1,
    },
    trainingSpeedModifier: 0,
    invasionModifier: 0.1,
    tradeModifier: 0.2,
    availableWeathers: ['sunny', 'rainy', 'foggy'],
    weatherWeights: {
      sunny: 35,
      rainy: 35,
      foggy: 30,
    },
  },
  winter: {
    id: 'winter',
    name: '冬季',
    icon: '❄️',
    description: '严寒难耐，资源产出下降，敌袭频繁',
    duration: 30,
    color: '#93c5fd',
    bgColor: '#1e3a5f',
    resourceModifiers: {
      food: -0.3,
      wood: -0.2,
      stone: -0.1,
      iron: -0.1,
    },
    trainingSpeedModifier: -0.2,
    invasionModifier: 0.3,
    tradeModifier: -0.2,
    availableWeathers: ['snowy', 'foggy', 'sunny'],
    weatherWeights: {
      snowy: 50,
      foggy: 30,
      sunny: 20,
    },
  },
};

export const WEATHERS: Record<WeatherType, WeatherConfig> = {
  sunny: {
    id: 'sunny',
    name: '晴朗',
    icon: '☀️',
    description: '阳光明媚，各项活动正常进行',
    minDuration: 8,
    maxDuration: 20,
    resourceModifiers: {},
    trainingSpeedModifier: 0.05,
    invasionModifier: 0,
    tradeModifier: 0.05,
    particleColor: 0xfcd34d,
    particleCount: 0,
  },
  rainy: {
    id: 'rainy',
    name: '降雨',
    icon: '🌧️',
    description: '雨水充沛，农作物生长加速，但狩猎困难',
    minDuration: 6,
    maxDuration: 15,
    resourceModifiers: {
      food: -0.1,
      wood: 0.15,
      stone: -0.1,
    },
    trainingSpeedModifier: -0.1,
    invasionModifier: -0.15,
    tradeModifier: -0.1,
    particleColor: 0x60a5fa,
    particleCount: 80,
  },
  stormy: {
    id: 'stormy',
    name: '暴风雨',
    icon: '⛈️',
    description: '狂风暴雨，几乎所有活动都受影响',
    minDuration: 3,
    maxDuration: 8,
    resourceModifiers: {
      food: -0.3,
      wood: -0.2,
      stone: -0.2,
      gold: -0.1,
      iron: -0.2,
    },
    trainingSpeedModifier: -0.3,
    invasionModifier: -0.3,
    tradeModifier: -0.3,
    particleColor: 0x3b82f6,
    particleCount: 150,
  },
  snowy: {
    id: 'snowy',
    name: '大雪',
    icon: '🌨️',
    description: '白雪皑皑，行动迟缓，训练困难',
    minDuration: 5,
    maxDuration: 15,
    resourceModifiers: {
      food: -0.25,
      wood: -0.15,
      stone: -0.15,
      iron: -0.1,
    },
    trainingSpeedModifier: -0.25,
    invasionModifier: 0.1,
    tradeModifier: -0.2,
    particleColor: 0xe0f2fe,
    particleCount: 100,
  },
  foggy: {
    id: 'foggy',
    name: '浓雾',
    icon: '🌫️',
    description: '雾气弥漫，视野受阻，敌袭更难防备',
    minDuration: 4,
    maxDuration: 12,
    resourceModifiers: {
      food: -0.05,
      wood: -0.05,
    },
    trainingSpeedModifier: -0.05,
    invasionModifier: 0.2,
    tradeModifier: -0.15,
    particleColor: 0x9ca3af,
    particleCount: 40,
  },
  drought: {
    id: 'drought',
    name: '干旱',
    icon: '🏜️',
    description: '持续高温，水源枯竭，食物产量骤降',
    minDuration: 5,
    maxDuration: 12,
    resourceModifiers: {
      food: -0.4,
      wood: -0.2,
    },
    trainingSpeedModifier: -0.15,
    invasionModifier: 0.15,
    tradeModifier: 0.1,
    particleColor: 0xfbbf24,
    particleCount: 20,
  },
};

export const SEASON_ORDER: SeasonType[] = ['spring', 'summer', 'autumn', 'winter'];

export const getNextSeason = (current: SeasonType): SeasonType => {
  const currentIndex = SEASON_ORDER.indexOf(current);
  const nextIndex = (currentIndex + 1) % SEASON_ORDER.length;
  return SEASON_ORDER[nextIndex];
};

export const selectWeatherForSeason = (season: SeasonType): WeatherType => {
  const seasonConfig = SEASONS[season];
  const availableWeathers = seasonConfig.availableWeathers;
  const weights = seasonConfig.weatherWeights;
  
  const totalWeight = availableWeathers.reduce(
    (sum, w) => sum + (weights[w] || 0),
    0
  );
  
  let random = Math.random() * totalWeight;
  
  for (const weather of availableWeathers) {
    const weight = weights[weather] || 0;
    random -= weight;
    if (random <= 0) {
      return weather;
    }
  }
  
  return availableWeathers[0];
};

export const getWeatherDuration = (weather: WeatherType): number => {
  const config = WEATHERS[weather];
  return config.minDuration + Math.random() * (config.maxDuration - config.minDuration);
};

export const calculateCombinedEffects = (
  season: SeasonType,
  weather: WeatherType
): WeatherEffects => {
  const seasonConfig = SEASONS[season];
  const weatherConfig = WEATHERS[weather];
  
  const resourceModifiers: Partial<Record<string, number>> = {};
  const allResources = ['food', 'wood', 'stone', 'gold', 'iron'];
  
  for (const resource of allResources) {
    const seasonMod = seasonConfig.resourceModifiers[resource as keyof typeof seasonConfig.resourceModifiers] || 0;
    const weatherMod = weatherConfig.resourceModifiers[resource as keyof typeof weatherConfig.resourceModifiers] || 0;
    const combined = seasonMod + weatherMod + seasonMod * weatherMod;
    if (combined !== 0) {
      resourceModifiers[resource] = combined;
    }
  }
  
  return {
    resourceModifiers,
    trainingSpeedModifier: seasonConfig.trainingSpeedModifier + weatherConfig.trainingSpeedModifier,
    invasionModifier: seasonConfig.invasionModifier + weatherConfig.invasionModifier,
    tradeModifier: seasonConfig.tradeModifier + weatherConfig.tradeModifier,
  };
};

export const getSeasonName = (season: SeasonType): string => SEASONS[season].name;
export const getWeatherName = (weather: WeatherType): string => WEATHERS[weather].name;
