import type { MilestoneConfig } from '../types';
import { BUILDINGS } from '../data/buildings';
import { WARRIORS } from '../data/warriors';
import { RESOURCE_INFO } from '../data/trades';

interface Props {
  milestone: MilestoneConfig;
  onClaim: () => void;
  onClose: () => void;
}

export function MilestonePopup({ milestone, onClaim, onClose }: Props) {
  const hasRewards = Object.keys(milestone.rewards).length > 0;

  return (
    <div className="milestone-overlay" onClick={onClose}>
      <div className="milestone-popup" onClick={(e) => e.stopPropagation()}>
        <div className="milestone-popup-header">
          <span className="milestone-popup-icon">{milestone.icon}</span>
          <div className="milestone-popup-title-group">
            <h2 className="milestone-popup-title">{milestone.name}</h2>
            <div className="milestone-popup-subtitle">
              部落大厅 Lv.{milestone.townhallLevel}
            </div>
          </div>
        </div>

        <p className="milestone-popup-description">{milestone.description}</p>

        {milestone.unlockBuildings.length > 0 && (
          <div className="milestone-popup-section">
            <div className="milestone-popup-section-title">🏗️ 解锁建筑</div>
            <div className="milestone-popup-grid">
              {milestone.unlockBuildings.map((b) => {
                const config = BUILDINGS[b];
                return (
                  <div key={b} className="milestone-popup-item">
                    <span className="milestone-popup-item-icon">{config?.icon}</span>
                    <span className="milestone-popup-item-name">{config?.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {milestone.unlockWarriors.length > 0 && (
          <div className="milestone-popup-section">
            <div className="milestone-popup-section-title">⚔️ 解锁兵种</div>
            <div className="milestone-popup-grid">
              {milestone.unlockWarriors.map((w) => {
                const config = WARRIORS[w];
                return (
                  <div key={w} className="milestone-popup-item">
                    <span className="milestone-popup-item-icon">{config?.icon}</span>
                    <span className="milestone-popup-item-name">{config?.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {milestone.unlockPanels.length > 0 && (
          <div className="milestone-popup-section">
            <div className="milestone-popup-section-title">📋 解锁功能</div>
            <div className="milestone-popup-tags">
              {milestone.unlockPanels.map((p) => (
                <span key={p} className="milestone-popup-tag">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {hasRewards && (
          <div className="milestone-popup-section">
            <div className="milestone-popup-section-title">🎁 里程碑奖励</div>
            <div className="milestone-popup-rewards">
              {Object.entries(milestone.rewards).map(([key, amount]) => (
                <span key={key} className="milestone-popup-reward-item">
                  {RESOURCE_INFO[key as keyof typeof RESOURCE_INFO]?.icon} +{amount}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="milestone-popup-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            稍后领取
          </button>
          <button className="btn btn-primary milestone-popup-claim-btn" onClick={onClaim}>
            {hasRewards ? '🎉 领取奖励' : '✅ 确认'}
          </button>
        </div>
      </div>
    </div>
  );
}
