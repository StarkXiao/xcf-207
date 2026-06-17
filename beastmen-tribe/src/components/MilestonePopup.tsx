import type { MilestoneConfig } from '../types';
import { BUILDINGS } from '../data/buildings';
import { WARRIORS } from '../data/warriors';
import { RESOURCE_INFO } from '../data/trades';
import { getStoryEventByMilestone } from '../data/events';

interface Props {
  milestone: MilestoneConfig;
  onClaim: () => void;
  onClose: () => void;
}

const PANEL_NAMES: Record<string, string> = {
  population: '👥 人口管理',
  building: '🏗️ 村落建设',
  warrior: '⚔️ 战士训练',
  tech: '🔬 科技研究',
  battle: '🛡️ 战斗入侵',
  expedition: '🗡️ 远征探险',
  nightRaid: '🌙 夜袭防御',
  totem: '🗿 图腾信仰',
  task: '📜 委托任务',
  trade: '🏪 资源交易',
  caravan: '🐪 商队贸易',
  storage: '📦 仓储管理',
  diplomacy: '🤝 外交系统',
  government: '🏛️ 政务系统',
};

export function MilestonePopup({ milestone, onClaim, onClose }: Props) {
  const hasRewards = Object.keys(milestone.rewards).length > 0;
  const storyEvent = getStoryEventByMilestone(milestone.id);

  return (
    <div className="milestone-popup-overlay" onClick={onClose}>
      <div className="milestone-popup" onClick={(e) => e.stopPropagation()}>
        <div className="milestone-popup-header">
          <span className="milestone-popup-badge">{milestone.icon}</span>
          <div className="milestone-popup-label">里程碑达成</div>
          <div className="milestone-popup-name">{milestone.name}</div>
          <div className="milestone-popup-level">
            部落大厅 Lv.{milestone.townhallLevel}
          </div>
        </div>

        <div className="milestone-popup-desc">{milestone.description}</div>

        {storyEvent && (
          <div className="milestone-popup-story">
            <div className="milestone-popup-section-title">📖 主线剧情</div>
            <div className="milestone-popup-story-text">{storyEvent.storyText}</div>
          </div>
        )}

        {milestone.unlockBuildings.length > 0 && (
          <div className="milestone-popup-section">
            <div className="milestone-popup-section-title">🏗️ 解锁建筑</div>
            <div className="milestone-popup-unlock-list">
              {milestone.unlockBuildings.map((b) => {
                const config = BUILDINGS[b];
                return (
                  <span key={b} className="milestone-popup-unlock-item">
                    {config?.icon} {config?.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {milestone.unlockWarriors.length > 0 && (
          <div className="milestone-popup-section">
            <div className="milestone-popup-section-title">⚔️ 解锁兵种</div>
            <div className="milestone-popup-unlock-list">
              {milestone.unlockWarriors.map((w) => {
                const config = WARRIORS[w];
                return (
                  <span key={w} className="milestone-popup-unlock-item">
                    {config?.icon} {config?.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {milestone.unlockPanels.length > 0 && (
          <div className="milestone-popup-section">
            <div className="milestone-popup-section-title">📋 解锁功能</div>
            <div className="milestone-popup-unlock-list">
              {milestone.unlockPanels.map((p) => (
                <span key={p} className="milestone-popup-unlock-item">
                  {PANEL_NAMES[p] || p}
                </span>
              ))}
            </div>
          </div>
        )}

        {hasRewards && (
          <div className="milestone-popup-section">
            <div className="milestone-popup-section-title">🎁 里程碑奖励</div>
            <div className="milestone-popup-reward-list">
              {Object.entries(milestone.rewards).map(([key, amount]) => (
                <span key={key} className="milestone-popup-reward-item">
                  {RESOURCE_INFO[key as keyof typeof RESOURCE_INFO]?.icon} +{amount}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="milestone-popup-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            稍后领取
          </button>
          <button className="btn btn-primary" onClick={onClaim}>
            {hasRewards ? '🎉 领取奖励' : '✅ 确认'}
          </button>
        </div>
      </div>
    </div>
  );
}
