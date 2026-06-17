import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { TRAPS, MAX_GARRISON_SLOTS } from '../data/nightRaid';
import { ENEMIES } from '../data/enemies';
import { WARRIORS } from '../data/warriors';
import { RESOURCE_INFO } from '../data/trades';
import type { TrapType } from '../types';

export function NightRaidPanel() {
  const nightRaid = useGameStore((s) => s.nightRaid);
  const warriors = useGameStore((s) => s.warriors);
  const buildings = useGameStore((s) => s.buildings);
  const buildTrap = useGameStore((s) => s.buildTrap);
  const placeTrap = useGameStore((s) => s.placeTrap);
  const removeTrap = useGameStore((s) => s.removeTrap);
  const assignGarrison = useGameStore((s) => s.assignGarrison);
  const unassignGarrison = useGameStore((s) => s.unassignGarrison);
  const startNightRaid = useGameStore((s) => s.startNightRaid);
  const startNightRaidBattle = useGameStore((s) => s.startNightRaidBattle);
  const claimRaidReward = useGameStore((s) => s.claimRaidReward);
  const closeNightRaidResult = useGameStore((s) => s.closeNightRaidResult);
  const canAfford = useGameStore((s) => s.canAfford);

  const [selectedTab, setSelectedTab] = useState<'defense' | 'garrison' | 'reports'>('defense');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showLog, setShowLog] = useState<string | null>(null);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleBuildTrap = (trapType: TrapType) => {
    const result = buildTrap(trapType);
    showMessage(result.message, result.success ? 'success' : 'error');
  };

  const handlePlaceTrap = (trapType: TrapType) => {
    const result = placeTrap(trapType);
    showMessage(result.message, result.success ? 'success' : 'error');
  };

  const handleRemoveTrap = (trapId: string) => {
    removeTrap(trapId);
  };

  const handleAssignGarrison = (warriorId: string) => {
    if (nightRaid.garrisonWarriors.length >= MAX_GARRISON_SLOTS) {
      showMessage('守军已满', 'error');
      return;
    }
    const success = assignGarrison(warriorId);
    if (!success) {
      showMessage('无法分配该战士', 'error');
    }
  };

  const handleUnassignGarrison = (warriorId: string) => {
    unassignGarrison(warriorId);
  };

  const handleStartRaid = () => {
    startNightRaid();
  };

  const handleStartBattle = () => {
    startNightRaidBattle();
  };

  const handleClaimReward = (reportId: string) => {
    const success = claimRaidReward(reportId);
    if (success) {
      showMessage('奖励已领取！进入下一轮备战', 'success');
    }
  };

  const handleCloseResult = () => {
    closeNightRaidResult();
    showMessage('已结算，进入下一轮备战', 'success');
  };

  const canBuildTrapType = (trapType: TrapType): boolean => {
    const config = TRAPS[trapType];
    if (!config) return false;
    if (config.requires) {
      const reqBuilding = buildings.find(
        (b) => b.type === config.requires!.building && !b.isBuilding
      );
      if (!reqBuilding || reqBuilding.level < config.requires.level) return false;
    }
    if (!canAfford(config.cost)) return false;
    return true;
  };

  const availableWarriors = warriors.filter(
    (w) => !nightRaid.garrisonWarriors.includes(w.id)
  );

  const garrisonWarriors = warriors.filter((w) =>
    nightRaid.garrisonWarriors.includes(w.id)
  );

  const activeRaid = nightRaid.activeRaid;

  return (
    <div className="panel night-raid-panel">
      <h3 className="panel-title">🌙 夜袭防守</h3>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="night-raid-stats">
        <div className="stat-item">
          <span className="stat-label">总夜袭</span>
          <span className="stat-value">{nightRaid.totalRaids}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">胜利</span>
          <span className="stat-value win">{nightRaid.totalRaidWins}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">失败</span>
          <span className="stat-value lose">{nightRaid.totalRaidLosses}</span>
        </div>
      </div>

      {activeRaid && (
        <div className="active-raid-alert">
          <div className="raid-header">
            <span className="raid-wave">🌙 第 {activeRaid.wave} 波夜袭！</span>
            {activeRaid.phase === 'warning' && (
              <span className="raid-countdown warning">
                ⚠️ {Math.ceil(activeRaid.warningCountdown)}s 后预警结束
              </span>
            )}
            {activeRaid.phase === 'preparing' && (
              <span className="raid-countdown preparing">
                ⏱️ {Math.ceil(activeRaid.preparationTime)}s 后开战
              </span>
            )}
            {activeRaid.phase === 'result' && (
              <span className={`raid-result ${activeRaid.result}`}>
                {activeRaid.result === 'victory' ? '🏆 胜利！' : '💔 失败'}
              </span>
            )}
          </div>

          {activeRaid.phase !== 'result' && (
            <div className="enemy-preview">
              <div className="preview-title">来袭敌人：</div>
              <div className="enemy-summury">
                {Object.entries(
                  activeRaid.enemies.reduce((acc, e) => {
                    acc[e.type] = (acc[e.type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, count]) => (
                  <span key={type} className="enemy-item">
                    {ENEMIES[type].icon} x{count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeRaid.phase === 'warning' && (
            <button className="btn btn-warning btn-large" onClick={handleStartBattle}>
              ⚡ 立即开始准备
            </button>
          )}

          {activeRaid.phase === 'preparing' && (
            <button className="btn btn-danger btn-large" onClick={handleStartBattle}>
              ⚔️ 立即开战
            </button>
          )}

          {activeRaid.phase === 'result' && (
            <div className="raid-result-detail">
              {activeRaid.result === 'victory' && (
                <div className="result-rewards">
                  <span>胜利奖励：</span>
                  {Object.entries(activeRaid.rewards).map(([res, amount]) => (
                    <span key={res} className="reward-item">
                      {RESOURCE_INFO[res as keyof typeof RESOURCE_INFO]?.icon || '📦'}
                      +{amount}
                    </span>
                  ))}
                </div>
              )}

              <div className="result-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowLog(showLog === activeRaid.id ? null : activeRaid.id)}
                >
                  {showLog === activeRaid.id ? '收起战报' : '查看战报'}
                </button>

                {activeRaid.result === 'victory' ? (
                  <button
                    className="btn btn-success"
                    onClick={handleClaimReward.bind(null, nightRaid.reports[0]?.id || '')}
                  >
                    🎁 领取奖励并结算
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={handleCloseResult}
                  >
                    ✓ 确认结算
                  </button>
                )}
              </div>

              {showLog === activeRaid.id && (
                <div className="battle-log">
                  {activeRaid.battleLog.map((line, i) => (
                    <div key={i} className="log-line">
                      {line}
                    </div>
                  ))}
                </div>
              )}

              <div className="result-hint">
                💡 结算后 {Math.ceil(120)} 秒将迎来下一波夜袭
              </div>
            </div>
          )}
        </div>
      )}

      {!activeRaid && (
        <div className="no-active-raid">
          <div className="next-raid-info">
            下次夜袭倒计时：{Math.ceil(nightRaid.nextRaidIn)}s
          </div>
          <button className="btn btn-primary btn-large" onClick={handleStartRaid}>
            🌙 触发夜袭
          </button>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${selectedTab === 'defense' ? 'active' : ''}`}
          onClick={() => setSelectedTab('defense')}
        >
          🔺 陷阱
        </button>
        <button
          className={`tab ${selectedTab === 'garrison' ? 'active' : ''}`}
          onClick={() => setSelectedTab('garrison')}
        >
          ⚔️ 守军
        </button>
        <button
          className={`tab ${selectedTab === 'reports' ? 'active' : ''}`}
          onClick={() => setSelectedTab('reports')}
        >
          📜 战报
        </button>
      </div>

      {selectedTab === 'defense' && (
        <div className="trap-section">
          <div className="section-title">建造陷阱</div>
          <div className="trap-build-list">
            {Object.values(TRAPS).map((trap) => {
              const available = nightRaid.availableTraps[trap.id] || 0;
              const placed = nightRaid.placedTraps.filter(
                (t) => t.type === trap.id
              ).length;
              const canBuild = canBuildTrapType(trap.id);

              return (
                <div key={trap.id} className={`trap-build-item ${!canBuild ? 'disabled' : ''}`}>
                  <div className="trap-icon">{trap.icon}</div>
                  <div className="trap-info">
                    <div className="trap-name">{trap.name}</div>
                    <div className="trap-desc">{trap.description}</div>
                    <div className="trap-stats">
                      伤害：{trap.damage}
                      {trap.effect && ` | 效果：${trap.effect}`}
                    </div>
                    <div className="trap-cost">
                      {Object.entries(trap.cost).map(([res, amount]) => (
                        <span key={res} className="cost-item">
                          {RESOURCE_INFO[res as keyof typeof RESOURCE_INFO]?.icon || '📦'}
                          {amount}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="trap-actions">
                    <div className="trap-count">
                      库存：{available} | 布置：{placed}/{trap.maxCount}
                    </div>
                    <button
                      className="btn btn-small btn-primary"
                      onClick={() => handleBuildTrap(trap.id)}
                      disabled={!canBuild}
                    >
                      建造
                    </button>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => handlePlaceTrap(trap.id)}
                      disabled={available <= 0 || placed >= trap.maxCount}
                    >
                      布置
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="section-title">已布置陷阱</div>
          <div className="placed-traps">
            {nightRaid.placedTraps.length === 0 ? (
              <div className="empty-text">暂无布置的陷阱</div>
            ) : (
              <div className="placed-trap-list">
                {nightRaid.placedTraps.map((trap, index) => {
                  const config = TRAPS[trap.type];
                  return (
                    <div
                      key={trap.id}
                      className={`placed-trap-item ${trap.triggered ? 'triggered' : ''}`}
                    >
                      <span className="trap-pos">#{index + 1}</span>
                      <span className="trap-icon-small">{config.icon}</span>
                      <span className="trap-name-small">{config.name}</span>
                      {trap.triggered && <span className="trap-status">已触发</span>}
                      {!trap.triggered && !activeRaid && (
                        <button
                          className="btn btn-tiny btn-danger"
                          onClick={() => handleRemoveTrap(trap.id)}
                        >
                          移除
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTab === 'garrison' && (
        <div className="garrison-section">
          <div className="section-title">
            守军分配 ({garrisonWarriors.length}/{MAX_GARRISON_SLOTS})
          </div>

          <div className="garrison-slots">
            {Array.from({ length: MAX_GARRISON_SLOTS }).map((_, i) => {
              const warrior = garrisonWarriors[i];
              return (
                <div key={i} className={`garrison-slot ${warrior ? 'filled' : 'empty'}`}>
                  {warrior ? (
                    <>
                      <span className="slot-warrior-icon">
                        {WARRIORS[warrior.type].icon}
                      </span>
                      <span className="slot-warrior-name">
                        {WARRIORS[warrior.type].name}
                      </span>
                      <button
                        className="btn btn-tiny btn-danger"
                        onClick={() => handleUnassignGarrison(warrior.id)}
                        disabled={!!activeRaid && activeRaid.phase !== 'preparing'}
                      >
                        移出
                      </button>
                    </>
                  ) : (
                    <span className="slot-empty">空位</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="section-title">可用战士</div>
          <div className="available-warriors">
            {availableWarriors.length === 0 ? (
              <div className="empty-text">没有可用的战士</div>
            ) : (
              <div className="warrior-list">
                {availableWarriors.map((warrior) => {
                  const config = WARRIORS[warrior.type];
                  return (
                    <div key={warrior.id} className="warrior-item">
                      <span className="warrior-icon">{config.icon}</span>
                      <div className="warrior-info">
                        <div className="warrior-name">{config.name}</div>
                        <div className="warrior-stats">
                          ⚔️{warrior.attack} 🛡️{warrior.defense} ❤️{warrior.hp}
                        </div>
                      </div>
                      <button
                        className="btn btn-small btn-primary"
                        onClick={() => handleAssignGarrison(warrior.id)}
                        disabled={!!activeRaid && activeRaid.phase !== 'preparing'}
                      >
                        分配
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {nightRaid.garrisonWarriors.length === 0 && (
            <div className="garrison-hint">
              💡 提示：未分配守军时，所有战士都会参与防守
            </div>
          )}
        </div>
      )}

      {selectedTab === 'reports' && (
        <div className="reports-section">
          <div className="section-title">战报记录</div>
          {nightRaid.reports.length === 0 ? (
            <div className="empty-text">暂无战报</div>
          ) : (
            <div className="report-list">
              {nightRaid.reports.map((report) => (
                <div key={report.id} className={`report-item ${report.result}`}>
                  <div className="report-header">
                    <span className="report-wave">第 {report.wave} 波</span>
                    <span className={`report-result ${report.result}`}>
                      {report.result === 'victory' ? '🏆 胜利' : '💔 失败'}
                    </span>
                  </div>
                  <div className="report-stats">
                    <span>击败敌人：{report.enemiesDefeated}</span>
                    <span>触发陷阱：{report.trapsTriggered}</span>
                    <span>我方伤亡：{report.casualties}</span>
                  </div>
                  {report.result === 'victory' && (
                    <div className="report-rewards">
                      <span className="rewards-label">奖励：</span>
                      {Object.entries(report.rewards).map(([res, amount]) => (
                        <span key={res} className="reward-item">
                          {RESOURCE_INFO[res as keyof typeof RESOURCE_INFO]?.icon || '📦'}
                          +{amount}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="report-actions">
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => setShowLog(showLog === report.id ? null : report.id)}
                    >
                      {showLog === report.id ? '收起' : '详情'}
                    </button>
                    {report.result === 'victory' && !report.claimed && (
                      <button
                        className="btn btn-small btn-success"
                        onClick={() => handleClaimReward(report.id)}
                      >
                        领取奖励
                      </button>
                    )}
                    {report.result === 'victory' && report.claimed && (
                      <span className="claimed-badge">已领取</span>
                    )}
                  </div>
                  {showLog === report.id && (
                    <div className="battle-log">
                      {report.log.map((line, i) => (
                        <div key={i} className="log-line">
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
