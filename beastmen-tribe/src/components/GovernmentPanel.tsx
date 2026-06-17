import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import {
  POLICY_CATEGORIES,
  getPoliciesByCategory,
  getPolicyById,
} from '../data/government';
import { WARRIORS } from '../data/warriors';
import { BUILDINGS } from '../data/buildings';
import type { PolicyCategory } from '../types';

const EFFECT_ICONS: Record<string, string> = {
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
  tax_rate: '📊',
  trade_bonus: '🤝',
  research_speed: '🔬',
  policy_point_rate: '📜',
  prestige_gain: '🏆',
  chief_longevity: '⏳',
  faith_gain: '🙏',
  loyalty_boost: '💙',
  population_growth: '👶',
  building_speed: '🔨',
  diplomacy_bonus: '🕊️',
  heal_rate: '💊',
  raider_chance: '🗡️',
  invasion_chance: '⚠️',
  storage_capacity: '📦',
  happiness: '😊',
  migration_chance: '🚶',
  warrior_preference_attack: '🏹',
  warrior_preference_defense: '🛡️',
  warrior_preference_hp: '❤️‍🔥',
};

const ATTRIBUTE_NAMES: Record<string, { name: string; icon: string }> = {
  martial: { name: '军事', icon: '⚔️' },
  diplomacy: { name: '外交', icon: '🤝' },
  stewardship: { name: '管理', icon: '📦' },
  piety: { name: '虔诚', icon: '🙏' },
  cunning: { name: '智谋', icon: '🧠' },
  charisma: { name: '魅力', icon: '👑' },
};

