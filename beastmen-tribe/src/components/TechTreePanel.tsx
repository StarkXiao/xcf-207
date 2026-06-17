import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import {
  TECH_CATEGORIES,
  TECHNOLOGIES,
  getTechByCategory,
  getTechCost,
} from '../data/technologies';
import { RESOURCE_INFO } from '../data/trades';
import { BUILDINGS } from '../data/buildings';
import { WARRIORS } from '../data/warriors';
import type { TechCategory, TechEffectType } from '../types';

const TECH_ICONS: Record<TechEffectType, string> = {
  attack_boost: '⚔️',
  defense_boost: '🛡️',
  hp_boost: '❤️',
  train_speed: '⚡',
  train_cost: '💰',
  production_boost: '📈',
  resource_cost: '🏗️',
  wall_defense: '🧱',
  loot_bonus: '🎁',
  exp_bonus: '✨',
  food_consumption: '🍖',
  population_cap: '👥',
  loyalty_decay: '💚',
};

export function TechTreePanel() {
  const [activeCategory, setActiveCategory] = useState<TechCategory>('military');
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  const technologies = useGameStore((s) => s.technologies);
  const activeResearch = useGameStore((s) => s.activeResearch);
  const canResearch = useGameStore((s) => s.canResearch);
  const startResearch = useGameStore((s) => s.startResearch);
  const cancelResearch = useGameStore((s) => s.cancelResearch);
  const buildings = useGameStore((s) => s.buildings);
  const resources = useGameStore((s) => s.resources);
  const getTechBonus = useGameStore((s) => s.getTechBonus);

  const getTechStatus = (techId: string) => {
    return technologies.find((t) => t.techId === techId);
  };

  const isTechCompleted = (techId: string) => {
    const tech = getTechStatus(techId);
    return tech?.completed || false;
  };

  const isTechResearching = (techId: string) => {
    const tech = getTechStatus(techId);
    return tech?.isResearching || false;
  };

  const getRequirementText = (techId: string) => {
    const config = TECHNOLOGIES[techId];
    if (!config?.requires) return [];

    const reqs: string[] = [];
    for (const req of config.requires) {
      if (req.type === 'building') {
        const building = BUILDINGS[req.id];
        const hasBuilding = buildings.some(
          (b) => b.type === req.id && !b.isBuilding && b.level >= (req.level || 1)
        );
        reqs.push(
          `${hasBuilding ? '✅' : '⬜'} ${building?.name || req.id} Lv.${req.level || 1}`
        );
      } else if (req.type === 'tech') {
        const techConfig = TECHNOLOGIES[req.id];
        const completed = isTechCompleted(req.id);
        reqs.push(`${completed ? '✅' : '⬜'} ${techConfig?.name || req.id}`);
      }
    }
    return reqs;
  };

  const getEffectText = (techId: string) => {
    const config = TECHNOLOGIES[techId];
    if (!config) return [];

    return config.effects.map((effect) => {
      const icon = TECH_ICONS[effect.type] || '✨';
      const value = Math.abs(effect.value * 100).toFixed(0);
      const sign = effect.value >= 0 ? '+' : '-';
      let text = '';
      if (effect.target) {
        const targetConfig =
          WARRIORS[effect.target] || BUILDINGS[effect.target];
        text = `${targetConfig?.name || effect.target} ${sign}${value}%`;
      } else {
        switch (effect.type) {
          case 'population_cap':
            text = `${sign}${effect.value}`;
            break;
          default:
            text = `${sign}${value}%`;
        }
      }
      return `${icon} ${text}`;
    });
  };

  const categoryInfo = TECH_CATEGORIES[activeCategory];
  const categoryTechs = getTechByCategory(activeCategory);
  const tiers = [...new Set(categoryTechs.map((t) => t.tier))].sort();

  const totalBonusAttack = getTechBonus('attack_boost');
  const totalBonusDefense = getTechBonus('defense_boost');
  const totalBonusHp = getTechBonus('hp_boost');
  const totalBonusProduction = getTechBonus('production_boost');

  return (
    <div className="panel tech-panel">
      <h3 className="panel-title">🔬 科技研究</h3>

      <div className="tech-stats">
        <div className="tech-stat">
          <span className="stat-icon">⚔️</span>
          <span className="stat-label">攻击加成</span>
          <span className="stat-value">+{(totalBonusAttack * 100).toFixed(0)}%</span>
        </div>
        <div className="tech-stat">
          <span className="stat-icon">🛡️</span>
          <span className="stat-label">防御加成</span>
          <span className="stat-value">+{(totalBonusDefense * 100).toFixed(0)}%</span>
        </div>
        <div className="tech-stat">
          <span className="stat-icon">❤️</span>
          <span className="stat-label">生命加成</span>
          <span className="stat-value">+{(totalBonusHp * 100).toFixed(0)}%</span>
        </div>
        <div className="tech-stat">
          <span className="stat-icon">📈</span>
          <span className="stat-label">产出加成</span>
          <span className="stat-value">+{(totalBonusProduction * 100).toFixed(0)}%</span>
        </div>
      </div>

      {activeResearch && (
        <div className="active-research">
          <div className="research-header">
            <span className="research-icon">
              {TECHNOLOGIES[activeResearch.techId]?.icon}
            </span>
            <div className="research-info">
              <div className="research-name">
                正在研究：{TECHNOLOGIES[activeResearch.techId]?.name}
              </div>
              <div className="research-progress-bar">
                <div
                  className="research-progress-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      (activeResearch.progress /
                        (TECHNOLOGIES[activeResearch.techId]?.researchTime || 1) *
                        100
                    ))}%`,
                  }}
                />
              </div>
              <div className="research-time">
                {Math.floor(activeResearch.progress)}s /{' '}
                {TECHNOLOGIES[activeResearch.techId]?.researchTime}s
              </div>
            </div>
          </div>
          <button
            className="btn btn-danger btn-small"
            onClick={cancelResearch}
          >
            取消研究
          </button>
        </div>
      )}

      <div className="tech-categories">
        {(Object.keys(TECH_CATEGORIES) as TechCategory[]).map((cat) => (
          <button
            key={cat}
            className={`tech-category-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            <span className="cat-icon">{TECH_CATEGORIES[cat].icon}</span>
            <span className="cat-name">{TECH_CATEGORIES[cat].name}</span>
          </button>
        ))}
      </div>

      <div className="tech-category-desc">
        {categoryInfo.icon} {categoryInfo.name} - {categoryInfo.description}
      </div>

      <div className="tech-tree">
        {tiers.map((tier) => (
          <div key={tier} className="tech-tier">
            <div className="tier-label">第 {tier} 阶</div>
            <div className="tech-tier-grid">
              {categoryTechs
                .filter((t) => t.tier === tier)
                .map((tech) => {
                  const status = getTechStatus(tech.id);
                  const completed = isTechCompleted(tech.id);
                  const researching = isTechResearching(tech.id);
                  const canStart = canResearch(tech.id);

                  return (
                    <div
                      key={tech.id}
                      className={`tech-node ${
                        completed
                          ? 'completed'
                          : researching
                          ? 'researching'
                          : canStart
                          ? 'available'
                          : 'locked'
                      } ${selectedTech === tech.id ? 'selected' : ''}`}
                      onClick={() => setSelectedTech(selectedTech === tech.id ? null : tech.id)}
                    >
                      <div className="tech-node-icon">{tech.icon}</div>
                      <div className="tech-node-name">{tech.name}</div>
                      {researching && (
                        <div className="tech-node-progress">
                          <div
                            className="tech-node-progress-fill"
                            style={{
                              width: `${Math.min(
                                100,
                                (status?.progress || 0) / tech.researchTime * 100
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                      {completed && (
                        <div className="tech-node-check">✓</div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {selectedTech && (
        <div className="tech-detail">
          {(() => {
            const tech = TECHNOLOGIES[selectedTech];
            if (!tech) return null;
            const completed = isTechCompleted(selectedTech);
            const researching = isTechResearching(selectedTech);
            const canStart = canResearch(selectedTech);
            const cost = getTechCost(selectedTech);
            const requirements = getRequirementText(selectedTech);
            const effects = getEffectText(selectedTech);

            return (
              <>
                <div className="tech-detail-header">
                <span className="tech-detail-icon">{tech.icon}</span>
                <div>
                <div className="tech-detail-name">
                  {tech.name}
                  {completed && <span className="badge-completed">已完成</span>}
                  {researching && <span className="badge-researching">研究中</span>}
                </div>
                <div className="tech-detail-desc">{tech.description}</div>
              </div>
            </div>

            <div className="tech-detail-section">
              <div className="section-title">🔬 研究效果</div>
              <div className="tech-effects">
                {effects.map((effect, idx) => (
                  <div key={idx} className="tech-effect">
                    {effect}
                  </div>
                ))}
              </div>
              {tech.unlocks && (
                <div className="tech-unlocks">
                  {tech.unlocks.warriors?.map((w) => (
                    <div key={w} className="unlock-item">
                      🔓 解锁兵种：{WARRIORS[w]?.icon} {WARRIORS[w]?.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {requirements.length > 0 && (
              <div className="tech-detail-section">
                <div className="section-title">📋 前置需求</div>
                <div className="tech-requirements">
                  {requirements.map((req, idx) => (
                    <div key={idx} className="tech-requirement">
                      {req}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!completed && (
              <div className="tech-detail-section">
                <div className="section-title">💰 研究消耗</div>
                <div className="cost-list">
                  {Object.entries(cost).map(([res, amount]) => (
                    <span
                      key={res}
                      className={`cost-item ${
                        resources[res as keyof typeof resources] >=
                        (amount as number)
                          ? ''
                          : 'insufficient'
                      }`}
                    >
                      {RESOURCE_INFO[res as keyof typeof RESOURCE_INFO]?.icon}{' '}
                      {amount as number}
                    </span>
                  ))}
                </div>
                <div className="research-time-info">
                  ⏱️ 研究时间：{tech.researchTime} 秒
                </div>
              </div>
            )}

            {!completed && !researching && (
              <button
                className={`btn ${canStart ? 'btn-primary' : 'btn-disabled'}`}
                onClick={() => canStart && startResearch(selectedTech)}
                disabled={!canStart}
              >
                {canStart ? '开始研究' : '条件不足'}
              </button>
            )}

            {!completed && researching && (
              <div className="researching-hint">
                当前正在研究其他科技，请等待完成
              </div>
            )}
              </>
            );
          })()}
        </div>
      )}

      <div className="hint">
        研究科技可以提升部落战斗力、资源产出和防御能力
      </div>
    </div>
  );
}
