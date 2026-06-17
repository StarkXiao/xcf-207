import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { ENEMIES } from '../data/enemies';
import { WARRIORS } from '../data/warriors';
import { RESOURCE_INFO } from '../data/trades';

export function BattlePanel() {
  const invasion = useGameStore((s) => s.invasion);
  const startInvasion = useGameStore((s) => s.startInvasion);
  const fightBattle = useGameStore((s) => s.fightBattle);
  const warriors = useGameStore((s) => s.warriors);
  const totalWins = useGameStore((s) => s.totalWins);
  const totalLosses = useGameStore((s) => s.totalLosses);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [showLog, setShowLog] = useState(false);

  const handleFight = () => {
    const result = fightBattle();
    setBattleLog(result.log);
    setShowLog(true);
  };

  return (
    <div className="panel battle-panel">
      <h3 className="panel-title">🛡️ 外敌入侵</h3>

      <div className="battle-stats">
        <div className="stat-item">
          <span className="stat-label">胜场</span>
          <span className="stat-value win">{totalWins}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">败场</span>
          <span className="stat-value lose">{totalLosses}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">军队</span>
          <span className="stat-value">{warriors.length}</span>
        </div>
      </div>

      {!invasion && (
        <button className="btn btn-danger btn-large" onClick={startInvasion}>
          ⚠️ 召唤敌袭
        </button>
      )}

      {invasion && invasion.isActive && (
        <div className="invasion-alert">
          <div className="invasion-header">
            <span className="invasion-wave">⚠️ 第 {invasion.wave} 波入侵！</span>
            <span className="invasion-countdown">
              {Math.ceil(invasion.countdown)}s 后自动开战
            </span>
          </div>

          <div className="enemy-list">
            {invasion.enemies.map((e) => (
              <div key={e.id} className="enemy-unit">
                <span className="enemy-icon">{ENEMIES[e.type].icon}</span>
                <div className="enemy-info">
                  <div className="enemy-name">{ENEMIES[e.type].name}</div>
                  <div className="enemy-stats">
                    ⚔️{e.attack} 🛡️{e.defense} ❤️{Math.floor(e.hp)}
                  </div>
                  <div className="hp-bar">
                    <div
                      className="hp-fill enemy"
                      style={{ width: `${(e.hp / e.maxHp) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="reward-info">
            <span>胜利奖励：</span>
            {Object.entries(invasion.rewards).map(([res, amount]) => (
              <span key={res} className="reward-item">
                {RESOURCE_INFO[res as keyof typeof RESOURCE_INFO].icon} +
                {amount as number}
              </span>
            ))}
          </div>

          <button className="btn btn-danger btn-large" onClick={handleFight}>
            ⚔️ 立即开战
          </button>
        </div>
      )}

      {invasion && !invasion.isActive && invasion.result !== 'pending' && (
        <div className={`battle-result ${invasion.result}`}>
          <div className="result-title">
            {invasion.result === 'victory' ? '🏆 胜利！' : '💔 失败...'}
          </div>
          <button className="btn btn-secondary" onClick={() => setShowLog(!showLog)}>
            {showLog ? '隐藏战报' : '查看战报'}
          </button>
          {showLog && (
            <div className="battle-log">
              {battleLog.map((line, i) => (
                <div key={i} className="log-line">
                  {line}
                </div>
              ))}
            </div>
          )}
          <button
            className="btn btn-primary"
            style={{ marginTop: '8px' }}
            onClick={startInvasion}
          >
            下一波入侵
          </button>
        </div>
      )}

      {warriors.length > 0 && (
        <div className="our-forces">
          <div className="queue-title">我方军队</div>
          <div className="forces-summary">
            {Object.entries(
              warriors.reduce((acc, w) => {
                acc[w.type] = (acc[w.type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <span key={type} className="force-item">
                {WARRIORS[type as keyof typeof WARRIORS].icon} x{count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
