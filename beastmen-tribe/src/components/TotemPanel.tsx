import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import {
  TOTEMS,
  BLESSINGS,
  TOTEM_OFFERS,
  getTotemCost,
  getTotemFaithCost,
  canUnlockTotem,
  canActivateBlessing,
} from '../data/totems';
import { RESOURCE_INFO } from '../data/trades';
import type { TotemType, BlessingType } from '../types';

type SubTab = 'faith' | 'totems' | 'blessings' | 'offerings';

const SUB_TABS: { id: SubTab; label: string; icon: string }[] = [
  { id: 'faith', label: '信仰', icon: '✨' },
  { id: 'totems', label: '图腾', icon: '🗿' },
  { id: 'blessings', label: '祝福', icon: '🌟' },
  { id: 'offerings', label: '献祭', icon: '🔥' },
];

export function TotemPanel() {
  const [subTab, setSubTab] = useState<SubTab>('faith');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showNotice = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 2500);
  };

  return (
    <div className="panel totem-panel">
      <h3 className="panel-title">🗿 祭祀与图腾</h3>

      <FaithHeader />

      <div className="sub-tabs">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`sub-tab ${subTab === tab.id ? 'active' : ''}`}
            onClick={() => setSubTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {notification && (
        <div className={`totem-notice ${notification.type}`}>
          {notification.msg}
        </div>
      )}

      <div className="sub-tab-content">
        {subTab === 'faith' && <FaithView />}
        {subTab === 'totems' && <TotemsView onNotice={showNotice} />}
        {subTab === 'blessings' && <BlessingsView onNotice={showNotice} />}
        {subTab === 'offerings' && <OfferingsView onNotice={showNotice} />}
      </div>
    </div>
  );
}