export function GovernmentPanel() {
  const [activeCategory, setActiveCategory] = useState<PolicyCategory>('military');
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chief' | 'policies' | 'tax'>('chief');

  const government = useGameStore((s) => s.government);
  const tribeName = useGameStore((s) => s.tribeName);
  const resources = useGameStore((s) => s.resources);
  const startPolicyResearch = useGameStore((s) => s.startPolicyResearch);
  const cancelPolicyResearch = useGameStore((s) => s.cancelPolicyResearch);
  const activatePolicy = useGameStore((s) => s.activatePolicy);
  const deactivatePolicy = useGameStore((s) => s.deactivatePolicy);
  const abdicateChief = useGameStore((s) => s.abdicateChief);
  const selectHeir = useGameStore((s) => s.selectHeir);
  const setTaxRate = useGameStore((s) => s.setTaxRate);
  const getGovernmentBonus = useGameStore((s) => s.getGovernmentBonus);
  const canResearchPolicy = useGameStore((s) => s.canResearchPolicy);
  const isPolicyActive = useGameStore((s) => s.isPolicyActive);

  const chief = government.chieftain.current;
  const heir = government.chieftain.heir;
  const heirs = government.chieftain.heirs;

  const isPolicyCompleted = (policyId: string) => {
    return government.completedPolicies.includes(policyId);
  };

  const isPolicyResearching = (policyId: string) => {
    return government.researchingPolicy?.policyId === policyId;
  };

  const getRequirementText = (policyId: string) => {
    const config = getPolicyById(policyId);
    if (!config?.requires) return [];

    const reqs: string[] = [];
    for (const req of config.requires) {
      if (req.type === 'policy' && req.id) {
        const reqConfig = getPolicyById(req.id);
        const completed = isPolicyCompleted(req.id);
        reqs.push(`${completed ? '✅' : '⬜'} 需要政策：${reqConfig?.name || req.id}`);
      } else if (req.type === 'tier') {
        const categoryPolicies = getPoliciesByCategory(config.category);
        const completedInCategory = categoryPolicies.filter(
          (p) => p.tier < config.tier && isPolicyCompleted(p.id)
        ).length;
        const needed = categoryPolicies.filter((p) => p.tier < config.tier).length;
        reqs.push(
          `${completedInCategory >= needed ? '✅' : '⬜'} 前置政策：${completedInCategory}/${needed}`
        );
      } else if (req.type === 'trait') {
        const hasTrait = chief?.traits.some((t) => t.id === req.id);
        reqs.push(`${hasTrait ? '✅' : '⬜'} 首领特质：${req.name}`);
      }
    }
    return reqs;
  };

  const getEffectText = (policyId: string) => {
    const config = getPolicyById(policyId);
    if (!config) return [];

    return config.effects.map((effect) => {
      const icon = EFFECT_ICONS[effect.type] || '✨';
      const value = Math.abs(effect.value * 100).toFixed(0);
      const sign = effect.value >= 0 ? '+' : '-';
      let text = '';
      if (effect.target) {
        const targetConfig = WARRIORS[effect.target] || BUILDINGS[effect.target];
        text = `${targetConfig?.name || effect.target} ${sign}${value}%`;
      } else {
        switch (effect.type) {
          case 'population_cap':
            text = `${sign}${Math.round(effect.value * 100)}%`;
            break;
          case 'tax_rate':
          case 'policy_point_rate':
          case 'prestige_gain':
          case 'chief_longevity':
            text = `${sign}${value}%`;
            break;
          default:
            text = `${sign}${value}%`;
        }
      }
      return `${icon} ${text}`;
    });
  };

  const totalBonusAttack = getGovernmentBonus('attack_boost');
  const totalBonusDefense = getGovernmentBonus('defense_boost');
  const totalBonusHp = getGovernmentBonus('hp_boost');
  const totalBonusProduction = getGovernmentBonus('production_boost');
  const totalBonusTrainSpeed = getGovernmentBonus('train_speed');

  const categoryInfo = POLICY_CATEGORIES[activeCategory];
  const categoryPolicies = getPoliciesByCategory(activeCategory);
  const tiers = [...new Set(categoryPolicies.map((p) => p.tier))].sort();

  const getAttributeColor = (value: number) => {
    if (value >= 8) return 'color-gold';
    if (value >= 6) return 'color-green';
    if (value >= 4) return 'color-blue';
    return 'color-gray';
  };

  return (
    <div className="panel government-panel">
      <h3 className="panel-title">🏛️ 政务中心 - {tribeName}</h3>

      <div className="tab-buttons">
        <button
          className={`tab-btn ${activeTab === 'chief' ? 'active' : ''}`}
          onClick={() => setActiveTab('chief')}
        >
          👑 首领
        </button>
        <button
          className={`tab-btn ${activeTab === 'policies' ? 'active' : ''}`}
          onClick={() => setActiveTab('policies')}
        >
          📜 政策
        </button>
        <button
          className={`tab-btn ${activeTab === 'tax' ? 'active' : ''}`}
          onClick={() => setActiveTab('tax')}
        >
          📊 税收
        </button>
      </div>

      {activeTab === 'chief' && chief && (
        <div className="chief-section">
          <div className="chief-card">
            <div className="chief-header">
              <div className="chief-portrait">👤</div>
              <div className="chief-info">
                <div className="chief-name">
                  {chief.title} {chief.name}
                  {chief.nickname && <span className="chief-nickname">「{chief.nickname}」</span>}
                </div>
                <div className="chief-dynasty">🏰 {chief.dynasty} 王朝</div>
                <div className="chief-stats">
                  <span>🎂 {chief.age}/{chief.maxAge} 岁</span>
                  <span>📅 在位 {chief.reignDays} 天</span>
                  <span>⭐ {government.reignBonuses.dynastyRenown} 声望</span>
                </div>
              </div>
            </div>

            <div className="chief-attributes">
              <div className="section-title">📊 六维属性</div>
              <div className="attribute-grid">
                {Object.entries(ATTRIBUTE_NAMES).map(([key, info]) => {
                  const value = chief.attributes[key as keyof typeof chief.attributes];
                  return (
                    <div key={key} className={`attribute-item ${getAttributeColor(value)}`}>
                      <span className="attr-icon">{info.icon}</span>
                      <span className="attr-name">{info.name}</span>
                      <span className="attr-value">{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {chief.traits.length > 0 && (
              <div className="chief-traits">
                <div className="section-title">🎭 特质</div>
                <div className="traits-list">
                  {chief.traits.map((trait) => (
                    <div key={trait.id} className={`trait-item trait-${trait.rarity}`}>
                      <span className="trait-icon">{trait.icon}</span>
                      <div className="trait-info">
                        <div className="trait-name">{trait.name}</div>
                        <div className="trait-desc">{trait.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="reign-bonuses">
              <div className="section-title">🏆 长期统治加成</div>
              <div className="bonus-grid">
                <div className="bonus-item">
                  <span>⚔️ 攻击加成</span>
                  <span className="color-green">+{Math.round(government.reignBonuses.bonusAttack * 100)}%</span>
                </div>
                <div className="bonus-item">
                  <span>📈 生产加成</span>
                  <span className="color-green">+{Math.round(government.reignBonuses.bonusProduction * 100)}%</span>
                </div>
                <div className="bonus-item">
                  <span>💚 忠诚加成</span>
                  <span className="color-green">+{Math.round(government.reignBonuses.bonusLoyalty * 100)}%</span>
                </div>
              </div>
            </div>

            {chief.age >= 40 && (
              <button
                className="btn btn-warning"
                onClick={() => abdicateChief()}
              >
                🏳️ 主动让位
              </button>
            )}
          </div>

          <div className="heir-section">
            <div className="section-title">
              👶 继承人 {heir ? `(已指定)` : `(未指定)`}
            </div>

            {heir && (
              <div className="heir-card selected">
                <div className="heir-portrait">🧒</div>
                <div className="heir-info">
                  <div className="heir-name">{heir.name} （{heir.age}岁）</div>
                  <div className="heir-relation">关系：{heir.relation}</div>
                  <div className="heir-claim">
                    继承权：{(heir.claimStrength * 100).toFixed(0)}%
                    {heir.isCandidate && <span className="badge-nominee">候选人</span>}
                  </div>
                  <div className="heir-attrs-mini">
                    {Object.entries(heir.promisedAttributes).map(([k, v]) => (
                      <span key={k}>
                        {ATTRIBUTE_NAMES[k]?.icon}{v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {heirs.length > 0 && (
              <div className="heirs-list">
                <div className="subsection-title">其他继承人</div>
                {heirs
                  .filter((h) => h.id !== heir?.id)
                  .slice(0, 4)
                  .map((h) => (
                    <div
                      key={h.id}
                      className="heir-card"
                      onClick={() => selectHeir(h.id)}
                    >
                      <div className="heir-portrait-mini">👶</div>
                      <div className="heir-info-mini">
                        <div className="heir-name-mini">{h.name}（{h.age}岁）</div>
                        <div className="heir-relation-mini">{h.relation}</div>
                      </div>
                      <button className="btn btn-small btn-primary">指定</button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'policies' && (
        <div className="policies-section">
          <div className="policy-points-bar">
            <div className="policy-points-info">
              <span>📜 政策点数</span>
              <span className="points-value">
                {Math.floor(government.policyPoints)} / {government.maxPolicyPoints}
              </span>
            </div>
            <div className="policy-points-progress">
              <div
                className="policy-points-fill"
                style={{
                  width: `${(government.policyPoints / government.maxPolicyPoints) * 100}%`,
                }}
              />
            </div>
            <div className="policy-points-rate">
              +{(government.policyPointRate * 10).toFixed(1)} / 秒
            </div>
          </div>

          <div className="gov-stats">
            <div className="gov-stat">
              <span>⚔️</span>
              <span>攻击</span>
              <span className="color-green">+{Math.round(totalBonusAttack * 100)}%</span>
            </div>
            <div className="gov-stat">
              <span>🛡️</span>
              <span>防御</span>
              <span className="color-green">+{Math.round(totalBonusDefense * 100)}%</span>
            </div>
            <div className="gov-stat">
              <span>❤️</span>
              <span>生命</span>
              <span className="color-green">+{Math.round(totalBonusHp * 100)}%</span>
            </div>
            <div className="gov-stat">
              <span>📈</span>
              <span>产出</span>
              <span className="color-green">+{Math.round(totalBonusProduction * 100)}%</span>
            </div>
            <div className="gov-stat">
              <span>⚡</span>
              <span>训练</span>
              <span className="color-green">+{Math.round(totalBonusTrainSpeed * 100)}%</span>
            </div>
          </div>

          {government.researchingPolicy && (
            <div className="active-policy-research">
              <div className="research-header">
                <span className="research-icon">
                  {getPolicyById(government.researchingPolicy.policyId)?.icon}
                </span>
                <div className="research-info">
                  <div className="research-name">
                    推行政策：{getPolicyById(government.researchingPolicy.policyId)?.name}
                  </div>
                  <div className="research-progress-bar">
                    <div
                      className="research-progress-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          (government.researchingPolicy.progress /
                            (getPolicyById(government.researchingPolicy.policyId)?.researchTime ||
                              1)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="research-time">
                    {Math.floor(government.researchingPolicy.progress)}s /{' '}
                    {getPolicyById(government.researchingPolicy.policyId)?.researchTime}s
                  </div>
                </div>
              </div>
              <button className="btn btn-danger btn-small" onClick={cancelPolicyResearch}>
                取消
              </button>
            </div>
          )}

          {government.activePolicies.length > 0 && (
            <div className="active-policies">
              <div className="section-title">✅ 已生效政策</div>
              <div className="active-policies-list">
                {government.activePolicies.map((ap) => {
                  const config = getPolicyById(ap.policyId);
                  if (!config) return null;
                  return (
                    <div key={ap.policyId} className="active-policy-card">
                      <span className="ap-icon">{config.icon}</span>
                      <span className="ap-name">{config.name}</span>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => deactivatePolicy(ap.policyId)}
                      >
                        废除
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="policy-categories">
            {(Object.keys(POLICY_CATEGORIES) as PolicyCategory[]).map((cat) => (
              <button
                key={cat}
                className={`policy-category-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                <span className="cat-icon">{POLICY_CATEGORIES[cat].icon}</span>
                <span className="cat-name">{POLICY_CATEGORIES[cat].name}</span>
              </button>
            ))}
          </div>

          <div className="policy-category-desc">
            {categoryInfo.icon} {categoryInfo.name} - {categoryInfo.description}
          </div>

          <div className="policy-tree">
            {tiers.map((tier) => (
              <div key={tier} className="policy-tier">
                <div className="tier-label">第 {tier} 阶</div>
                <div className="policy-tier-grid">
                  {categoryPolicies
                    .filter((p) => p.tier === tier)
                    .map((policy) => {
                      const completed = isPolicyCompleted(policy.id);
                      const researching = isPolicyResearching(policy.id);
                      const active = isPolicyActive(policy.id);
                      const canStart = canResearchPolicy(policy.id);

                      return (
                        <div
                          key={policy.id}
                          className={`policy-node ${
                            completed
                              ? active
                                ? 'active'
                                : 'completed'
                              : researching
                              ? 'researching'
                              : canStart
                              ? 'available'
                              : 'locked'
                          } ${selectedPolicy === policy.id ? 'selected' : ''}`}
                          onClick={() =>
                            setSelectedPolicy(selectedPolicy === policy.id ? null : policy.id)
                          }
                        >
                          <div className="policy-node-icon">{policy.icon}</div>
                          <div className="policy-node-name">{policy.name}</div>
                          {researching && (
                            <div className="policy-node-progress">
                              <div
                                className="policy-node-progress-fill"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    ((government.researchingPolicy?.progress || 0) /
                                      policy.researchTime) *
                                      100
                                  )}%`,
                                }}
                              />
                            </div>
                          )}
                          {completed && active && (
                            <div className="policy-node-check">✓</div>
                          )}
                          {completed && !active && (
                            <div className="policy-node-check archived">✗</div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          {selectedPolicy && (
            <div className="policy-detail">
              {(() => {
                const policy = getPolicyById(selectedPolicy);
                if (!policy) return null;
                const completed = isPolicyCompleted(selectedPolicy);
                const researching = isPolicyResearching(selectedPolicy);
                const active = isPolicyActive(selectedPolicy);
                const canStart = canResearchPolicy(selectedPolicy);
                const requirements = getRequirementText(selectedPolicy);
                const effects = getEffectText(selectedPolicy);
                const onCooldown = (government.policyCooldowns[selectedPolicy] || 0) > 0;

                return (
                  <>
                    <div className="policy-detail-header">
                      <span className="policy-detail-icon">{policy.icon}</span>
                      <div>
                        <div className="policy-detail-name">
                          {policy.name}
                          {completed && active && <span className="badge-active">生效中</span>}
                          {completed && !active && <span className="badge-completed">已研究</span>}
                          {researching && <span className="badge-researching">推行中</span>}
                        </div>
                        <div className="policy-detail-desc">{policy.description}</div>
                      </div>
                    </div>

                    <div className="policy-detail-section">
                      <div className="section-title">📜 政策效果</div>
                      <div className="policy-effects">
                        {effects.map((effect, idx) => (
                          <div key={idx} className="policy-effect">
                            {effect}
                          </div>
                        ))}
                      </div>
                    </div>

                    {requirements.length > 0 && (
                      <div className="policy-detail-section">
                        <div className="section-title">📋 前置条件</div>
                        <div className="policy-requirements">
                          {requirements.map((req, idx) => (
                            <div key={idx} className="policy-requirement">
                              {req}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!completed && (
                      <div className="policy-detail-section">
                        <div className="section-title">💰 推行消耗</div>
                        <div className="cost-list">
                          <span
                            className={`cost-item ${
                              government.policyPoints >= policy.cost ? '' : 'insufficient'
                            }`}
                          >
                            📜 {policy.cost} 政策点
                          </span>
                        </div>
                        <div className="research-time-info">
                          ⏱️ 推行时间：{policy.researchTime} 秒
                        </div>
                      </div>
                    )}

                    {!completed && !researching && (
                      <button
                        className={`btn ${canStart ? 'btn-primary' : 'btn-disabled'}`}
                        onClick={() => canStart && startPolicyResearch(selectedPolicy)}
                        disabled={!canStart}
                      >
                        {canStart ? '开始推行' : '条件不足'}
                      </button>
                    )}

                    {completed && !active && (
                      <button
                        className={`btn ${onCooldown ? 'btn-disabled' : 'btn-success'}`}
                        onClick={() => !onCooldown && activatePolicy(selectedPolicy)}
                        disabled={onCooldown}
                      >
                        {onCooldown
                          ? `冷却中 (${Math.ceil(government.policyCooldowns[selectedPolicy]! / 1000)}s)`
                          : '启用政策'}
                      </button>
                    )}

                    {completed && active && (
                      <button className="btn btn-warning" onClick={() => deactivatePolicy(selectedPolicy)}>
                        暂停政策
                      </button>
                    )}

                    {!completed && researching && (
                      <div className="researching-hint">政策正在推行中...</div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tax' && (
        <div className="tax-section">
          <div className="section-title">📊 资源税率管理</div>
          <div className="tax-hint">
            税率越高，资源收集越多，但忠诚下降风险越大。高管理属性可减轻负面影响。
          </div>

          {Object.entries(government.taxRates).map(([resource, rate]) => {
            const resourceNames: Record<string, { name: string; icon: string }> = {
              food: { name: '食物', icon: '🍖' },
              wood: { name: '木材', icon: '🪵' },
              stone: { name: '石料', icon: '🪨' },
              iron: { name: '铁矿', icon: '⛓️' },
              leather: { name: '皮革', icon: '🥋' },
              gold: { name: '金币', icon: '🪙' },
            };
            const info = resourceNames[resource];
            if (!info) return null;

            const getRateLabel = (r: number) => {
              if (r <= 0.1) return '轻徭薄赋';
              if (r <= 0.2) return '正常征收';
              if (r <= 0.3) return '适度征收';
              if (r <= 0.4) return '加重征收';
              return '横征暴敛';
            };

            return (
              <div key={resource} className="tax-item">
                <div className="tax-header">
                  <span className="tax-icon">{info.icon}</span>
                  <span className="tax-name">{info.name}</span>
                  <span className="tax-value">{(rate * 100).toFixed(0)}%</span>
                  <span className={`tax-label rate-${Math.ceil(rate * 5)}`}>
                    {getRateLabel(rate)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={rate}
                  onChange={(e) =>
                    setTaxRate(resource as keyof typeof government.taxRates, parseFloat(e.target.value))
                  }
                  className="tax-slider"
                />
                <div className="tax-collected">
                  额外征收：+{Math.floor((resources[resource as keyof typeof resources] || 0) * rate * 0.01)}
                  /秒（约）
                </div>
              </div>
            );
          })}

          <div className="tax-summary">
            <div className="summary-item">
              <span>💚 忠诚影响</span>
              <span
                className={
                  Object.values(government.taxRates).reduce((a, b) => a + b, 0) > 1.2
                    ? 'color-red'
                    : 'color-green'
                }
              >
                {Object.values(government.taxRates).reduce((a, b) => a + b, 0) > 1.2
                  ? '⚠️ 高风险'
                  : '✓ 稳定'}
              </span>
            </div>
            <div className="summary-item">
              <span>📦 预计总收益</span>
              <span className="color-gold">
                +{Math.floor(
                  Object.entries(government.taxRates).reduce(
                    (sum, [res, rate]) =>
                      sum + (resources[res as keyof typeof resources] || 0) * rate * 0.01,
                    0
                  )
                )}
                /秒
              </span>
            </div>
          </div>

          <div className="unit-preference-section">
            <div className="section-title">⚔️ 兵种偏好</div>
            <div className="unit-pref-hint">
              选择部落主力发展方向，将获得对应训练速度和属性加成
            </div>
            <div className="unit-pref-grid">
              {(['balanced', 'infantry', 'cavalry', 'archer', 'shaman', 'beast'] as const).map((pref) => {
                const prefNames: Record<string, { name: string; icon: string; desc: string }> = {
                  balanced: { name: '均衡发展', icon: '⚖️', desc: '训练速度均衡，无特殊加成' },
                  infantry: { name: '步兵优先', icon: '🛡️', desc: '步兵训练速度+20%，步兵攻击+10%' },
                  cavalry: { name: '骑兵优先', icon: '🏇', desc: '骑兵训练速度+20%，骑兵攻击+10%' },
                  archer: { name: '弓手优先', icon: '🏹', desc: '弓手训练速度+20%，弓手攻击+10%' },
                  shaman: { name: '萨满优先', icon: '🔮', desc: '萨满训练速度+20%，萨满生命+15%' },
                  beast: { name: '兽群优先', icon: '🐺', desc: '兽群训练速度+20%，兽群生命+15%' },
                };
                const info = prefNames[pref];
                const active = government.unitPreference.primary === pref;
                return (
                  <div
                    key={pref}
                    className={`unit-pref-card ${active ? 'active' : ''}`}
                    onClick={() => {
                      const current = government.unitPreference;
                      useGameStore.getState().setUnitPreference({
                        ...current,
                        primary: pref,
                      });
                    }}
                  >
                    <div className="pref-icon">{info.icon}</div>
                    <div className="pref-name">{info.name}</div>
                    <div className="pref-desc">{info.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
