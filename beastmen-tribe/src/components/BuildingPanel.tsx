import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { BUILDINGS, getBuildingCost, getBuildingProduction } from '../data/buildings';
import { RESOURCE_INFO } from '../data/trades';
import type { BuildingType, Resources } from '../types';

interface Props {
  gameRef: React.MutableRefObject<any>;
}

export function BuildingPanel({ gameRef }: Props) {
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const buildings = useGameStore((s) => s.buildings);
  const unlockedBuildings = useGameStore((s) => s.unlockedBuildings);
  const canAfford = useGameStore((s) => s.canAfford);
  const upgradeBuilding = useGameStore((s) => s.upgradeBuilding);
  const resources = useGameStore((s) => s.resources);

  const handleBuild = (type: BuildingType) => {
    const scene = gameRef.current?.scene?.getScene('VillageScene');
    if (scene) {
      scene.events.emit('startPlacing', type);
    }
  };

  const selected = buildings.find((b) => b.id === selectedBuilding);

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
            onClick={() => setSelectedBuilding(null)}
            style={{ marginTop: '8px' }}
          >
            取消选择
          </button>
        </div>
      )}

      {!selected && (
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
      )}

      <div className="hint">提示：点击建筑卡片后，在地图上点击放置。按 ESC 取消。</div>
    </div>
  );
}
