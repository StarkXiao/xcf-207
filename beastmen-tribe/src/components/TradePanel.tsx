import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { RESOURCE_INFO } from '../data/trades';
import { getSupplyLineStatusName, getSupplyLineStatusIcon, getSupplyLineModifier } from '../data/arsenal';
import type { Resources } from '../types';

export function TradePanel() {
  const [activeTab, setActiveTab] = useState<'normal' | 'blackmarket'>('normal');
  
  const trades = useGameStore((s) => s.trades);
  const executeTrade = useGameStore((s) => s.executeTrade);
  const refreshTrades = useGameStore((s) => s.refreshTrades);
  const resources = useGameStore((s) => s.resources);
  const buildings = useGameStore((s) => s.buildings);
  const priceFluctuations = useGameStore((s) => s.priceFluctuations);
  const blackMarketOffers = useGameStore((s) => s.blackMarketOffers);
  const acceptBlackMarketOffer = useGameStore((s) => s.acceptBlackMarketOffer);
  const refreshBlackMarket = useGameStore((s) => s.refreshBlackMarket);
  const currentNegotiation = useGameStore((s) => s.currentNegotiation);
  const startNegotiation = useGameStore((s) => s.startNegotiation);
  const attemptNegotiation = useGameStore((s) => s.attemptNegotiation);
  const cancelNegotiation = useGameStore((s) => s.cancelNegotiation);
  const wantedLevel = useGameStore((s) => s.wantedLevel);
  const lastBlackMarketRefresh = useGameStore((s) => s.lastBlackMarketRefresh);
  const arsenal = useGameStore((s) => s.arsenal);

  const hasMarket = buildings.some((b) => b.type === 'market' && !b.isBuilding);
  const hasSmugglersDen = buildings.some((b) => b.type === 'smugglers_den' && !b.isBuilding);

  if (!hasMarket) {
    return (
      <div className="panel trade-panel">
        <h3 className="panel-title">🏪 部落交易</h3>
        <div className="locked-info">
          <div className="lock-icon">🔒</div>
          <div>需要建造【交易市场】后才能与其他部落进行贸易</div>
        </div>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return '📈';
      case 'falling': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'rising': return '#e74c3c';
      case 'falling': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const calculatePrice = (baseAmount: number, resource: string, modifier: number) => {
    const fluctuation = priceFluctuations[resource as keyof Resources]?.currentMultiplier || 1;
    return Math.ceil(baseAmount * fluctuation * modifier);
  };

  const getNegotiationMoodEmoji = (mood: number) => {
    const moodPercent = mood * 100;
    if (moodPercent >= 70) return '😊';
    if (moodPercent >= 40) return '😐';
    return '😠';
  };

  const refreshCooldown = Math.max(0, 60 - Math.floor((Date.now() - lastBlackMarketRefresh) / 1000));

  const isNegotiating = currentNegotiation !== null;

  return (
    <div className="panel trade-panel">
      <h3 className="panel-title">🏪 部落交易</h3>

      <div className="tab-buttons">
        <button 
          className={`tab-btn ${activeTab === 'normal' ? 'active' : ''}`}
          onClick={() => setActiveTab('normal')}
        >
          🏪 普通交易
        </button>
        {hasSmugglersDen && (
          <button 
            className={`tab-btn ${activeTab === 'blackmarket' ? 'active' : ''}`}
            onClick={() => setActiveTab('blackmarket')}
          >
            🌑 黑市交易
          </button>
        )}
      </div>

      {activeTab === 'normal' && (
        <>
          <div className="supply-line-status">
            <div className="supply-line-header">
              <span className="supply-line-icon">{getSupplyLineStatusIcon(arsenal.supplyLineStatus)}</span>
              <span className="supply-line-title">军备补给线</span>
              <span className={`supply-line-status-badge ${arsenal.supplyLineStatus}`}>
                {getSupplyLineStatusName(arsenal.supplyLineStatus)}
              </span>
            </div>
            <div className="supply-line-effects">
              <div className="supply-line-effect">
                <span>铁矿买入价:</span>
                <span className={arsenal.supplyLineStatus === 'disrupted' ? 'negative' : arsenal.supplyLineStatus === 'boosted' ? 'positive' : ''}>
                  {getSupplyLineModifier(arsenal.supplyLineStatus).costMod > 1 ? '+' : ''}
                  {Math.round((getSupplyLineModifier(arsenal.supplyLineStatus).costMod - 1) * 100)}%
                </span>
              </div>
              <div className="supply-line-effect">
                <span>铁矿卖出价:</span>
                <span className={arsenal.supplyLineStatus === 'boosted' ? 'positive' : arsenal.supplyLineStatus === 'disrupted' ? 'negative' : ''}>
                  {getSupplyLineModifier(arsenal.supplyLineStatus).costMod < 1 ? '' : '+'}
                  {Math.round((1 / getSupplyLineModifier(arsenal.supplyLineStatus).costMod - 1) * 100)}%
                </span>
              </div>
            </div>
          </div>

          <div className="price-overview">
            <h5 className="overview-title">📊 价格行情</h5>
            <div className="price-list">
              {(Object.keys(RESOURCE_INFO) as (keyof Resources)[]).map((resource) => {
                const info = RESOURCE_INFO[resource];
                const fluct = priceFluctuations[resource];
                if (!fluct) return null;
                const priceChangeNum = (fluct.currentMultiplier - 1) * 100;
                const priceChangeStr = priceChangeNum.toFixed(1);
                return (
                  <div key={resource} className="price-item">
                    <span className="price-icon">{info.icon}</span>
                    <span className="price-name">{info.name}</span>
                    <span className="price-multiplier">×{fluct.currentMultiplier.toFixed(2)}</span>
                    <span 
                      className="price-trend"
                      style={{ color: getTrendColor(fluct.trend) }}
                    >
                      {getTrendIcon(fluct.trend)} {priceChangeNum > 0 ? '+' : ''}{priceChangeStr}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            className="btn btn-secondary refresh-btn"
            onClick={refreshTrades}
            disabled={resources.gold < 20}
          >
            🔄 刷新交易 (🪙 20)
          </button>

          {isNegotiating && currentNegotiation && (
            <div className="negotiation-panel">
              <div className="negotiation-header">
                <span className="negotiation-icon">🤝</span>
                <div className="negotiation-info">
                  <h5>议价中...</h5>
                  <div className="negotiation-mood">
                    对方心情: {getNegotiationMoodEmoji(currentNegotiation.opponentMood)} ({Math.round(currentNegotiation.opponentMood * 100)}/100)
                  </div>
                  <div className="negotiation-attempts">
                    剩余尝试次数: {currentNegotiation.maxAttempts - currentNegotiation.attempts}
                  </div>
                  <div className="negotiation-current">
                    当前价格系数: ×{currentNegotiation.currentModifier.toFixed(2)}
                    {currentNegotiation.currentModifier < 1 && ' (优惠!)'}
                    {currentNegotiation.currentModifier > 1 && ' (加价...)'}
                  </div>
                </div>
              </div>
              <div className="negotiation-actions">
                <button 
                  className="btn btn-danger"
                  onClick={() => attemptNegotiation(true)}
                  disabled={currentNegotiation.attempts >= currentNegotiation.maxAttempts}
                >
                  🎯 激进议价
                  <div className="btn-hint">高风险高回报</div>
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => attemptNegotiation(false)}
                  disabled={currentNegotiation.attempts >= currentNegotiation.maxAttempts}
                >
                  🌱 温和议价
                  <div className="btn-hint">更可能成功但幅度小</div>
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={cancelNegotiation}
                >
                  🏃 结束议价
                </button>
              </div>
            </div>
          )}

          <div className="trade-list">
            {trades.map((trade) => {
              const negotiationModifier = isNegotiating && currentNegotiation?.tradeId === trade.id 
                ? currentNegotiation.currentModifier 
                : 1;
              const giveAmount = calculatePrice(trade.give.amount, trade.give.resource, negotiationModifier);
              const canTrade =
                trade.stock > 0 &&
                resources[trade.give.resource as keyof Resources] >= giveAmount;
              const isThisNegotiating = isNegotiating && currentNegotiation?.tradeId === trade.id;
              const hasBonus = trade.currentPriceMultiplier !== 1;

              return (
                <div
                  key={trade.id}
                  className={`trade-card ${canTrade ? '' : 'disabled'} ${isThisNegotiating ? 'negotiating' : ''}`}
                >
                  <div className="trade-type">
                    {trade.type === 'buy' ? '📥 收购' : '📤 出售'}
                    {hasBonus && (
                      <span className={`trade-bonus ${trade.currentPriceMultiplier > 1 ? 'positive' : 'negative'}`}>
                        {trade.currentPriceMultiplier > 1 ? '+' : ''}{Math.round((trade.currentPriceMultiplier - 1) * 100)}%
                      </span>
                    )}
                    {trade.affectedBySupplyLine && (
                      <span className="supply-line-tag" title="受军备补给线影响">
                        🔗
                      </span>
                    )}
                  </div>
                  <div className="trade-exchange">
                    <div className="trade-side">
                      <span className="trade-icon">
                        {RESOURCE_INFO[trade.give.resource].icon}
                      </span>
                      <span
                        className={`trade-amount ${
                          resources[trade.give.resource as keyof Resources] >= giveAmount
                            ? ''
                            : 'insufficient'
                        }`}
                      >
                        {giveAmount}
                      </span>
                      <span 
                        className="trade-trend"
                        style={{ color: getTrendColor(priceFluctuations[trade.give.resource as keyof Resources]?.trend) }}
                      >
                        {getTrendIcon(priceFluctuations[trade.give.resource as keyof Resources]?.trend)}
                      </span>
                    </div>
                    <span className="trade-arrow">→</span>
                    <div className="trade-side">
                      <span className="trade-icon">
                        {RESOURCE_INFO[trade.receive.resource].icon}
                      </span>
                      <span className="trade-amount gain">{trade.receive.amount}</span>
                      <span 
                        className="trade-trend"
                        style={{ color: getTrendColor(priceFluctuations[trade.receive.resource as keyof Resources]?.trend) }}
                      >
                        {getTrendIcon(priceFluctuations[trade.receive.resource as keyof Resources]?.trend)}
                      </span>
                    </div>
                  </div>
                  <div className="trade-stock">
                    库存：{trade.stock}
                  </div>
                  <div className="trade-actions">
                    <button
                      className={`btn btn-primary btn-small ${canTrade ? '' : 'disabled'}`}
                      onClick={() => canTrade && executeTrade(trade.id)}
                      disabled={!canTrade}
                    >
                      交易
                    </button>
                    {!isNegotiating && (
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={() => startNegotiation(trade.id)}
                      >
                        议价
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hint">交易报价随时间波动，刷新需20金币</div>
        </>
      )}

      {activeTab === 'blackmarket' && hasSmugglersDen && (
        <>
          <div className="blackmarket-header">
            <div className="wanted-level">
              <span className="wanted-label">通缉等级:</span>
              <div className="wanted-stars">
                {[1, 2, 3, 4, 5].map((level) => (
                  <span 
                    key={level} 
                    className={`wanted-star ${level <= wantedLevel ? 'active' : ''}`}
                  >
                    {level <= wantedLevel ? '⭐' : '☆'}
                  </span>
                ))}
              </div>
            </div>
            <button
              className="btn btn-secondary refresh-btn"
              onClick={refreshBlackMarket}
              disabled={refreshCooldown > 0}
            >
              🔄 刷新黑市 {refreshCooldown > 0 ? `(${refreshCooldown}s)` : ''}
            </button>
          </div>

          {wantedLevel > 0 && (
            <div className="wanted-warning">
              ⚠️ 当前通缉等级 {wantedLevel}，交易时有 {wantedLevel * 10}% 概率被发现！
            </div>
          )}

          <div className="trade-list">
            {blackMarketOffers.map((offer) => {
              const tradeOffer = offer.tradeOffer;
              const canTrade = 
                resources[tradeOffer.give.resource as keyof Resources] >= tradeOffer.give.amount &&
                tradeOffer.stock > 0;
              const ratio = (tradeOffer.receive.amount / tradeOffer.give.amount).toFixed(2);
              const ratioMultiplier = tradeOffer.receive.amount / tradeOffer.give.amount;
              const isGoodDeal = ratioMultiplier > 1.4;
              const isBadDeal = ratioMultiplier < 0.7;
              const isBuy = tradeOffer.type === 'buy';

              return (
                <div
                  key={offer.id}
                  className={`trade-card blackmarket ${canTrade ? '' : 'disabled'} ${isGoodDeal ? 'good-deal' : ''} ${isBadDeal ? 'bad-deal' : ''}`}
                  onClick={() => canTrade && acceptBlackMarketOffer(offer.id)}
                >
                  <div className="trade-type">
                    {isBuy ? '📥 收购' : '📤 出售'}
                    <span className="risk-badge">
                      风险: {'🔥'.repeat(offer.riskLevel)}
                    </span>
                  </div>
                  <div className="trade-exchange">
                    <div className="trade-side">
                      <span className="trade-icon">
                        {RESOURCE_INFO[tradeOffer.give.resource].icon}
                      </span>
                      <span
                        className={`trade-amount ${
                          resources[tradeOffer.give.resource as keyof Resources] >= tradeOffer.give.amount
                            ? ''
                            : 'insufficient'
                        }`}
                      >
                        {tradeOffer.give.amount}
                      </span>
                    </div>
                    <span className="trade-arrow">→</span>
                    <div className="trade-side">
                      <span className="trade-icon">
                        {RESOURCE_INFO[tradeOffer.receive.resource].icon}
                      </span>
                      <span className="trade-amount gain">{tradeOffer.receive.amount}</span>
                    </div>
                  </div>
                  <div className="trade-ratio">
                    比率: {ratio} 
                    {isGoodDeal && <span className="good-tag">好价!</span>}
                    {isBadDeal && <span className="bad-tag">风险高</span>}
                  </div>
                  <div className="trade-stock">
                    库存：{tradeOffer.stock}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hint">黑市交易利润丰厚，但风险也高。被发现可能会被罚款或降低声望。</div>
        </>
      )}
    </div>
  );
}