function FaithHeader() {
  const faith = useGameStore((s) => s.totem.faith);
  const maxFaith = useGameStore((s) => s.totem.maxFaith);
  const perSecond = useGameStore((s) => s.totem.accumulation.perSecond);
  const percent = Math.min(100, (faith / maxFaith) * 100);

  return (
    <div className="faith-header">
      <div className="faith-info-row">
        <span className="faith-icon">✨</span>
        <div className="faith-text">
          <div className="faith-label">信仰值</div>
          <div className="faith-amount">
            {Math.floor(faith)} / {Math.floor(maxFaith)}
            <span className="faith-rate"> (+{perSecond.toFixed(2)}/s)</span>
          </div>
        </div>
      </div>
      <div className="faith-bar">
        <div className="faith-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function FaithView() {
  const totem = useGameStore((s) => s.totem);
  const buildings = useGameStore((s) => s.buildings);
  const unlockedCount = totem.unlockedTotems.length;
  const activatedCount = totem.unlockedTotems.filter((t) => t.activated).length;
  const activeBlessingCount = totem.activeBlessings.length;

  const altarLevel = buildings
    .filter((b) => b.type === 'totem_altar' && !b.isBuilding)
    .reduce((m, b) => Math.max(m, b.level), 0);
  const poleLevel = buildings
    .filter((b) => b.type === 'totem_pole' && !b.isBuilding)
    .reduce((m, b) => Math.max(m, b.level), 0);
  const shrineLevel = buildings
    .filter((b) => b.type === 'shrine' && !b.isBuilding)
    .reduce((m, b) => Math.max(m, b.level), 0);

  return (
    <div className="faith-view">
      <div className="queue-title">📊 信仰总览</div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon">🗿</div>
          <div className="stat-card-value">{unlockedCount}</div>
          <div className="stat-card-label">已解锁图腾</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">💡</div>
          <div className="stat-card-value">{activatedCount}</div>
          <div className="stat-card-label">激活中</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">🌟</div>
          <div className="stat-card-value">{activeBlessingCount}</div>
          <div className="stat-card-label">生效祝福</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">🔥</div>
          <div className="stat-card-value">{totem.totalOfferings}</div>
          <div className="stat-card-label">累计献祭</div>
        </div>
      </div>

      <div className="queue-title" style={{ marginTop: '16px' }}>🏛️ 神圣建筑</div>
      <div className="building-status-list">
        <div className="building-status">
          <span className="bs-icon">🗿</span>
          <div className="bs-info">
            <div className="bs-name">图腾祭坛 Lv.{altarLevel}</div>
            <div className="bs-desc">
              基础信仰 +{(altarLevel * 0.15).toFixed(2)}/s，上限 +{altarLevel * 200}
            </div>
          </div>
        </div>
        <div className="building-status">
          <span className="bs-icon">🎋</span>
          <div className="bs-info">
            <div className="bs-name">图腾柱 Lv.{poleLevel}</div>
            <div className="bs-desc">
              基础信仰 +{(poleLevel * 0.1).toFixed(2)}/s，上限 +{poleLevel * 150}
            </div>
          </div>
        </div>
        <div className="building-status">
          <span className="bs-icon">⛩️</span>
          <div className="bs-info">
            <div className="bs-name">圣殿 Lv.{shrineLevel}</div>
            <div className="bs-desc">
              基础信仰 +{(shrineLevel * 0.25).toFixed(2)}/s，上限 +{shrineLevel * 400}
            </div>
          </div>
        </div>
      </div>

      {totem.activeBlessings.length > 0 && (
        <>
          <div className="queue-title" style={{ marginTop: '16px' }}>
            ✨ 当前生效的祝福
          </div>
          <div className="active-blessings-list">
            {totem.activeBlessings.map((b) => (
              <div key={b.id} className="active-blessing">
                <span className="ab-icon">{b.icon}</span>
                <div className="ab-info">
                  <div className="ab-name">{b.name}</div>
                  <div className="ab-time">剩余 {Math.ceil(b.remaining)}s</div>
                </div>
                <div className="ab-bar">
                  <div
                    className="ab-fill"
                    style={{ width: `${(b.remaining / b.duration) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface NoticeProps {
  onNotice: (type: 'success' | 'error', msg: string) => void;
}

function TotemsView({ onNotice }: NoticeProps) {
  const state = useGameStore();
  const unlockTotem = useGameStore((s) => s.unlockTotem);
  const activateTotem = useGameStore((s) => s.activateTotem);
  const deactivateTotem = useGameStore((s) => s.deactivateTotem);
  const upgradeTotem = useGameStore((s) => s.upgradeTotem);
  const canAfford = useGameStore((s) => s.canAfford);

  const handleUnlock = (id: TotemType) => {
    const r = unlockTotem(id);
    onNotice(r.success ? 'success' : 'error', r.message);
  };
  const handleActivate = (id: TotemType) => {
    const r = activateTotem(id);
    onNotice(r.success ? 'success' : 'error', r.message);
  };
  const handleDeactivate = (id: TotemType) => {
    const r = deactivateTotem(id);
    onNotice(r.success ? 'success' : 'error', r.message);
  };
  const handleUpgrade = (id: TotemType) => {
    const r = upgradeTotem(id);
    onNotice(r.success ? 'success' : 'error', r.message);
  };

  const totemIds = Object.keys(TOTEMS) as TotemType[];

  return (
    <div className="totems-view">
      <div className="totem-list">
        {totemIds.map((id) => {
          const config = TOTEMS[id];
          const unlocked = state.totem.unlockedTotems.find((t) => t.totemId === id);
          const unlockCheck = canUnlockTotem(
            id,
            state.totem.unlockedTotems,
            state.buildings,
            state.totem.faith
          );
          const cost = unlocked
            ? getTotemCost(id, unlocked.level)
            : getTotemCost(id, 0);
          const faithCost = unlocked
            ? getTotemFaithCost(id, unlocked.level)
            : getTotemFaithCost(id, 0);
          const affordable = canAfford(cost);
          const hasFaith = state.totem.faith >= faithCost;

          return (
            <div
              key={id}
              className={`totem-card tier-${config.tier} ${
                unlocked?.activated ? 'activated' : ''
              } ${unlocked ? 'unlocked' : ''}`}
            >
              <div className="totem-card-header">
                <span className="totem-tier">T{config.tier}</span>
                <span className="totem-card-icon">{config.icon}</span>
                <div className="totem-card-title">
                  <div className="totem-card-name">{config.name}</div>
                  {unlocked && (
                    <div className="totem-card-level">
                      Lv.{unlocked.level}/{unlocked.maxLevel}
                    </div>
                  )}
                </div>
              </div>

              <div className="totem-card-desc">{config.description}</div>

              <div className="totem-effects">
                {config.effects.map((e, i) => (
                  <div key={i} className="effect-tag">
                    {effectLabel(e.type, e.value, e.target)}
                  </div>
                ))}
              </div>

              {config.blessingEffect && (
                <div className="blessing-hint">
                  可释放：{config.blessingEffect.icon} {config.blessingEffect.name}
                </div>
              )}

              {!unlocked ? (
                <>
                  <div className="cost-list">
                    <div className="cost-label">解锁消耗：</div>
                    {Object.entries(cost).map(([res, amount]) => (
                      <span
                        key={res}
                        className={`cost-item ${
                          (state.resources as any)[res] >= (amount as number)
                            ? ''
                            : 'insufficient'
                        }`}
                      >
                        {RESOURCE_INFO[res as keyof typeof RESOURCE_INFO]?.icon || '❓'}{' '}
                        {amount as number}
                      </span>
                    ))}
                    <span
                      className={`cost-item ${hasFaith ? '' : 'insufficient'}`}
                    >
                      ✨ {faithCost}
                    </span>
                  </div>
                  <button
                    className="btn btn-primary btn-small"
                    onClick={() => handleUnlock(id)}
                    disabled={!unlockCheck.canUnlock || !affordable || !hasFaith}
                  >
                    {unlockCheck.canUnlock ? '解锁图腾' : unlockCheck.reason}
                  </button>
                </>
              ) : (
                <>
                  {unlocked.level < unlocked.maxLevel && (
                    <>
                      <div className="cost-list">
                        <div className="cost-label">升级消耗：</div>
                        {Object.entries(cost).map(([res, amount]) => (
                          <span
                            key={res}
                            className={`cost-item ${
                              (state.resources as any)[res] >= (amount as number)
                                ? ''
                                : 'insufficient'
                            }`}
                          >
                            {RESOURCE_INFO[res as keyof typeof RESOURCE_INFO]?.icon ||
                              '❓'}{' '}
                            {amount as number}
                          </span>
                        ))}
                        <span
                          className={`cost-item ${hasFaith ? '' : 'insufficient'}`}
                        >
                          ✨ {faithCost}
                        </span>
                      </div>
                      <button
                        className="btn btn-primary btn-small"
                        onClick={() => handleUpgrade(id)}
                        disabled={!affordable || !hasFaith}
                      >
                        升级到 Lv.{unlocked.level + 1}
                      </button>
                    </>
                  )}
                  {unlocked.level >= unlocked.maxLevel && (
                    <div className="max-level">✨ 已达最高等级</div>
                  )}
                  {unlocked.activated ? (
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => handleDeactivate(id)}
                    >
                      停用图腾
                    </button>
                  ) : (
                    <button
                      className="btn btn-success btn-small"
                      onClick={() => handleActivate(id)}
                    >
                      激活图腾
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BlessingsView({ onNotice }: NoticeProps) {
  const state = useGameStore();
  const activateBlessing = useGameStore((s) => s.activateBlessing);

  const handleActivate = (type: BlessingType) => {
    const r = activateBlessing(type);
    onNotice(r.success ? 'success' : 'error', r.message);
  };

  const available = state.totem.availableBlessings;

  if (available.length === 0) {
    return (
      <div className="empty-view">
        <div className="empty-icon">🌟</div>
        <div className="empty-text">暂无可释放的祝福</div>
        <div className="empty-hint">解锁并激活图腾以获得祝福能力</div>
      </div>
    );
  }

  return (
    <div className="blessings-view">
      <div className="blessing-list">
        {available.map((type) => {
          const b = BLESSINGS[type];
          const check = canActivateBlessing(
            type,
            state.totem.unlockedTotems,
            state.buildings,
            state.totem.faith
          );
          const isActive = state.totem.activeBlessings.some(
            (ab) => ab.blessingType === type
          );
          return (
            <div key={type} className={`blessing-card ${isActive ? 'active' : ''}`}>
              <div className="blessing-header">
                <span className="blessing-icon">{b.icon}</span>
                <div className="blessing-title">
                  <div className="blessing-name">{b.name}</div>
                  <div className="blessing-duration">持续 {b.duration}s</div>
                </div>
              </div>
              <div className="blessing-desc">{b.description}</div>
              <div className="blessing-effects">
                {b.effects.map((e, i) => (
                  <div key={i} className="effect-tag positive">
                    {effectLabel(e.type, e.value, e.target)}
                  </div>
                ))}
              </div>
              <div className="blessing-cost">
                <span className={`cost-item ${state.totem.faith >= b.faithCost ? '' : 'insufficient'}`}>
                  ✨ {b.faithCost}
                </span>
              </div>
              <button
                className={`btn ${isActive ? 'btn-secondary' : 'btn-success'} btn-small`}
                onClick={() => handleActivate(type)}
                disabled={!check.canActivate || isActive}
              >
                {isActive
                  ? '生效中'
                  : check.canActivate
                  ? '释放祝福'
                  : check.reason}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OfferingsView({ onNotice }: NoticeProps) {
  const state = useGameStore();
  const performOffering = useGameStore((s) => s.performOffering);
  const canAfford = useGameStore((s) => s.canAfford);

  const handleOffer = (id: string) => {
    const r = performOffering(id);
    onNotice(r.success ? 'success' : 'error', r.message);
  };

  return (
    <div className="offerings-view">
      <div className="offering-hint">
        💡 通过献祭资源快速积累信仰值，某些献祭会影响部落忠诚度
      </div>
      <div className="offering-list">
        {TOTEM_OFFERS.map((offer) => {
          const cooldown = state.totem.offerCooldowns[offer.id] || 0;
          const affordable = canAfford(offer.resourceCost);
          return (
            <div
              key={offer.id}
              className={`offering-card ${cooldown > 0 ? 'cooling' : ''}`}
            >
              <div className="offering-header">
                <span className="offering-icon">{offer.icon}</span>
                <div className="offering-title">
                  <div className="offering-name">{offer.name}</div>
                  <div className="offering-faith">+{offer.faithReward} ✨</div>
                </div>
              </div>
              <div className="offering-desc">{offer.description}</div>
              <div className="cost-list">
                <div className="cost-label">消耗：</div>
                {Object.entries(offer.resourceCost).map(([res, amount]) => (
                  <span
                    key={res}
                    className={`cost-item ${
                      (state.resources as any)[res] >= (amount as number)
                        ? ''
                        : 'insufficient'
                    }`}
                  >
                    {RESOURCE_INFO[res as keyof typeof RESOURCE_INFO]?.icon || '❓'}{' '}
                    {amount as number}
                  </span>
                ))}
              </div>
              {cooldown > 0 ? (
                <div className="offering-cooldown">
                  冷却中：{Math.ceil(cooldown)}s
                </div>
              ) : (
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => handleOffer(offer.id)}
                  disabled={!affordable}
                >
                  执行献祭
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function effectLabel(type: string, value: number, target?: string): string {
  const isPercent = Math.abs(value) < 5;
  const displayValue = isPercent
    ? `${value > 0 ? '+' : ''}${(value * 100).toFixed(0)}%`
    : `${value > 0 ? '+' : ''}${value}`;

  const typeNames: Record<string, string> = {
    attack_boost: '攻击',
    defense_boost: '防御',
    hp_boost: '生命',
    production_boost: '产出',
    loyalty_boost: '忠诚',
    population_growth: '人口增长',
    food_consumption: '食物消耗',
    loot_bonus: '战利品',
    exp_bonus: '经验',
    train_speed: '训练速度',
    wall_defense: '城墙防御',
    faith_gain: '信仰获取',
  };

  const targetNames: Record<string, string> = {
    grunt: '步兵',
    archer: '猎手',
    shaman: '萨满',
    berserker: '狂战士',
    warlord: '战争酋长',
    farm: '狩猎场',
    lumbermill: '伐木场',
    quarry: '采石场',
    smithy: '铁匠铺',
    market: '交易市场',
    warehouse: '大仓库',
    townhall: '部落大厅',
  };

  const base = `${typeNames[type] || type}${displayValue}`;
  if (target) {
    return `${targetNames[target] || target} ${base}`;
  }
  return base;
}
