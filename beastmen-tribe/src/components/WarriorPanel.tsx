import { useGameStore } from '../store/useGameStore';
import { WARRIORS } from '../data/warriors';
import { RESOURCE_INFO } from '../data/trades';
import type { WarriorType, Resources } from '../types';
import { useState } from 'react';

export function WarriorPanel() {
  const warriors = useGameStore((s) => s.warriors);
  const trainingQueue = useGameStore((s) => s.trainingQueue);
  const unlockedWarriors = useGameStore((s) => s.unlockedWarriors);
  const buildings = useGameStore((s) => s.buildings);
  const trainWarrior = useGameStore((s) => s.trainWarrior);
  const canAfford = useGameStore((s) => s.canAfford);
  const resources = useGameStore((s) => s.resources);
  const recruitEfficiency = useGameStore((s) => s.recruitEfficiency);
  const loyalty = useGameStore((s) => s.loyalty);
  const population = useGameStore((s) => s.population);
  const getMilitaryPopulation = useGameStore((s) => s.getMilitaryPopulation);
  const getTrainingPopulation = useGameStore((s) => s.getTrainingPopulation);
  const getAvailablePopulation = useGameStore((s) => s.getAvailablePopulation);
  const retireWarrior = useGameStore((s) => s.retireWarrior);
  const getWarriorHasRedDot = useGameStore((s) => s.getWarriorHasRedDot);
  const getCurrentMilestone = useGameStore((s) => s.getCurrentMilestone);
  const dismissRedDot = useGameStore((s) => s.dismissRedDot);
  const getWarriorsToUnlockNext = useGameStore((s) => s.getWarriorsToUnlockNext);
  const getNextMilestone = useGameStore((s) => s.getNextMilestone);
  const [retireMsg, setRetireMsg] = useState<string>('');

  const currentMilestone = getCurrentMilestone();
  const nextWarriors = getWarriorsToUnlockNext();
  const nextMilestone = getNextMilestone();

  const totalPower = warriors.reduce(
    (sum, w) => sum + w.attack + w.defense + Math.floor(w.hp / 5),
    0
  );

  const militaryPop = getMilitaryPopulation();
  const trainingPop = getTrainingPopulation();
  const availablePop = getAvailablePopulation();

  const checkRequirement = (type: WarriorType): boolean => {
    const config = WARRIORS[type];
    if (!config.requires) return true;
    const building = buildings.find((b) => b.type === config.requires!.building);
    return !!building && building.level >= config.requires!.level;
  };

  const handleWarriorClick = (type: WarriorType, available: boolean) => {
    if (!available) return;
    if (getWarriorHasRedDot(type) && currentMilestone) {
      dismissRedDot(currentMilestone.id, 'warrior', type);
    }
    trainWarrior(type);
  };

  const getBarracksPopEfficiency = (): number => {
    const barracks = buildings.filter((b) => b.type === 'barracks' && !b.isBuilding);
    if (barracks.length === 0) return 1;
    const totalLevel = barracks.reduce((sum, b) => sum + b.level, 0);
    return Math.max(0.7, 1 - totalLevel * 0.05);
  };

  const handleRetire = (warriorId: string) => {
    const result = retireWarrior(warriorId);
    setRetireMsg(result.message);
    setTimeout(() => setRetireMsg(''), 2000);
  };

  return (
    <div className="panel warrior-panel">
      <h3 className="panel-title">⚔️ 战士训练</h3>

      <div className="warrior-stats">
        <div className="stat-item">
          <span className="stat-label">战士总数</span>
          <span className="stat-value">{warriors.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">总战力</span>
          <span className="stat-value power">{totalPower}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">征兵效率</span>
          <span className={`stat-value ${recruitEfficiency >= 1 ? 'power' : 'low-efficiency'}`}>
            {Math.floor(recruitEfficiency * 100)}%
          </span>
          <span className="stat-sublabel">忠诚{Math.floor(loyalty)}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">👥 人口占用</span>
          <span className="stat-value">
            <span style={{ color: '#ff9800' }}>军队{militaryPop}</span>
            {trainingPop > 0 && <span style={{ color: '#2196f3' }}> +训练{trainingPop}</span>}
            <span style={{ color: '#4caf50' }}> /可用{availablePop}</span>
          </span>
          <span className="stat-sublabel">总人口{population}</span>
        </div>
      </div>

      {retireMsg && (
        <div className="retire-message">{retireMsg}</div>
      )}

      {trainingQueue.length > 0 && (
        <div className="training-queue">
          <div className="queue-title">训练队列</div>
          {trainingQueue.map((q) => (
            <div key={q.type} className="queue-item">
              <span>{WARRIORS[q.type].icon} {WARRIORS[q.type].name} x{q.count} <small style={{color:'#2196f3'}}>[占用{q.count * (q.populationCost || 1)}人]</small></span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(q.progress / q.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="warrior-list">
        {unlockedWarriors.map((type) => {
          const config = WARRIORS[type];
          const reqMet = checkRequirement(type);
          const affordable = canAfford(config.cost);
          const barracksEff = getBarracksPopEfficiency();
          const popCost = Math.max(1, Math.ceil(config.populationCost * barracksEff));
          const hasPopulation = availablePop >= popCost;
          const available = reqMet && affordable && hasPopulation;

          const hasRedDot = getWarriorHasRedDot(type);
          return (
            <div
              key={type}
              className={`warrior-card ${available ? '' : 'disabled'}`}
              onClick={() => handleWarriorClick(type, available)}
            >
              <div className="warrior-header">
                <span className="warrior-icon">{config.icon}</span>
                <span className="warrior-name">
                  {config.name}
                  {hasRedDot && <span className="red-dot">●</span>}
                </span>
                <span className="warrior-pop-cost" title="人口占用">
                  👥{popCost}
                </span>
              </div>
              <div className="warrior-desc">{config.description}</div>
              <div className="warrior-stats-mini">
                <span title="攻击">⚔️{config.attack}</span>
                <span title="防御">🛡️{config.defense}</span>
                <span title="生命">❤️{config.hp}</span>
                <span title="时间">⏱️{config.trainTime}s</span>
                <span title="食物消耗">🍖{config.foodConsumption.toFixed(1)}x</span>
              </div>
              <div className="warrior-cost">
                {Object.entries(config.cost).map(([res, amount]) => (
                  <span
                    key={res}
                    className={`cost-mini ${
                      resources[res as keyof Resources] >= (amount as number)
                        ? ''
                        : 'insufficient'
                    }`}
                  >
                    {RESOURCE_INFO[res as keyof typeof RESOURCE_INFO].icon}
                    {amount as number}
                  </span>
                ))}
                <span className={`cost-mini ${hasPopulation ? '' : 'insufficient'}`}>
                  👥{popCost}
                </span>
              </div>
              {!reqMet && (
                <div className="requirement">
                  需要 {config.requires!.building} Lv.{config.requires!.level}
                </div>
              )}
              {reqMet && !hasPopulation && (
                <div className="requirement" style={{color:'#ff9800'}}>
                  人口不足（需{popCost}，可用{availablePop}）
                </div>
              )}
            </div>
          );
        })}
      </div>

      {nextWarriors.length > 0 && nextMilestone && (
        <div className="milestone-preview-box">
          <div className="milestone-preview-header">
            <span>🔓 下一里程碑解锁 ({nextMilestone.icon} Lv.{nextMilestone.townhallLevel})</span>
          </div>
          <div className="milestone-preview-items">
            {nextWarriors.map((w) => {
              const config = WARRIORS[w];
              return (
                <div key={w} className="milestone-preview-item locked">
                  <span className="milestone-preview-icon">{config.icon}</span>
                  <span className="milestone-preview-name">{config.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {warriors.length > 0 && (
        <div className="army-list">
          <div className="queue-title">军队 <small style={{fontWeight:'normal',color:'#888'}}>（点击战士可退役，返还50%食物）</small></div>
          <div className="army-grid">
            {warriors.map((w) => {
              const wConfig = WARRIORS[w.type];
              const popCost = wConfig?.populationCost || 1;
              return (
                <div
                  key={w.id}
                  className="army-unit"
                  title={`${wConfig?.name || w.type} HP:${Math.floor(w.hp)}/${w.maxHp} | 人口占用:${popCost} | 点击退役`}
                  onClick={() => handleRetire(w.id)}
                >
                  <span>{wConfig?.icon || '⚔️'}</span>
                  <div className="hp-bar-mini">
                    <div
                      className="hp-fill"
                      style={{ width: `${(w.hp / w.maxHp) * 100}%` }}
                    />
                  </div>
                  <small className="army-unit-pop">👥{popCost}</small>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
