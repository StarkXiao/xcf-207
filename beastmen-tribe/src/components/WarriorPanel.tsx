import { useGameStore } from '../store/useGameStore';
import { WARRIORS } from '../data/warriors';
import { RESOURCE_INFO } from '../data/trades';
import type { WarriorType, Resources } from '../types';

export function WarriorPanel() {
  const warriors = useGameStore((s) => s.warriors);
  const trainingQueue = useGameStore((s) => s.trainingQueue);
  const unlockedWarriors = useGameStore((s) => s.unlockedWarriors);
  const buildings = useGameStore((s) => s.buildings);
  const trainWarrior = useGameStore((s) => s.trainWarrior);
  const canAfford = useGameStore((s) => s.canAfford);
  const resources = useGameStore((s) => s.resources);

  const totalPower = warriors.reduce(
    (sum, w) => sum + w.attack + w.defense + Math.floor(w.hp / 5),
    0
  );

  const checkRequirement = (type: WarriorType): boolean => {
    const config = WARRIORS[type];
    if (!config.requires) return true;
    const building = buildings.find((b) => b.type === config.requires!.building);
    return !!building && building.level >= config.requires!.level;
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
      </div>

      {trainingQueue.length > 0 && (
        <div className="training-queue">
          <div className="queue-title">训练队列</div>
          {trainingQueue.map((q) => (
            <div key={q.type} className="queue-item">
              <span>{WARRIORS[q.type].icon} {WARRIORS[q.type].name} x{q.count}</span>
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
          const available = reqMet && affordable;

          return (
            <div
              key={type}
              className={`warrior-card ${available ? '' : 'disabled'}`}
              onClick={() => available && trainWarrior(type)}
            >
              <div className="warrior-header">
                <span className="warrior-icon">{config.icon}</span>
                <span className="warrior-name">{config.name}</span>
              </div>
              <div className="warrior-desc">{config.description}</div>
              <div className="warrior-stats-mini">
                <span title="攻击">⚔️{config.attack}</span>
                <span title="防御">🛡️{config.defense}</span>
                <span title="生命">❤️{config.hp}</span>
                <span title="时间">⏱️{config.trainTime}s</span>
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
              </div>
              {!reqMet && (
                <div className="requirement">
                  需要 {config.requires!.building} Lv.{config.requires!.level}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {warriors.length > 0 && (
        <div className="army-list">
          <div className="queue-title">军队</div>
          <div className="army-grid">
            {warriors.map((w) => (
              <div
                key={w.id}
                className="army-unit"
                title={`${WARRIORS[w.type].name} HP:${Math.floor(w.hp)}/${w.maxHp}`}
              >
                <span>{WARRIORS[w.type].icon}</span>
                <div className="hp-bar-mini">
                  <div
                    className="hp-fill"
                    style={{ width: `${(w.hp / w.maxHp) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
