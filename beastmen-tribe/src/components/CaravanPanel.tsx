import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { RESOURCE_INFO } from '../data/trades';
import { getDifficultyColor, getDifficultyName, RISK_EVENTS } from '../data/caravans';
import type { ResourceType } from '../types';

export function CaravanPanel() {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedWarriors, setSelectedWarriors] = useState<string[]>([]);
  const [cargo, setCargo] = useState<Partial<Record<ResourceType, number>>>({});
  const [activeTab, setActiveTab] = useState<'routes' | 'caravans' | 'logs'>('routes');
  
  const tradeRoutes = useGameStore((s) => s.tradeRoutes);
  const caravans = useGameStore((s) => s.caravans);
  const caravanLogs = useGameStore((s) => s.caravanLogs);
  const warriors = useGameStore((s) => s.warriors);
  const resources = useGameStore((s) => s.resources);
  const priceFluctuations = useGameStore((s) => s.priceFluctuations);
  const buildings = useGameStore((s) => s.buildings);
  const startCaravan = useGameStore((s) => s.startCaravan);
  const cancelCaravan = useGameStore((s) => s.cancelCaravan);
  const resolveCaravanRisk = useGameStore((s) => s.resolveCaravanRisk);
  const getCargoCapacity = useGameStore((s) => s.getCargoCapacity);
  const getMaxCaravans = useGameStore((s) => s.getMaxCaravans);
  const activeCaravanCount = useGameStore((s) => s.activeCaravanCount);

  const hasCaravanserai = buildings.some((b) => b.type === 'caravanserai' && !b.isBuilding);

  if (!hasCaravanserai) {
    return (
      <div className="panel caravan-panel">
        <h3 className="panel-title">🐪 商队贸易</h3>
        <div className="locked-info">
          <div className="lock-icon">🔒</div>
          <div>需要建造【商队驿站】后才能派遣商队进行长途贸易</div>
        </div>
      </div>
    );
  }

  const selectedRoute = tradeRoutes.find((r) => r.id === selectedRouteId);
  const totalCargo = Object.values(cargo).reduce((sum, v) => sum + (v || 0), 0);
  const cargoCapacity = getCargoCapacity();
  const maxCaravans = getMaxCaravans();

  const handleCargoChange = (resource: ResourceType, amount: number) => {
    const maxAmount = resources[resource];
    const newAmount = Math.max(0, Math.min(amount, maxAmount, cargoCapacity - totalCargo + (cargo[resource] || 0)));
    setCargo({ ...cargo, [resource]: newAmount });
  };

  const toggleWarrior = (warriorId: string) => {
    if (selectedWarriors.includes(warriorId)) {
      setSelectedWarriors(selectedWarriors.filter((id) => id !== warriorId));
    } else {
      setSelectedWarriors([...selectedWarriors, warriorId]);
    }
  };

  const handleStartCaravan = () => {
    if (!selectedRouteId) return;
    const result = startCaravan(selectedRouteId, cargo, selectedWarriors);
    if (result.success) {
      setSelectedRouteId(null);
      setSelectedWarriors([]);
      setCargo({});
    } else {
      alert(result.message);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return '📈';
      case 'falling': return '📉';
      default: return '➡️';
    }
  };

  return (
    <div className="panel caravan-panel">
      <h3 className="panel-title">🐪 商队贸易</h3>
      
      <div className="caravan-stats">
        <div className="stat-item">
          <span className="stat-label">活跃商队</span>
          <span className="stat-value">{activeCaravanCount}/{maxCaravans}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">货仓容量</span>
          <span className="stat-value">{cargoCapacity}</span>
        </div>
      </div>

      <div className="tab-buttons">
        <button 
          className={`tab-btn ${activeTab === 'routes' ? 'active' : ''}`}
          onClick={() => setActiveTab('routes')}
        >
          🗺️ 贸易路线
        </button>
        <button 
          className={`tab-btn ${activeTab === 'caravans' ? 'active' : ''}`}
          onClick={() => setActiveTab('caravans')}
        >
          🚚 商队状态
        </button>
        <button 
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📜 贸易日志
        </button>
      </div>

      {activeTab === 'routes' && (
        <div className="routes-content">
          <div className="routes-list">
            {tradeRoutes.map((route) => (
              <div
                key={route.id}
                className={`route-card ${selectedRouteId === route.id ? 'selected' : ''} ${!route.unlocked ? 'locked' : ''}`}
                onClick={() => route.unlocked && setSelectedRouteId(route.id)}
              >
                <div className="route-header">
                  <span className="route-icon">{route.icon}</span>
                  <div className="route-info">
                    <div className="route-name">{route.name}</div>
                    <div className="route-destination">→ {route.destination}</div>
                  </div>
                  <div 
                    className="route-difficulty"
                    style={{ color: getDifficultyColor(route.difficulty) }}
                  >
                    {getDifficultyName(route.difficulty)}
                  </div>
                </div>
                <div className="route-details">
                  <span>⏱️ {route.travelTime}秒</span>
                  <span>💰 利润+{Math.round(route.priceBonus * 100)}%</span>
                </div>
                <div className="route-resources">
                  <div className="resource-demand">
                    <span className="label">需求:</span>
                    {route.resourceDemand.map((r) => (
                      <span key={r} className="resource-tag">
                        {RESOURCE_INFO[r].icon} {getTrendIcon(priceFluctuations[r].trend)}
                      </span>
                    ))}
                  </div>
                  <div className="resource-supply">
                    <span className="label">特产:</span>
                    {route.resourceSupply.map((r) => (
                      <span key={r} className="resource-tag">
                        {RESOURCE_INFO[r].icon} {getTrendIcon(priceFluctuations[r].trend)}
                      </span>
                    ))}
                  </div>
                </div>
                {!route.unlocked && (
                  <div className="route-lock-info">
                    🔒 需要第{route.unlockDay}天{route.requiredReputation ? `，声望${route.requiredReputation}` : ''}
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedRoute && (
            <div className="cargo-setup">
              <h4>📦 配置货物</h4>
              
              <div className="cargo-resources">
                {(Object.keys(RESOURCE_INFO) as ResourceType[]).map((resource) => (
                  <div key={resource} className="cargo-row">
                    <span className="cargo-icon">{RESOURCE_INFO[resource].icon}</span>
                    <span className="cargo-name">{RESOURCE_INFO[resource].name}</span>
                    <div className="cargo-controls">
                      <button onClick={() => handleCargoChange(resource, (cargo[resource] || 0) - 10)}>-10</button>
                      <button onClick={() => handleCargoChange(resource, (cargo[resource] || 0) - 1)}>-1</button>
                      <span className="cargo-amount">{cargo[resource] || 0}</span>
                      <button onClick={() => handleCargoChange(resource, (cargo[resource] || 0) + 1)}>+1</button>
                      <button onClick={() => handleCargoChange(resource, (cargo[resource] || 0) + 10)}>+10</button>
                    </div>
                    <span className="cargo-max">/ {resources[resource]}</span>
                  </div>
                ))}
              </div>

              <div className="cargo-summary">
                货物总量: {totalCargo} / {cargoCapacity}
              </div>

              <div className="warrior-selection">
                <h4>⚔️ 选择护送战士 (至少2名)</h4>
                <div className="warriors-grid">
                  {warriors.map((warrior) => (
                    <div
                      key={warrior.id}
                      className={`warrior-slot ${selectedWarriors.includes(warrior.id) ? 'selected' : ''}`}
                      onClick={() => toggleWarrior(warrior.id)}
                    >
                      <span className="warrior-icon">⚔️</span>
                      <div className="warrior-info">
                        <div>Lv.{warrior.level}</div>
                        <div className="warrior-stats">
                          攻{warrior.attack} 防{warrior.defense}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="warriors-count">
                  已选择: {selectedWarriors.length} 名战士
                </div>
              </div>

              <div className="risk-warning">
                <h5>⚠️ 路线风险</h5>
                <div className="risk-list">
                  {selectedRoute.riskEvents.map((riskId) => {
                    const risk = RISK_EVENTS[riskId];
                    return (
                      <div key={riskId} className="risk-item">
                        <span>{risk.icon}</span>
                        <span>{risk.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button 
                className="btn btn-primary start-caravan-btn"
                onClick={handleStartCaravan}
                disabled={totalCargo === 0 || selectedWarriors.length < 2 || activeCaravanCount >= maxCaravans}
              >
                🚚 派遣商队
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'caravans' && (
        <div className="caravans-list">
          {caravans.length === 0 ? (
            <div className="empty-state">暂无商队运行中</div>
          ) : (
            caravans.map((caravan) => {
              const route = tradeRoutes.find((r) => r.id === caravan.routeId);
              const progressPercent = (caravan.progress / caravan.totalTime) * 100;
              
              return (
                <div key={caravan.id} className="caravan-card">
                  <div className="caravan-header">
                    <span className="caravan-icon">🚚</span>
                    <div className="caravan-info">
                      <div className="caravan-name">{route?.name || '未知路线'}</div>
                      <div className="caravan-status">
                        {caravan.status === 'traveling' && '前往目的地'}
                        {caravan.status === 'trading' && '交易中'}
                        {caravan.status === 'returning' && '返程中'}
                        {caravan.status === 'completed' && '已完成'}
                        {caravan.status === 'failed' && '失败'}
                      </div>
                    </div>
                    {caravan.status === 'traveling' && (
                      <button 
                        className="btn btn-danger btn-small"
                        onClick={() => cancelCaravan(caravan.id)}
                      >
                        召回
                      </button>
                    )}
                  </div>

                  {caravan.status !== 'completed' && caravan.status !== 'failed' && (
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}

                  {caravan.currentRisk && (
                    <div className="risk-event-alert">
                      <div className="risk-alert-header">
                        <span className="risk-icon">{caravan.currentRisk.icon}</span>
                        <span className="risk-name">{caravan.currentRisk.name}!</span>
                      </div>
                      <p className="risk-description">{caravan.currentRisk.description}</p>
                      <div className="risk-actions">
                        <button 
                          className="btn btn-danger"
                          onClick={() => resolveCaravanRisk(caravan.id, true)}
                        >
                          ⚔️ 战斗
                        </button>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => resolveCaravanRisk(caravan.id, false)}
                        >
                          💰 花钱消灾
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="caravan-cargo">
                    <span className="label">货物:</span>
                    {Object.entries(caravan.cargo).map(([r, a]) => (
                      a && a > 0 ? (
                        <span key={r} className="cargo-tag">
                          {RESOURCE_INFO[r as ResourceType].icon} {a}
                        </span>
                      ) : null
                    ))}
                    {caravan.gold > 0 && (
                      <span className="cargo-tag">🪙 {caravan.gold}</span>
                    )}
                  </div>

                  {caravan.status === 'completed' && (
                    <div className="caravan-profit">
                      <span className="label">利润:</span>
                      {Object.entries(caravan.profit).map(([r, a]) => (
                        a && a > 0 ? (
                          <span key={r} className="profit-tag success">
                            {RESOURCE_INFO[r as ResourceType].icon} +{a}
                          </span>
                        ) : null
                      ))}
                    </div>
                  )}

                  <div className="caravan-log">
                    {caravan.log.slice(-3).map((log, i) => (
                      <div key={i} className="log-entry">{log}</div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="caravan-logs">
          {caravanLogs.length === 0 ? (
            <div className="empty-state">暂无贸易日志</div>
          ) : (
            [...caravanLogs].reverse().slice(0, 20).map((log) => (
              <div key={log.id} className={`log-item ${log.type}`}>
                <span className="log-day">第{log.day}天</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
