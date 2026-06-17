import { useState, useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';
import { ENEMIES, BOSSES, BOSS_WAVE_INTERVAL, isBossWave as checkIsBossWave } from '../data/enemies';
import { WARRIORS, UNIT_CLASS_INFO, POSITION_INFO, getCounterBonus } from '../data/warriors';
import { RESOURCE_INFO } from '../data/trades';
import type { BattleLogEntry, BattleLogType, PositionRow, Warrior, Enemy, BossSkillWarning, TieredReward, FailureCompensation } from '../types';

const LOG_TYPE_STYLES: Record<BattleLogType, string> = {
  attack: 'log-attack',
  counter: 'log-counter',
  kill: 'log-kill',
  death: 'log-death',
  heal: 'log-heal',
  buff: 'log-buff',
  debuff: 'log-debuff',
  morale: 'log-morale',
  round: 'log-round',
  system: 'log-system',
  counter_attack: 'log-counter-attack',
  critical: 'log-critical',
  crush: 'log-crush',
};

const POSITION_ORDER: PositionRow[] = ['front', 'middle', 'back'];

const MoraleBar = ({ value, label }: { value: number; label: string }) => {
  const color = value >= 70 ? '#4ade80' : value >= 50 ? '#facc15' : value >= 30 ? '#fb923c' : '#ef4444';
  return (
    <div className="morale-bar-wrap">
      <span className="morale-label">{label}</span>
      <div className="morale-bar">
        <div className="morale-fill" style={{ width: `${Math.min(100, value)}%`, background: color }} />
        <span className="morale-value">{value}</span>
      </div>
    </div>
  );
};

const UnitPositionRow = ({
  title,
  icon,
  units,
  isEnemy = false,
}: {
  title: string;
  icon: string;
  units: (Warrior | Enemy)[];
  isEnemy?: boolean;
}) => {
  if (units.length === 0) return null;
  return (
    <div className={`position-row ${isEnemy ? 'enemy' : 'ally'}`}>
      <div className="position-header">
        <span>{icon} {title}</span>
        <span className="position-count">x{units.length}</span>
      </div>
      <div className="units-grid">
        {units.map((u) => {
          const cfg = isEnemy ? ENEMIES[(u as Enemy).type] : WARRIORS[(u as Warrior).type];
          const hpPercent = (u.hp / u.maxHp) * 100;
          return (
            <div key={u.id} className="unit-card">
              <span className="unit-icon">{cfg.icon}</span>
              <div className="unit-stats">
                <div className="unit-name">{cfg.name}</div>
                <div className="hp-bar small">
                  <div
                    className={`hp-fill ${isEnemy ? 'enemy' : 'ally'}`}
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
                <div className="unit-hp-text">{Math.ceil(u.hp)}/{u.maxHp}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BattleFormation = ({
  warriors,
  enemies,
}: {
  warriors: Warrior[];
  enemies: Enemy[];
}) => {
  const getByPos = (units: (Warrior | Enemy)[], pos: PositionRow) =>
    units.filter((u) => u.position === pos);

  return (
    <div className="battle-formation">
      <div className="formation-side ally-side">
        <div className="side-title">🟢 我方阵型</div>
        {POSITION_ORDER.map((pos) => (
          <UnitPositionRow
            key={`a-${pos}`}
            title={POSITION_INFO[pos].name}
            icon={POSITION_INFO[pos].icon}
            units={getByPos(warriors, pos)}
          />
        ))}
      </div>
      <div className="formation-divider">⚔️</div>
      <div className="formation-side enemy-side">
        <div className="side-title">🔴 敌方阵型</div>
        {[...POSITION_ORDER].reverse().map((pos) => (
          <UnitPositionRow
            key={`e-${pos}`}
            title={POSITION_INFO[pos].name}
            icon={POSITION_INFO[pos].icon}
            units={getByPos(enemies, pos)}
            isEnemy
          />
        ))}
      </div>
    </div>
  );
};

const CounterHint = ({ warriors, enemies }: { warriors: Warrior[]; enemies: Enemy[] }) => {
  const hints = useMemo(() => {
    const result: { from: string; fromIcon: string; to: string; toIcon: string; bonus: number }[] = [];
    const wTypes = new Set(warriors.map((w) => w.type));
    const eTypes = new Set(enemies.map((e) => e.type));
    for (const wt of wTypes) {
      const wc = WARRIORS[wt];
      for (const et of eTypes) {
        const ec = ENEMIES[et];
        const bonus = getCounterBonus(wc.unitClass, ec.unitClass);
        if (Math.abs(bonus) >= 0.1) {
          result.push({
            from: wc.name,
            fromIcon: wc.icon,
            to: ec.name,
            toIcon: ec.icon,
            bonus,
          });
        }
      }
    }
    return result;
  }, [warriors, enemies]);

  if (hints.length === 0) return null;
  return (
    <div className="counter-hints">
      <div className="hint-title">🎯 兵种克制提示</div>
      <div className="hint-list">
        {hints.map((h, i) => (
          <div
            key={i}
            className={`hint-item ${h.bonus > 0 ? 'advantage' : 'disadvantage'}`}
          >
            {h.fromIcon}{h.from} → {h.toIcon}{h.to}
            <span className="hint-bonus">
              {h.bonus > 0 ? '▲' : '▼'}{Math.floor(Math.abs(h.bonus) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const BossSkillWarningDisplay = ({ warnings }: { warnings: BossSkillWarning[] }) => {
  if (warnings.length === 0) return null;
  return (
    <div className="boss-skill-warnings">
      <div className="warning-title">⚠️ Boss技能预警</div>
      {warnings.map((w, i) => (
        <div key={i} className={`skill-warning ${w.remainingRounds <= 1 ? 'imminent' : ''}`}>
          <span className="warning-icon">{w.skill.icon}</span>
          <div className="warning-info">
            <span className="warning-name">{w.skill.name}</span>
            <span className="warning-desc">{w.skill.description}</span>
          </div>
          <span className={`warning-countdown ${w.remainingRounds <= 1 ? 'urgent' : ''}`}>
            {w.remainingRounds}回合后
          </span>
        </div>
      ))}
    </div>
  );
};

const WallDurabilityBar = ({ wall }: { wall: { currentHp: number; maxHp: number; level: number } }) => {
  const percent = wall.maxHp > 0 ? (wall.currentHp / wall.maxHp) * 100 : 0;
  const color = percent > 70 ? '#4ade80' : percent > 30 ? '#facc15' : percent > 0 ? '#fb923c' : '#ef4444';
  return (
    <div className="wall-durability-section">
      <div className="wall-header">
        <span className="wall-title">🧱 城墙耐久</span>
        <span className="wall-level">Lv.{wall.level}</span>
      </div>
      <div className="wall-bar">
        <div className="wall-fill" style={{ width: `${percent}%`, background: color }} />
      </div>
      <div className="wall-values">
        <span style={{ color }}>{wall.currentHp}</span> / {wall.maxHp}
      </div>
      {percent <= 0 && <div className="wall-broken">💥 城墙已破！城防加成归零</div>}
    </div>
  );
};

const TieredRewardsDisplay = ({ rewards, achievedTier }: { rewards: TieredReward[]; achievedTier: string | null }) => {
  return (
    <div className="tiered-rewards">
      <div className="tiered-title">🏅 奖励分层结算</div>
      {rewards.map((reward) => {
        const isAchieved = achievedTier === reward.tier;
        const isHigher = achievedTier && rewards.findIndex(r => r.tier === achievedTier) >= rewards.findIndex(r => r.tier === reward.tier);
        return (
          <div key={reward.tier} className={`tier-item ${isAchieved ? 'achieved' : ''} ${isHigher && !isAchieved ? 'surpassed' : ''}`}>
            <div className="tier-header">
              <span className="tier-icon">{reward.icon}</span>
              <span className="tier-label">{reward.label}</span>
              {isAchieved && <span className="tier-badge">✓ 已达成</span>}
            </div>
            <div className="tier-condition">{reward.condition}</div>
            <div className="tier-resources">
              {Object.entries(reward.resources).map(([key, amount]) => (
                <span key={key} className="tier-resource">
                  {RESOURCE_INFO[key as keyof typeof RESOURCE_INFO]?.icon || '📦'}+{amount}
                </span>
              ))}
              {reward.loyaltyBonus > 0 && (
                <span className="tier-loyalty">❤️+{reward.loyaltyBonus}</span>
              )}
              {reward.expBonus > 0 && (
                <span className="tier-exp">⭐+{reward.expBonus}经验</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const FailureCompensationDisplay = ({ compensation }: { compensation: FailureCompensation }) => {
  return (
    <div className="failure-compensation">
      <div className="compensation-title">🩹 失败补偿</div>
      <div className="compensation-stats">
        <div className="comp-stat">
          <span className="comp-label">造成伤害</span>
          <span className="comp-value">{compensation.damageDealt}</span>
        </div>
        <div className="comp-stat">
          <span className="comp-label">击杀敌人</span>
          <span className="comp-value">{compensation.enemiesDefeated}</span>
        </div>
        <div className="comp-stat">
          <span className="comp-label">存活回合</span>
          <span className="comp-value">{compensation.roundsSurvived}</span>
        </div>
      </div>
      <div className="compensation-details">
        {Object.entries(compensation.resources).some(([, v]) => (v as number) > 0) && (
          <div className="comp-resources">
            <span className="comp-label">资源补偿：</span>
            {Object.entries(compensation.resources)
              .filter(([, v]) => (v as number) > 0)
              .map(([key, amount]) => (
                <span key={key} className="comp-resource">
                  {RESOURCE_INFO[key as keyof typeof RESOURCE_INFO]?.icon || '📦'}+{amount}
                </span>
              ))}
          </div>
        )}
        {compensation.warriorRecoveryRate > 0 && (
          <div className="comp-recovery">
            💊 伤员恢复率：{Math.floor(compensation.warriorRecoveryRate * 100)}%
          </div>
        )}
        {compensation.loyaltyMitigation > 0 && (
          <div className="comp-loyalty">
            ❤️ 忠诚减免：+{compensation.loyaltyMitigation}
          </div>
        )}
      </div>
    </div>
  );
};

const BattleSummaryCard = ({ summary }: { summary: any }) => {
  if (!summary) return null;
  return (
    <div className="battle-summary">
      <div className="summary-title">📊 战斗统计</div>
      <div className="summary-grid">
        <div className="summary-item">
          <span className="s-label">总伤害</span>
          <span className="s-value damage">{summary.totalDamageDealt}</span>
        </div>
        <div className="summary-item">
          <span className="s-label">承受伤害</span>
          <span className="s-value taken">{summary.totalDamageTaken}</span>
        </div>
        <div className="summary-item">
          <span className="s-label">治疗量</span>
          <span className="s-value heal">{summary.totalHealing}</span>
        </div>
        <div className="summary-item">
          <span className="s-label">暴击次数</span>
          <span className="s-value crit">{summary.criticalHits}</span>
        </div>
        <div className="summary-item">
          <span className="s-label">连杀追击</span>
          <span className="s-value counter">{summary.countersTriggered}</span>
        </div>
        <div className="summary-item">
          <span className="s-label">士气变化</span>
          <span className={`s-value morale ${summary.moraleChanges >= 0 ? 'pos' : 'neg'}`}>
            {summary.moraleChanges >= 0 ? '+' : ''}{summary.moraleChanges}
          </span>
        </div>
        {summary.highestDamage?.name && (
          <div className="summary-item wide">
            <span className="s-label">🔥 最高输出</span>
            <span className="s-value highlight">{summary.highestDamage.name} - {summary.highestDamage.value}</span>
          </div>
        )}
        {summary.mostKills?.name && (
          <div className="summary-item wide">
            <span className="s-label">💀 击杀最多</span>
            <span className="s-value highlight">{summary.mostKills.name} - {summary.mostKills.value}杀</span>
          </div>
        )}
        {Object.keys(summary.killsByUnit || {}).length > 0 && (
          <div className="summary-item full">
            <span className="s-label">各兵种击杀</span>
            <div className="kill-breakdown">
              {Object.entries(summary.killsByUnit).map(([type, count]) => (
                <span key={type} className="kill-item">
                  {WARRIORS[type]?.icon}{WARRIORS[type]?.name || type} x{count as number}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export function BattlePanel() {
  const invasion = useGameStore((s) => s.invasion);
  const startInvasion = useGameStore((s) => s.startInvasion);
  const fightBattle = useGameStore((s) => s.fightBattle);
  const warriors = useGameStore((s) => s.warriors);
  const totalWins = useGameStore((s) => s.totalWins);
  const totalLosses = useGameStore((s) => s.totalLosses);
  const [showLog, setShowLog] = useState(false);
  const [logFilter, setLogFilter] = useState<BattleLogType | 'all'>('all');
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [battleSummary, setBattleSummary] = useState<any>(null);

  const filteredLog = useMemo(() => {
    if (logFilter === 'all') return battleLog;
    return battleLog.filter((l) => l.type === logFilter);
  }, [battleLog, logFilter]);

  const handleFight = () => {
    const result = fightBattle();
    setBattleLog(result.battleLog);
    setBattleSummary(result.battleSummary);
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
        <div className="next-wave-info">
          <div className="wave-prediction">
            <span className="prediction-label">下一波：第 {Math.floor(useGameStore.getState().day / 2) + 1} 波</span>
            {checkIsBossWave(Math.floor(useGameStore.getState().day / 2) + 1) && (
              <span className="boss-wave-indicator">👹 Boss波次！</span>
            )}
          </div>
          <button className="btn btn-danger btn-large" onClick={startInvasion}>
            ⚠️ 召唤敌袭
          </button>
        </div>
      )}

      {invasion && invasion.isActive && (
        <div className={`invasion-alert ${invasion.isBossWave ? 'boss-invasion' : ''}`}>
          <div className="invasion-header">
            <span className={`invasion-wave ${invasion.isBossWave ? 'boss' : ''}`}>
              {invasion.isBossWave ? '👹 BOSS' : '⚠️'} 第 {invasion.wave} 波入侵！
            </span>
            <span className="invasion-countdown">
              {Math.ceil(invasion.countdown)}s 后自动开战
            </span>
          </div>

          {invasion.isBossWave && invasion.bossId && BOSSES[invasion.bossId] && (
            <div className="boss-info-panel">
              <div className="boss-identity">
                <span className="boss-icon-large">{BOSSES[invasion.bossId].icon}</span>
                <div className="boss-details">
                  <div className="boss-name">{BOSSES[invasion.bossId].name}</div>
                  <div className="boss-skills-preview">
                    技能：{BOSSES[invasion.bossId].skills.map(s => `${s.icon}${s.name}`).join(' ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          <WallDurabilityBar wall={invasion.wallDurability} />

          <div className="morale-section">
            <MoraleBar value={invasion.armyMorale} label="🟢 我军士气" />
            <MoraleBar value={invasion.enemyMorale} label="🔴 敌军士气" />
          </div>

          {invasion.bossSkillWarnings.length > 0 && (
            <BossSkillWarningDisplay warnings={invasion.bossSkillWarnings} />
          )}

          <CounterHint warriors={warriors} enemies={invasion.enemies} />

          {warriors.length > 0 && (
            <BattleFormation warriors={warriors} enemies={invasion.enemies} />
          )}

          <div className="reward-info">
            <span>胜利奖励：</span>
            {Object.entries(invasion.rewards).map(([res, amount]) => (
              <span key={res} className="reward-item">
                {RESOURCE_INFO[res as keyof typeof RESOURCE_INFO]?.icon || '📦'} +
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
        <div className={`battle-result ${invasion.result} ${invasion.isBossWave ? 'boss-result' : ''}`}>
          <div className="result-title">
            {invasion.result === 'victory' ? '🏆 胜利！' : '💔 失败...'}
            {invasion.isBossWave && invasion.result === 'victory' && ' 👑 Boss已击杀！'}
          </div>

          <WallDurabilityBar wall={invasion.wallDurability} />

          <div className="morale-section post-battle">
            <MoraleBar value={invasion.armyMorale} label="战后我军士气" />
            <MoraleBar value={invasion.enemyMorale} label="战后敌军士气" />
          </div>

          {invasion.result === 'victory' && invasion.achievedTier && (
            <TieredRewardsDisplay rewards={invasion.tieredRewards} achievedTier={invasion.achievedTier} />
          )}

          {invasion.result === 'defeat' && invasion.failureCompensation && (
            <FailureCompensationDisplay compensation={invasion.failureCompensation} />
          )}

          <BattleSummaryCard summary={invasion.battleSummary || battleSummary} />

          <div className="log-controls">
            <button className="btn btn-secondary" onClick={() => setShowLog(!showLog)}>
              {showLog ? '📕 隐藏战报' : '📖 查看战报'}
            </button>
            {showLog && (
              <select
                className="log-filter"
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value as any)}
              >
                <option value="all">全部日志</option>
                <option value="attack">⚔️ 攻击</option>
                <option value="critical">💥 暴击</option>
                <option value="crush">🎯 克制</option>
                <option value="kill">💀 击杀</option>
                <option value="death">☠️ 阵亡</option>
                <option value="heal">💚 治疗</option>
                <option value="morale">📊 士气</option>
                <option value="counter_attack">⚡ 连杀</option>
                <option value="system">📜 系统</option>
              </select>
            )}
          </div>

          {showLog && (
            <>
              <div className="battle-log-tips">
                <span className="tip t-attack">攻击</span>
                <span className="tip t-critical">暴击</span>
                <span className="tip t-crush">克制</span>
                <span className="tip t-kill">击杀</span>
                <span className="tip t-death">阵亡</span>
                <span className="tip t-heal">治疗</span>
                <span className="tip t-counter">连杀</span>
              </div>
              <div className="battle-log">
                {(invasion.battleLog?.length ? invasion.battleLog : filteredLog).map((line) => (
                  <div
                    key={line.id}
                    className={`log-line ${LOG_TYPE_STYLES[line.type] || ''}`}
                  >
                    <span className="log-round-tag">R{line.round}</span>
                    <span className="log-content">{line.message}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <button
            className="btn btn-primary"
            style={{ marginTop: '8px' }}
            onClick={() => {
              setBattleLog([]);
              setBattleSummary(null);
              setShowLog(false);
              startInvasion();
            }}
          >
            下一波入侵
          </button>
        </div>
      )}

      {warriors.length > 0 && !invasion?.isActive && (
        <div className="our-forces">
          <div className="queue-title">📋 我方兵种概览</div>
          <div className="forces-class-list">
            {Object.values(
              warriors.reduce((acc, w) => {
                if (!acc[w.type]) acc[w.type] = { count: 0, type: w.type };
                acc[w.type].count++;
                return acc;
              }, {} as Record<string, { count: number; type: string }>)
            ).map(({ type, count }) => {
              const cfg = WARRIORS[type as keyof typeof WARRIORS];
              const cls = UNIT_CLASS_INFO[cfg.unitClass];
              return (
                <div key={type} className="force-class-item">
                  <span className="force-icon">{cfg.icon}</span>
                  <div className="force-info">
                    <div className="force-name">{cfg.name} x{count}</div>
                    <div className="force-class">
                      {cls.icon} {cls.name} · {POSITION_INFO[cfg.preferredPosition].icon}{POSITION_INFO[cfg.preferredPosition].name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="counter-legend">
            <div className="legend-title">📖 克制关系</div>
            <div className="legend-items">
              <span>🛡️步兵 → 🏹远程 +40%</span>
              <span>🏹远程 → 🐎骑兵 +40%</span>
              <span>🐎骑兵 → 🛡️步兵 +40%</span>
              <span>👑英雄 → 全兵种 +20%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
