import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { RESOURCE_INFO } from '../data/trades';
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
  const negotiation = useGameStore((s) => s.negotiation);
  const startNegotiation = useGameStore((s) => s.startNegotiation);
  const attemptNegotiation = useGameStore((s) => s.attemptNegotiation);
  const cancelNegotiation = useGameStore((s) => s.cancelNegotiation);
  const wantedLevel = useGameStore((s) => s.wantedLevel);
  const lastBlackMarketRefresh = useGameStore((s) => s.lastBlackMarketRefresh);

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

  const calculatePrice = (basePrice: number, tradeType: string, resource: string, priceModifier: number) => {
    const fluctuation = priceFluctuations[resource as keyof Resources]?.currentMultiplier || 1;
    const modifier = priceModifier || 1;
    if (tradeType === 'buy') {
      return Math.ceil(basePrice * fluctuation * modifier);
    }
    return Math.ceil(basePrice * fluctuation * modifier);
  };

  const getNegotiationMoodEmoji = (mood: number) => {
    if (mood >= 70) return '😊';
    if (mood >= 40) return '😐';
    return '😠';
  };

  const refreshCooldown = Math.max(0, 60 - Math.floor((Date.now() - lastBlackMarketRefresh) / 1000));

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
          <div className="price-overview">
            <h5 className="overview-title">📊 价格行情</h5>
            <div className="price-list">
              {(Object.keys(RESOURCE_INFO) as (keyof Resources)[]).map((resource) => {
                const info = RESOURCE_INFO[resource];
                const fluct = priceFluctuations[resource];
                if (!fluct) return null;
                const priceChange = ((fluct.currentMultiplier - 1) * 100).toFixed(1);
                return (
                  <div key={resource} className="price-item">
                    <span className="price-icon">{info.icon}</span>
                    <span className="price-name">{info.name}</span>
                    <span className="price-multiplier">×{fluct.currentMultiplier.toFixed(2)}</span>
                    <span 
                      className="price-trend"
                      style={{ color: getTrendColor(fluct.trend) }}
                    >
                      {getTrendIcon(fluct.trend)} {priceChange > 0 ? '+' : ''}{priceChange}%
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

          {negotiation.isActive && (
            <div className="negotiation-panel">
              <div className="negotiation-header">
                <span className="negotiation-icon">🤝</span>
                <div className="negotiation-info">
                  <h5>议价中...</h5>
                  <div className="negotiation-mood">
                    对方心情: {getNegotiationMoodEmoji(negotiation.partnerMood)} ({negotiation.partnerMood}/100)
                  </div>
                  <div className="negotiation-attempts">
                    剩余尝试次数: {negotiation.attemptsLeft}
                  </div>
                  <div className="negotiation-current">
                    当前价格系数: ×{negotiation.currentModifier.toFixed(2)}
                    {negotiation.currentModifier < 1 && ' (优惠!)'}
                    {negotiation.currentModifier > 1 && ' (加价...)'}
                  </div>
                </div>
              </div>
              <div className="negotiation-actions">
                <button 
                  className="btn btn-danger"
                  onClick={() => attemptNegotiation(true)}
                  disabled={negotiation.attemptsLeft <= 0}
                >
                  🎯 激进议价
                  <div className="btn-hint">高风险高回报</div>
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => attemptNegotiation(false)}
                  disabled={negotiation.attemptsLeft <= 0}
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
              const priceModifier = negotiation.isActive && negotiation.tradeId === trade.id 
                ? negotiation.currentModifier 
                : 1;
              const giveAmount = calculatePrice(trade.give.amount, trade.type, trade.give.resource, priceModifier);
              const canTrade =
                trade.stock > 0 &&
                resources[trade.give.resource as keyof Resources] >= giveAmount;
              const isNegotiating = negotiation.isActive && negotiation.tradeId === trade.id;

              return (
                <div
                  key={trade.id}
                  className={`trade-card ${canTrade ? '' : 'disabled'} ${isNegotiating ? 'negotiating' : ''}`}
                >
                  <div className="trade-type">
                    {trade.type === 'buy' ? '📥 收购' : '📤 出售'}
                    {trade.priceModifier !== 1 && (
                      <span className={`trade-bonus ${trade.priceModifier > 1 ? 'positive' : 'negative'}`}>
                        {trade.priceModifier > 1 ? '+' : ''}{Math.round((trade.priceModifier - 1) * 100)}%
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
                    {!negotiation.isActive && (
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
              const canTrade = 
                resources[offer.giveResource as keyof Resources] >= offer.giveAmount &&
                offer.stock > 0;
              const ratio = (offer.receiveAmount / offer.giveAmount).toFixed(2);
              const isGoodDeal = offer.ratioMultiplier > 1.4;
              const isBadDeal = offer.ratioMultiplier < 0.7;

              return (
                <div
                  key={offer.id}
                  className={`trade-card blackmarket ${canTrade ? '' : 'disabled'} ${isGoodDeal ? 'good-deal' : ''} ${isBadDeal ? 'bad-deal' : ''}`}
                  onClick={() => canTrade && acceptBlackMarketOffer(offer.id)}
                >
                  <div className="trade-type">
                    {offer.isBuy ? '📥 收购' : '📤 出售'}
                    <span className="risk-badge">
                      风险: {'🔥'.repeat(offer.riskLevel)}
                    </span>
                  </div>
                  <div className="trade-exchange">
                    <div className="trade-side">
                      <span className="trade-icon">
                        {RESOURCE_INFO[offer.giveResource as keyof Resources].icon}
                      </span>
                      <span
                        className={`trade-amount ${
                          resources[offer.giveResource as keyof Resources] >= offer.giveAmount
                            ? ''
                            : 'insufficient'
                        }`}
                      >
                        {offer.giveAmount}
                      </span>
                    </div>
                    <span className="trade-arrow">→</span>
                    <div className="trade-side">
                      <span className="trade-icon">
                        {RESOURCE_INFO[offer.receiveResource as keyof Resources].icon}
                      </span>
                      <span className="trade-amount gain">{offer.receiveAmount}</span>
                    </div>
                  </div>
                  <div className="trade-ratio">
                    比率: {ratio} 
                    {isGoodDeal && <span className="good-tag">好价!</span>}
                    {isBadDeal && <span className="bad-tag">风险高</span>}
                  </div>
                  <div className="trade-stock">
                    库存：{offer.stock}
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
