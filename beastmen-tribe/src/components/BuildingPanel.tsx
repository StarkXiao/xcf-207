import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { BUILDINGS, getBuildingCost, getBuildingProduction, getRequirementDescription, getBuildTime, getUpgradeTime } from '../data/buildings';
import { RESOURCE_INFO } from '../data/trades';
import type { BuildingType, Resources, BuildQueueItem, BuildingUpgradeHint, ProductionEstimate } from '../types';
import { getBuildingGridSize } from '../data/grid';

interface Props {
  gameRef: React.MutableRefObject<unknown>;
}

export function BuildingPanel({ gameRef }: Props) {
  const buildings = useGameStore((s) => s.buildings);
  const unlockedBuildings = useGameStore((s) => s.unlockedBuildings);
  const canAfford = useGameStore((s) => s.canAfford);
  const selectBuilding = useGameStore((s) => s.selectBuilding);
  const resources = useGameStore((s) => s.resources);
  const selectedBuildingId = useGameStore((s) => s.selectedBuildingId);
  const buildQueue = useGameStore((s) => s.buildQueue);
  const maxBuildQueueSize = useGameStore((s) => s.maxBuildQueueSize);
  const addToBuildQueue = useGameStore((s) => s.addToBuildQueue);
  const cancelBuildQueueItem = useGameStore((s) => s.cancelBuildQueueItem);
  const getProductionEstimate = useGameStore((s) => s.getProductionEstimate);
  const getUpgradeHints = useGameStore((s) => s.getUpgradeHints);
  const getUnlockableBuildings = useGameStore((s) => s.getUnlockableBuildings);
  const checkBuildingRequirements = useGameStore((s) => s.checkBuildingRequirements);
  const getBuildingAdjacencyBonus = useGameStore((s) => s.getBuildingAdjacencyBonus);
  const getBuildingAdjacencyMultiplier = useGameStore((s) => s.getBuildingAdjacencyMultiplier);

  const [showUpgradeHints, setShowUpgradeHints] = useState(false);
  const upgradeHints = getUpgradeHints();
  const unlockableBuildings = getUnlockableBuildings();
  const affordableHints = upgradeHints.filter((h) => h.canAfford);

  const handleBuild = (type: BuildingType) => {
    const game = gameRef.current as { scene?: { getScene: (name: string) => { events: { emit: (event: string, data: unknown) => void } } } };
    const scene = game.scene?.getScene('VillageScene');
    if (scene) {
      selectBuilding(null);
      scene.events.emit('startPlacing', type);
    }
  };

  const handleUpgrade = (buildingId: string) => {
    const building = buildings.find((b) => b.id === buildingId);
    if (!building) return;
    addToBuildQueue('upgrade', building.type, undefined, undefined, buildingId);
  };

  const handleQuickUpgrade = (hint: BuildingUpgradeHint) => {
    addToBuildQueue('upgrade', hint.buildingType, undefined, undefined, hint.buildingId);
  };

  const selected = buildings.find((b) => b.id === selectedBuildingId);

  return (
    <div className="panel building-panel">
      <h3 className="panel-title">🏗️ 村落建设</h3>

      {buildQueue.length > 0 && (
        <div className="build-queue-section">
          <div className="queue-title">
            🔨 施工队列 ({buildQueue.length}/{maxBuildQueueSize})
          </div>
          <div className="queue-list">
            {buildQueue.map((item, index) => (
              <BuildQueueItemComponent
                key={item.id}
                item={item}
                isActive={index === 0}
                onCancel={() => cancelBuildQueueItem(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {affordableHints.length > 0 && (
        <div className="upgrade-hints-section">
          <div
            className="hints-header"
            onClick={() => setShowUpgradeHints(!showUpgradeHints)}
          >
            <span>⬆️ 可升级建筑 ({affordableHints.length})</span>
            <span className="toggle-icon">{showUpgradeHints ? '▲' : '▼'}</span>
          </div>
          {showUpgradeHints && (
            <div className="hints-list">
              {affordableHints.slice(0, 5).map((hint) => (
                <div key={hint.buildingId} className="hint-item">
                  <div className="hint-info">
                    <span className="hint-icon">{BUILDINGS[hint.buildingType].icon}</span>
                    <span className="hint-name">
                      {BUILDINGS[hint.buildingType].name} Lv.{hint.currentLevel} → Lv.{hint.nextLevel}
                    </span>
                  </div>
                  <button
                    className="btn btn-small btn-primary"
                    onClick={() => handleQuickUpgrade(hint)}
                    disabled={buildQueue.length >= maxBuildQueueSize}
                  >
                    升级
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {unlockableBuildings.length > 0 && (
        <div className="unlockable-section">
          <div className="queue-title">🔓 新建筑可解锁</div>
          <div className="unlockable-list">
            {unlockableBuildings.map((type) => {
              const config = BUILDINGS[type];
              const cost = getBuildingCost(type, 0);
              const affordable = canAfford(cost);
              return (
                <div
                  key={type}
                  className={`unlockable-card ${affordable ? '' : 'disabled'}`}
                  onClick={() => affordable && handleBuild(type)}
                >
                  <span className="unlockable-icon">{config.icon}</span>
                  <span className="unlockable-name">{config.name}</span>
                  <span className="unlockable-tag">NEW</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <div className="selected-building">
          <div className="selected-header">
            <span className="selected-icon">{BUILDINGS[selected.type].icon}</span>
            <div>
              <div className="selected-name">
                {BUILDINGS[selected.type].name} Lv.{selected.level}
              </div>
              <div className="selected-desc">{BUILDINGS[selected.type].description}</div>
            </div>
          </div>

          {selected.level < BUILDINGS[selected.type].maxLevel && (
            <>
              <div className="cost-list">
                <div className="cost-label">升级费用：</div>
                {Object.entries(getBuildingCost(selected.type, selected.level)).map(
                  ([res, amount]) => (
                    <span
                      key={res}
                      className={`cost-item ${
                        resources[res as keyof Resources] >= (amount as number)
                          ? ''
                          : 'insufficient'
                      }`}
                    >
                      {RESOURCE_INFO[res as keyof typeof RESOURCE_INFO].icon}{' '}
                      {amount as number}
                    </span>
                  )
                )}
              </div>

              <div className="upgrade-time">
                ⏱️ 建造时间: {getUpgradeTime(selected.type, selected.level)}秒
              </div>

              {Object.keys(getBuildingProduction(selected.type, selected.level)).length > 0 && (
                <ProductionEstimateDisplay
                  type={selected.type}
                  currentLevel={selected.level}
                  estimate={getProductionEstimate(selected.type, selected.level)}
                />
              )}

              <button
                className="btn btn-primary"
                onClick={() => handleUpgrade(selected.id)}
                disabled={
                  !canAfford(getBuildingCost(selected.type, selected.level)) ||
                  buildQueue.length >= maxBuildQueueSize
                }
              >
                {buildQueue.length >= maxBuildQueueSize ? '队列已满' : `升级到 Lv.${selected.level + 1}`}
              </button>
            </>
          )}
          {selected.level >= BUILDINGS[selected.type].maxLevel && (
            <div className="max-level">✨ 已达最高等级</div>
          )}

          {Object.keys(getBuildingProduction(selected.type, selected.level)).length >
            0 && (
            <div className="production-list">
              <div className="cost-label">当前产出/秒：</div>
              {(() => {
                const adjacencyBonus = getBuildingAdjacencyBonus(selected.id);
                const adjacencyMultiplier = getBuildingAdjacencyMultiplier(selected.id);
                return (
                  <>
                    {Object.entries(getBuildingProduction(selected.type, selected.level)).map(
                      ([res, amount]) => (
                        <span key={res} className="production-item">
                          {RESOURCE_INFO[res as keyof typeof RESOURCE_INFO].icon} +
                          {((amount as number) * adjacencyMultiplier).toFixed(2)}/s
                          {adjacencyBonus.totalBonusPercent > 0 && (
                            <span className="bonus-positive"> (含+{adjacencyBonus.totalBonusPercent}%邻接)</span>
                          )}
                        </span>
                      )
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {(() => {
            const adjacencyBonus = getBuildingAdjacencyBonus(selected.id);
            const config = BUILDINGS[selected.type];
            const gridSize = getBuildingGridSize(selected.type);
            return (
              <div className="adjacency-info">
                <div className="cost-label">
                  📐 占地: {gridSize.width}x{gridSize.height}格
                </div>
                {adjacencyBonus.totalBonusPercent > 0 ? (
                  <div className="adjacency-bonus-active">
                    <div className="bonus-title">🏆 当前邻接加成: +{adjacencyBonus.totalBonusPercent}%</div>
                    {adjacencyBonus.bonusDetails.map((detail, idx) => (
                      <div key={idx} className="bonus-detail">
                        ↳ {detail.neighborBuildingName}: +{detail.bonusPercent}%
                      </div>
                    ))}
                  </div>
                ) : null}
                {config.adjacencyBonusRules && config.adjacencyBonusRules.length > 0 && (
                  <div className="adjacency-rules">
                    <div className="rules-title">💡 邻接加成规则:</div>
                    {config.adjacencyBonusRules.map((rule, idx) => (
                      <div key={idx} className="rule-detail">
                        ↳ {rule.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <button
            className="btn btn-secondary btn-small"
            onClick={() => selectBuilding(null)}
            style={{ marginTop: '8px' }}
          >
            取消选择
          </button>
        </div>
      )}

      {!selected && (
        <>
          <div className="building-grid">
            {unlockedBuildings.map((type) => {
              const config = BUILDINGS[type];
              const cost = getBuildingCost(type, 0);
              const affordable = canAfford(cost);
              const { met, missing } = checkBuildingRequirements(type);
              const canBuildNow = met && affordable && buildQueue.length < maxBuildQueueSize;

              return (
                <div
                  key={type}
                  className={`building-card ${canBuildNow ? '' : 'disabled'}`}
                  onClick={() => canBuildNow && handleBuild(type)}
                  title={!met ? missing.map(getRequirementDescription).join('\n') : ''}
                >
                  <div className="building-icon">{config.icon}</div>
                  <div className="building-name">{config.name}</div>
                  <div className="building-cost">
                    {Object.entries(cost).map(([res, amount]) => (
                      <span key={res} className="cost-mini">
                        {RESOURCE_INFO[res as keyof typeof RESOURCE_INFO].icon}
                        {amount as number}
                      </span>
                    ))}
                  </div>
                  <div className="building-time">
                    ⏱️ {getBuildTime(type)}s
                    <span style={{ marginLeft: '8px' }}>
                      📐 {getBuildingGridSize(type).width}x{getBuildingGridSize(type).height}
                    </span>
                  </div>
                  {!met && (
                    <div className="building-locked">
                      🔒 {getRequirementDescription(missing[0])}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <UnlockProgress />
        </>
      )}

      <div className="hint">
        {selected
          ? '查看建筑详情，可升级提升产出或解锁新功能'
          : '点击下方卡片建造新建筑，或点击地图上的建筑查看详情'}
      </div>
    </div>
  );
}

function BuildQueueItemComponent({
  item,
  isActive,
  onCancel,
}: {
  item: BuildQueueItem;
  isActive: boolean;
  onCancel: () => void;
}) {
  const config = BUILDINGS[item.buildingType];
  const progress = (item.progress / item.totalTime) * 100;
  const remaining = Math.max(0, item.totalTime - item.progress);

  return (
    <div className={`queue-item ${isActive ? 'active' : ''}`}>
      <div className="queue-item-header">
        <span className="queue-item-icon">{config.icon}</span>
        <span className="queue-item-name">
          {item.type === 'build' ? '建造' : '升级'} {config.name}
          {item.type === 'upgrade' && ` → Lv.${item.targetLevel}`}
        </span>
        <span className="queue-item-time">{Math.ceil(remaining)}s</span>
      </div>
      <div className="queue-progress-bar">
        <div
          className="queue-progress-fill"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      {!isActive && (
        <button
          className="btn btn-small btn-danger queue-cancel-btn"
          onClick={onCancel}
        >
          取消 (返还50%)
        </button>
      )}
    </div>
  );
}

function ProductionEstimateDisplay(_props: {
  type: BuildingType;
  currentLevel: number;
  estimate: ProductionEstimate;
}) {
  const { estimate } = _props;
  return (
    <div className="production-estimate">
      <div className="cost-label">📈 升级后产能预估：</div>
      <div className="estimate-comparison">
        {Object.entries(estimate.next).map(([res, amount]) => {
          const gain = estimate.gain[res as keyof Resources] || 0;
          const gainPercent = estimate.gainPercent[res as keyof Resources] || 0;
          return (
            <div key={res} className="estimate-item">
              <span className="estimate-resource">
                {RESOURCE_INFO[res as keyof typeof RESOURCE_INFO].icon}
              </span>
              <span className="estimate-current">
                {estimate.current[res as keyof Resources] || 0}/s
              </span>
              <span className="estimate-arrow">→</span>
              <span className="estimate-next">
                {(amount as number).toFixed(1)}/s
              </span>
              <span className="estimate-gain positive">
                +{gain.toFixed(1)} ({gainPercent > 0 ? '+' : ''}{gainPercent.toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UnlockProgress() {
  const buildings = useGameStore((s) => s.buildings);
  const unlockedBuildings = useGameStore((s) => s.unlockedBuildings);
  const townhall = buildings.find((b) => b.type === 'townhall');
  const hasBarracks = buildings.some((b) => b.type === 'barracks');
  const hasMarket = unlockedBuildings.includes('market');
  const hasSmithy = unlockedBuildings.includes('smithy');

  const thLevel = townhall?.level || 0;

  return (
    <div className="unlock-progress">
      <div className="queue-title">🔓 解锁进度</div>
      <div className="progress-list">
        <div className={`progress-item ${thLevel >= 2 ? 'done' : ''}`}>
          <span className="check">{thLevel >= 2 ? '✅' : '⬜'}</span>
          <span>升级部落大厅到 Lv.2 → 解锁兵营、交易市场</span>
        </div>
        <div className={`progress-item ${hasBarracks ? 'done' : ''}`}>
          <span className="check">{hasBarracks ? '✅' : '⬜'}</span>
          <span>建造兵营 → 解锁铁匠铺</span>
        </div>
        <div className={`progress-item ${hasMarket ? 'done' : ''}`}>
          <span className="check">{hasMarket ? '✅' : '⬜'}</span>
          <span>建造交易市场 → 开启资源交易</span>
        </div>
        <div className={`progress-item ${hasSmithy ? 'done' : ''}`}>
          <span className="check">{hasSmithy ? '✅' : '⬜'}</span>
          <span>建造铁匠铺 → 解锁高级兵种</span>
        </div>
      </div>
    </div>
  );
}
