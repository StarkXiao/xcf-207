import { useGameStore } from '../store/useGameStore';
import { RESOURCE_INFO } from '../data/trades';
import type { Resources } from '../types';

export function TradePanel() {
  const trades = useGameStore((s) => s.trades);
  const executeTrade = useGameStore((s) => s.executeTrade);
  const refreshTrades = useGameStore((s) => s.refreshTrades);
  const resources = useGameStore((s) => s.resources);
  const buildings = useGameStore((s) => s.buildings);

  const hasMarket = buildings.some((b) => b.type === 'market' && !b.isBuilding);

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

  return (
    <div className="panel trade-panel">
      <h3 className="panel-title">🏪 部落交易</h3>

      <button
        className="btn btn-secondary refresh-btn"
        onClick={refreshTrades}
        disabled={resources.gold < 20}
      >
        🔄 刷新交易 (🪙 20)
      </button>

      <div className="trade-list">
        {trades.map((trade) => {
          const canTrade =
            trade.stock > 0 &&
            resources[trade.give.resource as keyof Resources] >= trade.give.amount;

          return (
            <div
              key={trade.id}
              className={`trade-card ${canTrade ? '' : 'disabled'}`}
              onClick={() => canTrade && executeTrade(trade.id)}
            >
              <div className="trade-type">
                {trade.type === 'buy' ? '📥 收购' : '📤 出售'}
              </div>
              <div className="trade-exchange">
                <div className="trade-side">
                  <span className="trade-icon">
                    {RESOURCE_INFO[trade.give.resource].icon}
                  </span>
                  <span
                    className={`trade-amount ${
                      resources[trade.give.resource as keyof Resources] >=
                      trade.give.amount
                        ? ''
                        : 'insufficient'
                    }`}
                  >
                    {trade.give.amount}
                  </span>
                </div>
                <span className="trade-arrow">→</span>
                <div className="trade-side">
                  <span className="trade-icon">
                    {RESOURCE_INFO[trade.receive.resource].icon}
                  </span>
                  <span className="trade-amount gain">{trade.receive.amount}</span>
                </div>
              </div>
              <div className="trade-stock">
                库存：{trade.stock}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hint">交易报价每局随机生成，点击刷新可更换</div>
    </div>
  );
}
