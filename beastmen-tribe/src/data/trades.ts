import type { TradeOffer, ResourceType, Faction, FactionType } from '../types';
import { FACTIONS } from './factions';

export const RESOURCE_INFO: Record<ResourceType, { name: string; icon: string; color: string }> = {
  food: { name: '食物', icon: '🍖', color: '#ef4444' },
  wood: { name: '木材', icon: '🪵', color: '#a16207' },
  stone: { name: '石料', icon: '🪨', color: '#6b7280' },
  gold: { name: '金币', icon: '🪙', color: '#eab308' },
  iron: { name: '铁矿', icon: '⚙️', color: '#475569' },
};

const RESOURCE_POOL: ResourceType[] = ['food', 'wood', 'stone', 'gold', 'iron'];

const calculateDiplomaticTradeBonus = (factions: Record<FactionType, Faction>): number => {
  let bonus = 0;
  for (const faction of Object.values(factions)) {
    const config = FACTIONS[faction.id];
    if (faction.stance === 'ally') {
      bonus += config.tradeBonus;
    } else if (faction.stance === 'friendly') {
      bonus += config.tradeBonus * 0.5;
    } else if (faction.stance === 'enemy') {
      bonus -= Math.abs(config.tradeBonus) * 0.5;
    }
  }
  return Math.max(-0.3, Math.min(0.5, bonus));
};

export const generateTrades = (
  count: number = 6,
  tradeModifier: number = 0,
  factions?: Record<FactionType, Faction>
): TradeOffer[] => {
  const trades: TradeOffer[] = [];
  const diplomaticBonus = factions ? calculateDiplomaticTradeBonus(factions) : 0;
  const ratioMod = 1 + tradeModifier + diplomaticBonus;

  for (let i = 0; i < count; i++) {
    const giveResource = RESOURCE_POOL[Math.floor(Math.random() * RESOURCE_POOL.length)];
    let receiveResource = RESOURCE_POOL[Math.floor(Math.random() * RESOURCE_POOL.length)];
    while (receiveResource === giveResource) {
      receiveResource = RESOURCE_POOL[Math.floor(Math.random() * RESOURCE_POOL.length)];
    }

    const isBuy = Math.random() > 0.5;
    const baseAmount = Math.floor(Math.random() * 80) + 20;
    const baseRatio = 0.6 + Math.random() * 0.8;
    const ratio = Math.max(0.3, Math.min(1.5, baseRatio * ratioMod));

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

  if (factions) {
    let factionTradeIndex = 0;
    for (const faction of Object.values(factions)) {
      if (faction.stance !== 'friendly' && faction.stance !== 'ally') continue;
      if (trades.length >= count + 3) break;

      const config = FACTIONS[faction.id];
      if (config.speciality === 'warriors' || config.speciality === 'knowledge') continue;

      const specialityResource = config.speciality as ResourceType;
      let otherResource = RESOURCE_POOL[Math.floor(Math.random() * RESOURCE_POOL.length)];
      while (otherResource === specialityResource) {
        otherResource = RESOURCE_POOL[Math.floor(Math.random() * RESOURCE_POOL.length)];
      }

      const factionBonus = faction.stance === 'ally' ? 0.85 : 0.92;
      const baseAmount = Math.floor((Math.random() * 60 + 40) * (faction.stance === 'ally' ? 1.3 : 1));

      trades.push({
        id: `trade-${faction.id}-${factionTradeIndex}`,
        type: 'sell',
        give: { resource: otherResource, amount: Math.floor(baseAmount * factionBonus) },
        receive: { resource: specialityResource, amount: baseAmount },
        stock: faction.stance === 'ally' ? 5 : 3,
      });
      factionTradeIndex++;
    }
  }

  return trades;
};

export const getTradeDiplomacyInfo = (factions: Record<FactionType, Faction>) => {
  const bonus = calculateDiplomaticTradeBonus(factions);
  return {
    bonus,
    bonusPercent: Math.round(bonus * 100),
    friendlyTraders: Object.values(factions).filter(
      (f) => f.stance === 'friendly' || f.stance === 'ally'
    ).length,
  };
};
