import type { TradeOffer, ResourceType } from '../types';

export const RESOURCE_INFO: Record<ResourceType, { name: string; icon: string; color: string }> = {
  food: { name: '食物', icon: '🍖', color: '#ef4444' },
  wood: { name: '木材', icon: '🪵', color: '#a16207' },
  stone: { name: '石料', icon: '🪨', color: '#6b7280' },
  gold: { name: '金币', icon: '🪙', color: '#eab308' },
  iron: { name: '铁矿', icon: '⚙️', color: '#475569' },
};

const RESOURCE_POOL: ResourceType[] = ['food', 'wood', 'stone', 'gold', 'iron'];

export const generateTrades = (count: number = 6): TradeOffer[] => {
  const trades: TradeOffer[] = [];
  for (let i = 0; i < count; i++) {
    const giveResource = RESOURCE_POOL[Math.floor(Math.random() * RESOURCE_POOL.length)];
    let receiveResource = RESOURCE_POOL[Math.floor(Math.random() * RESOURCE_POOL.length)];
    while (receiveResource === giveResource) {
      receiveResource = RESOURCE_POOL[Math.floor(Math.random() * RESOURCE_POOL.length)];
    }

    const isBuy = Math.random() > 0.5;
    const baseAmount = Math.floor(Math.random() * 80) + 20;
    const ratio = 0.6 + Math.random() * 0.8;

    trades.push({
      id: `trade-${Date.now()}-${i}`,
      type: isBuy ? 'buy' : 'sell',
      give: {
        resource: isBuy ? receiveResource : giveResource,
        amount: Math.floor(baseAmount * (isBuy ? ratio : 1)),
      },
      receive: {
        resource: isBuy ? giveResource : receiveResource,
        amount: Math.floor(baseAmount * (isBuy ? 1 : ratio)),
      },
      stock: Math.floor(Math.random() * 5) + 1,
    });
  }
  return trades;
};
