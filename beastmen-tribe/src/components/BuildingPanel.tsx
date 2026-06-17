import { useGameStore } from '../store/useGameStore';
import { BUILDINGS, getBuildingCost, getBuildingProduction } from '../data/buildings';
import { RESOURCE_INFO } from '../data/trades';
import type { BuildingType, Resources } from '../types';

interface Props {
  gameRef: React.MutableRefObject<any>;
}

export function BuildingPanel({ gameRef }: Props) {
  const buildings = useGameStore((s) => s.buildings);
  const unlockedBuildings = useGameStore((s) => s.unlockedBuildings);
  const canAfford = useGameStore((s) => s.canAfford);
  const upgradeBuilding = useGameStore((s) => s.upgradeBuilding);
  const selectBuilding = useGameStore((s) => s.selectBuilding);
  const resources = useGameStore((s) => s.resources);
  const selectedBuildingId = useGameStore((s) => s.selectedBuildingId);

  const handleBuild = (type: BuildingType) => {
    const scene = gameRef.current?.scene?.getScene('VillageScene');
    if (scene) {
      selectBuilding(null);
      scene.events.emit('startPlacing', type);
    }
  };

  const selected = buildings.find((b) => b.id === selectedBuildingId);

  return (
    <div className="panel building-panel">
      <h3 className="panel-title">🏗️ 村落建设</h3>

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
              <button
                className="btn btn-primary"
                onClick={() => upgradeBuilding(selected.id)}
                disabled={!canAfford(getBuildingCost(selected.type, selected.level))}
              >
                升级到 Lv.{selected.level + 1}
              </button>
            </>
          )}
          {selected.level >= BUILDINGS[selected.type].maxLevel && (
            <div className="max-level">✨ 已达最高等级</div>
          )}

          {Object.keys(getBuildingProduction(selected.type, selected.level)).length >
            0 && (
            <div className="production-list">
              <div className="cost-label">资源产出/秒：</div>
              {Object.entries(getBuildingProduction(selected.type, selected.level)).map(
                ([res, amount]) => (
                  <span key={res} className="production-item">
                    {RESOURCE_INFO[res as keyof typeof RESOURCE_INFO].icon} +
                    {amount as number}/s
                  </span>
                )
              )}
            </div>
          )}

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
              return (
                <div
                  key={type}
                  className={`building-card ${affordable ? '' : 'disabled'}`}
                  onClick={() => affordable && handleBuild(type)}
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
