import type { SpoilageType, ResourceType } from '../types';

export interface SpoilageConfig {
  id: SpoilageType;
  name: string;
  icon: string;
  description: string;
  targetResources: ResourceType[];
  minLossPercent: number;
  maxLossPercent: number;
  minLossAmount: number;
  maxLossAmount: number;
  duration: number;
  weight: number;
  minDay: number;
}

export const SPOILAGE_EVENTS: SpoilageConfig[] = [
  {
    id: 'rot',
    name: '食物腐烂',
    icon: '🦠',
    description: '炎热的天气导致部分食物腐烂变质',
    targetResources: ['food'],
    minLossPercent: 0.02,
    maxLossPercent: 0.08,
    minLossAmount: 10,
    maxLossAmount: 50,
    duration: 0,
    weight: 30,
    minDay: 3,
  },
  {
    id: 'theft',
    name: '窃贼来袭',
    icon: '🦝',
    description: '狡猾的窃贼趁夜偷走了部分资源',
    targetResources: ['gold', 'food', 'wood'],
    minLossPercent: 0.01,
    maxLossPercent: 0.05,
    minLossAmount: 5,
    maxLossAmount: 30,
    duration: 0,
    weight: 25,
    minDay: 5,
  },
  {
    id: 'disaster',
    name: '小型灾害',
    icon: '⛈️',
    description: '突发的小型灾害损坏了部分仓储',
    targetResources: ['wood', 'stone', 'food'],
    minLossPercent: 0.03,
    maxLossPercent: 0.1,
    minLossAmount: 15,
    maxLossAmount: 80,
    duration: 0,
    weight: 15,
    minDay: 10,
  },
  {
    id: 'pest',
    name: '虫害',
    icon: '🐀',
    description: '鼠害虫灾啃食了大量存粮和木材',
    targetResources: ['food', 'wood'],
    minLossPercent: 0.02,
    maxLossPercent: 0.06,
    minLossAmount: 8,
    maxLossAmount: 40,
    duration: 0,
    weight: 20,
    minDay: 7,
  },
];

export const SPOILAGE_COOLDOWN_MIN = 120;
export const SPOILAGE_COOLDOWN_MAX = 240;

export const generateSpoilageEvent = (
  currentDay: number,
  resources: Record<string, number>
) => {
  const availableEvents = SPOILAGE_EVENTS.filter((e) => currentDay >= e.minDay);
  if (availableEvents.length === 0) return null;

  const totalWeight = availableEvents.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;
  let selectedEvent = availableEvents[0];

  for (const event of availableEvents) {
    random -= event.weight;
    if (random <= 0) {
      selectedEvent = event;
      break;
    }
  }

  const availableResources = selectedEvent.targetResources.filter(
    (r) => resources[r] > selectedEvent.minLossAmount
  );
  if (availableResources.length === 0) return null;

  const targetResource = availableResources[
    Math.floor(Math.random() * availableResources.length)
  ];

  const lossPercent =
    selectedEvent.minLossPercent +
    Math.random() * (selectedEvent.maxLossPercent - selectedEvent.minLossPercent);
  const lossFromPercent = Math.floor(resources[targetResource] * lossPercent);
  const minLoss = selectedEvent.minLossAmount;
  const maxLoss = Math.min(selectedEvent.maxLossAmount, resources[targetResource] * 0.2);
  const lossAmount = Math.floor(minLoss + Math.random() * (maxLoss - minLoss));

  const finalLoss = Math.min(lossFromPercent, lossAmount, resources[targetResource] - 10);
  if (finalLoss <= 0) return null;

  return {
    type: selectedEvent.id as SpoilageType,
    name: selectedEvent.name,
    icon: selectedEvent.icon,
    description: selectedEvent.description,
    resource: targetResource as ResourceType,
    lossPercent,
    lossAmount: finalLoss,
  };
};
