import { useGameStore } from '../store/useGameStore';
import { BUILDINGS } from '../data/buildings';
import { WARRIORS } from '../data/warriors';
import { RESOURCE_INFO } from '../data/trades';
import type { MilestoneConfig } from '../types';

export function MilestonePanel() {
  const getAllMilestones = useGameStore((s) => s.getAllMilestones);
  const isMilestoneClaimed = useGameStore((s) => s.isMilestoneClaimed);
  const getCurrentMilestone = useGameStore((s) => s.getCurrentMilestone);
  const getMilestoneProgress = useGameStore((s) => s.getMilestoneProgress);

  const allMilestones = getAllMilestones();
  const current = getCurrentMilestone();
  const { next, progress } = getMilestoneProgress();
  const thLevel = useGameStore((s) => {
    const townhall = s.buildings.find((b) => b.type === 'townhall' && !b.isBuilding);
    return townhall?.level || 0;
  });

  const PANEL_NAMES: Record<string, string> = {
    population: '人口管理',
    building: '村落建设',
    warrior: '战士训练',
    tech: '科技研究',
    battle: '战斗入侵',
    expedition: '远征探险',
    nightRaid: '夜袭防御',
    totem: '图腾信仰',
    task: '委托任务',
    trade: '资源交易',
    caravan: '商队贸易',
    storage: '仓储管理',
    diplomacy: '外交系统',
    government: '政务系统',
  };

  return (
    <div className="panel milestone-panel">
      <h3 className="panel-title">🏆 部落里程碑</h3>

      <div className="milestone-current-section">
        <div className="milestone-current-header">
          <div className="milestone-current-info">
            <span className="milestone-current-icon">{current?.icon}</span>
            <div>
              <div className="milestone-current-name">
                当前：{current?.name}
              </div>
              <div className="milestone-current-level">
                部落大厅 Lv.{thLevel}
              </div>
            </div>
          </div>
          {next && (
            <div className="milestone-next-info">
              <div className="milestone-next-label">下一里程碑</div>
              <div className="milestone-next-name">
                {next.icon} {next.name}
              </div>
            </div>
          )}
        </div>
        <div className="milestone-progress-bar-container">
          <div
            className="milestone-progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
          <span className="milestone-progress-text">{progress}%</span>
        </div>
      </div>

      {next && (
        <div className="milestone-next-section">
          <div className="queue-title">📋 下一里程碑内容预览</div>
          <div className="milestone-next-description">{next.description}</div>
          {next.unlockBuildings.length > 0 && (
            <div className="milestone-next-row">
              <span className="milestone-next-label">解锁建筑：</span>
              <div className="milestone-next-items">
                {next.unlockBuildings.map((b) => {
                  const config = BUILDINGS[b];
                  return (
                    <span key={b} className="milestone-next-item">
                      {config?.icon} {config?.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {next.unlockWarriors.length > 0 && (
            <div className="milestone-next-row">
              <span className="milestone-next-label">解锁兵种：</span>
              <div className="milestone-next-items">
                {next.unlockWarriors.map((w) => {
                  const config = WARRIORS[w];
                  return (
                    <span key={w} className="milestone-next-item">
                      {config?.icon} {config?.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {next.unlockPanels.length > 0 && (
            <div className="milestone-next-row">
              <span className="milestone-next-label">解锁功能：</span>
              <div className="milestone-next-items">
                {next.unlockPanels.map((p) => (
                  <span key={p} className="milestone-next-item">
                    {PANEL_NAMES[p] || p}
                  </span>
                ))}
              </div>
            </div>
          )}
          {Object.keys(next.rewards).length > 0 && (
            <div className="milestone-next-row">
              <span className="milestone-next-label">奖励：</span>
              <div className="milestone-next-items">
                {Object.entries(next.rewards).map(([k, v]) => (
                  <span key={k} className="milestone-next-item reward">
                    {RESOURCE_INFO[k as keyof typeof RESOURCE_INFO]?.icon} +{v}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="milestone-list-section">
        <div className="queue-title">📜 全部里程碑</div>
        <div className="milestone-list">
          {allMilestones.map((m: MilestoneConfig) => {
            const claimed = isMilestoneClaimed(m.id);
            const isCurrent = current?.id === m.id;
            const unlocked = m.townhallLevel <= thLevel;
            return (
              <div
                key={m.id}
                className={`milestone-list-item ${
                  claimed
                    ? 'claimed'
                    : isCurrent
                    ? 'current'
                    : unlocked
                    ? 'unlocked'
                    : 'locked'
                }`}
              >
                <div className="milestone-list-header">
                  <div className="milestone-list-icon-wrap">
                    <span className="milestone-list-icon">{m.icon}</span>
                    <span className="milestone-list-status">
                      {claimed ? '✅' : isCurrent ? '⭐' : unlocked ? '🔓' : '🔒'}
                    </span>
                  </div>
                  <div className="milestone-list-info">
                    <div className="milestone-list-name">
                      {m.name}
                      <span className="milestone-list-level">
                        Lv.{m.townhallLevel}
                      </span>
                    </div>
                    <div className="milestone-list-desc">{m.description}</div>
                  </div>
                </div>

                {(unlocked || claimed) && (
                  <div className="milestone-list-details">
                    {m.unlockBuildings.length > 0 && (
                      <div className="milestone-list-detail-row">
                        <span>🏗️</span>
                        {m.unlockBuildings.map((b) => {
                          const config = BUILDINGS[b];
                          return (
                            <span key={b} className="milestone-list-chip">
                              {config?.icon} {config?.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {m.unlockWarriors.length > 0 && (
                      <div className="milestone-list-detail-row">
                        <span>⚔️</span>
                        {m.unlockWarriors.map((w) => {
                          const config = WARRIORS[w];
                          return (
                            <span key={w} className="milestone-list-chip">
                              {config?.icon} {config?.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {m.unlockPanels.length > 0 && (
                      <div className="milestone-list-detail-row">
                        <span>📋</span>
                        {m.unlockPanels.map((p) => (
                          <span key={p} className="milestone-list-chip">
                            {PANEL_NAMES[p] || p}
                          </span>
                        ))}
                      </div>
                    )}
                    {Object.keys(m.rewards).length > 0 && (
                      <div className="milestone-list-detail-row">
                        <span>🎁</span>
                        {Object.entries(m.rewards).map(([k, v]) => (
                          <span key={k} className="milestone-list-chip reward">
                            {RESOURCE_INFO[k as keyof typeof RESOURCE_INFO]?.icon} +{v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
