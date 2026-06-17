import type { TradeOffer, ResourceType, Faction, FactionType, PriceFluctuation } from '../types';
import { FACTIONS } from './factions';
import { BASE_PRICES } from './caravans';

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

const getSupplyLineIronModifier = (supplyLineStatus: string, isBuyingIron: boolean): number => {
  switch (supplyLineStatus) {
    case 'disrupted':
      return isBuyingIron ? 1.5 : 0.7;
    case 'boosted':
      return isBuyingIron ? 0.8 : 1.3;
    default:
      return 1;
  }
};

export const generateTrades = (
  count: number = 6,
  tradeModifier: number = 0,
  factions?: Record<FactionType, Faction>,
  priceFluctuations?: Record<ResourceType, PriceFluctuation>,
  day?: number,
  supplyLineStatus: string = 'normal'
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
    
    let priceMultiplier = 1;
    if (priceFluctuations) {
      const giveFluct = priceFluctuations[giveResource]?.currentMultiplier ?? 1;
      const receiveFluct = priceFluctuations[receiveResource]?.currentMultiplier ?? 1;
      priceMultiplier = isBuy ? (receiveFluct / giveFluct) : (giveFluct / receiveFluct);
    }
    
    let ratio = Math.max(0.3, Math.min(1.5, baseRatio * ratioMod * priceMultiplier));
    
    const ironResource = isBuy ? giveResource : receiveResource;
    const isIronTrade = ironResource === 'iron';
    if (isIronTrade) {
      const isBuyingIron = isBuy;
      const supplyMod = getSupplyLineIronModifier(supplyLineStatus, isBuyingIron);
      ratio = Math.max(0.3, Math.min(2.0, ratio * supplyMod));
    }
    
    const basePrice = BASE_PRICES[giveResource] * baseAmount;

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
      basePrice,
      currentPriceMultiplier: ratio,
      expiresAt: day ? Date.now() + 180000 : undefined,
      affectedBySupplyLine: isIronTrade,
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
      
      let priceMultiplier = 1;
      if (priceFluctuations) {
        const specialityFluct = priceFluctuations[specialityResource]?.currentMultiplier ?? 1;
        const otherFluct = priceFluctuations[otherResource]?.currentMultiplier ?? 1;
        priceMultiplier = otherFluct / specialityFluct;
      }
      
      let finalMultiplier = factionBonus * priceMultiplier;
      const isIronTrade = specialityResource === 'iron' || otherResource === 'iron';
      if (isIronTrade) {
        const isBuyingIron = specialityResource === 'iron';
        const supplyMod = getSupplyLineIronModifier(supplyLineStatus, isBuyingIron);
        finalMultiplier = Math.max(0.3, Math.min(2.0, finalMultiplier * supplyMod));
      }
      
      const basePrice = BASE_PRICES[otherResource] * baseAmount;

      trades.push({
        id: `trade-${faction.id}-${factionTradeIndex}`,
        type: 'sell',
        give: { resource: otherResource, amount: Math.floor(baseAmount * finalMultiplier) },
        receive: { resource: specialityResource, amount: baseAmount },
        stock: faction.stance === 'ally' ? 5 : 3,
        basePrice,
        currentPriceMultiplier: finalMultiplier,
        factionId: faction.id,
        minReputation: faction.stance === 'ally' ? 60 : 30,
        expiresAt: day ? Date.now() + 240000 : undefined,
        affectedBySupplyLine: isIronTrade,
      });
      factionTradeIndex++;
    }
  }

  return trades;
};

export const refreshStocks = (
  trades: TradeOffer[],
  minStock: number = 1,
  maxStock: number = 8
): TradeOffer[] => {
  return trades.map(trade => {
    if (trade.stock <= 0) {
      return {
        ...trade,
        stock: Math.floor(Math.random() * (maxStock - minStock + 1)) + minStock,
      };
    }
    if (Math.random() < 0.3) {
      const stockChange = Math.floor(Math.random() * 3) - 1;
      return {
        ...trade,
        stock: Math.max(1, trade.stock + stockChange),
      };
    }
    return trade;
  });
};

export const updatePriceFluctuations = (
  fluctuations: Record<ResourceType, PriceFluctuation>,
  now: number
): Record<ResourceType, PriceFluctuation> => {
  const resources: ResourceType[] = ['food', 'wood', 'stone', 'gold', 'iron'];
  const updated: Partial<Record<ResourceType, PriceFluctuation>> = {};

  for (const resource of resources) {
    const fluct = fluctuations[resource];
    if (!fluct) continue;

    if (now >= fluct.nextUpdateAt) {
      const volatility = fluct.volatility;
      const change = (Math.random() - 0.5) * 2 * volatility;
      let newMultiplier = fluct.currentMultiplier * (1 + change);
      
      newMultiplier = Math.max(0.5, Math.min(2.0, newMultiplier));

      let trend: 'rising' | 'falling' | 'stable' = 'stable';
      if (change > 0.03) trend = 'rising';
      else if (change < -0.03) trend = 'falling';

      const newVolatility = Math.max(0.05, Math.min(0.3, 
        volatility + (Math.random() - 0.5) * 0.05));

      updated[resource] = {
        ...fluct,
        currentMultiplier: newMultiplier,
        trend,
        volatility: newVolatility,
        nextUpdateAt: now + 45000 + Math.random() * 30000,
      };
    } else {
      updated[resource] = fluct;
    }
  }

  return updated as Record<ResourceType, PriceFluctuation>;
};

export const getTradeValue = (trade: TradeOffer): number => {
  const giveValue = BASE_PRICES[trade.give.resource] * trade.give.amount;
  const receiveValue = BASE_PRICES[trade.receive.resource] * trade.receive.amount;
  return trade.type === 'buy' ? receiveValue - giveValue : giveValue - receiveValue;
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
