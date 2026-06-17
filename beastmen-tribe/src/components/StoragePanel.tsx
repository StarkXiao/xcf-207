import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { RESOURCE_INFO } from '../data/trades';
import { getBuildingStorageCapacity } from '../data/buildings';
import type { ResourceType } from '../types';

interface Props {
  onClose: () => void;
}

export function StoragePanel({ onClose }: Props) {
  const resources = useGameStore((s) => s.resources);
  const resourceCapacity = useGameStore((s) => s.resourceCapacity);
  const buildings = useGameStore((s) => s.buildings);
  const transportTasks = useGameStore((s) => s.transportTasks);
  const spoilageEvents = useGameStore((s) => s.spoilageEvents);
  const offlineEarnings = useGameStore((s) => s.offlineEarnings);
  const collectOfflineEarnings = useGameStore((s) => s.collectOfflineEarnings);
  const cancelTransport = useGameStore((s) => s.cancelTransport);
  const dismissSpoilageEvent = useGameStore((s) => s.dismissSpoilageEvent);
  const startTransport = useGameStore((s) => s.startTransport);

  const [selectedResource, setSelectedResource] = useState<ResourceType>('food');
  const [transportAmount, setTransportAmount] = useState(50);

  const hasCaravanserai = buildings.some((b) => b.type === 'caravanserai' && !b.isBuilding);
  const warehouses = buildings.filter((b) => b.type === 'warehouse' && !b.isBuilding);
  const activeBuildings = buildings.filter((b) => !b.isBuilding && b.type !== 'townhall');

  const getStorageColor = (percent: number) => {
    if (percent >= 90) return '#e53935';
    if (percent >= 70) return '#ff9800';
    return '#4caf50';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}分${secs}秒`;
  };

  const handleStartTransport = () => {
    if (activeBuildings.length < 2) return;
    const fromBuilding = activeBuildings[0];
    const toBuilding = activeBuildings[activeBuildings.length - 1];
    startTransport(selectedResource, transportAmount, fromBuilding.id, toBuilding.id);
  };

  const totalStorageFromWarehouses = warehouses.reduce((sum, w) => {
    const cap = getBuildingStorageCapacity(w.type, w.level);
    return {
      food: sum.food + (cap.food || 0),
      wood: sum.wood + (cap.wood || 0),
      stone: sum.stone + (cap.stone || 0),
      gold: sum.gold + (cap.gold || 0),
      iron: sum.iron + (cap.iron || 0),
    };
  }, { food: 0, wood: 0, stone: 0, gold: 0, iron: 0 });

  return (
    <div className="panel storage-panel">
      <div className="panel-header">
        <h3 className="panel-title">📦 仓储管理</h3>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      {offlineEarnings && !offlineEarnings.collected && (
        <div className="offline-earnings-banner">
          <div className="offline-title">💤 离线收益</div>
          <div className="offline-duration">
            离线时长：{formatTime(offlineEarnings.duration)}
          </div>
          <div className="offline-resources">
            {Object.entries(offlineEarnings.resources).map(([key, amount]) => (
              <span key={key} className="offline-resource-item">
                {RESOURCE_INFO[key as keyof typeof RESOURCE_INFO].icon}
                +{Math.floor(amount as number)}
              </span>
            ))}
          </div>
          <button
            className="btn btn-primary"
            onClick={collectOfflineEarnings}
          >
            领取收益
          </button>
        </div>
      )}

      <div className="section">
        <h4 className="section-title">📊 资源容量</h4>
        <div className="capacity-list">
          {(Object.keys(RESOURCE_INFO) as ResourceType[]).map((resource) => {
            const current = resources[resource];
            const max = resourceCapacity[resource];
            const percent = Math.min(100, (current / max) * 100);
            return (
              <div key={resource} className="capacity-item">
                <div className="capacity-header">
                  <span className="capacity-icon">
                    {RESOURCE_INFO[resource].icon}
                  </span>
                  <span className="capacity-name">
                    {RESOURCE_INFO[resource].name}
                  </span>
                  <span className="capacity-value">
                    {Math.floor(current).toLocaleString()} / {max.toLocaleString()}
                  </span>
                </div>
                <div className="capacity-bar">
                  <div
                    className="capacity-fill"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: getStorageColor(percent),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section">
        <h4 className="section-title">
          🏚️ 仓库建筑 ({warehouses.length})
        </h4>
        {warehouses.length === 0 ? (
          <div className="empty-state">暂无仓库建筑，请先建造大仓库</div>
        ) : (
          <div className="warehouse-list">
            {warehouses.map((wh, idx) => {
              const cap = getBuildingStorageCapacity(wh.type, wh.level);
              return (
                <div key={wh.id} className="warehouse-item">
                  <span className="warehouse-icon">🏚️</span>
                  <div className="warehouse-info">
                    <div className="warehouse-name">
                      大仓库 #{idx + 1} Lv.{wh.level}
                    </div>
                    <div className="warehouse-capacity">
                      容量：+{Object.entries(cap).map(([k, v]) => 
                        `${RESOURCE_INFO[k as keyof typeof RESOURCE_INFO].icon}${v}`
                      ).join(' ')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="storage-bonus">
          仓库提供容量：
          {Object.entries(totalStorageFromWarehouses).map(([k, v]) => (
            <span key={k} className="bonus-item">
              {RESOURCE_INFO[k as keyof typeof RESOURCE_INFO].icon}+{v}
            </span>
          ))}
        </div>
      </div>

      <div className="section">
        <h4 className="section-title">
          🐪 运输队列 ({transportTasks.length}/{MAX_TRANSPORT_TASKS})
        </h4>
        {!hasCaravanserai ? (
          <div className="empty-state">请先建造商队驿站以解锁运输功能</div>
        ) : (
          <>
            <div className="transport-form">
              <div className="form-row">
                <label>资源类型：</label>
                <select
                  value={selectedResource}
                  onChange={(e) => setSelectedResource(e.target.value as ResourceType)}
                >
                  {(Object.keys(RESOURCE_INFO) as ResourceType[]).map((r) => (
                    <option key={r} value={r}>
                      {RESOURCE_INFO[r].icon} {RESOURCE_INFO[r].name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>数量：</label>
                <input
                  type="number"
                  value={transportAmount}
                  onChange={(e) => setTransportAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  min={1}
                  max={resources[selectedResource]}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleStartTransport}
                disabled={
                  transportTasks.length >= 5 ||
                  transportAmount <= 0 ||
                  resources[selectedResource] < transportAmount ||
                  activeBuildings.length < 2
                }
              >
                开始运输
              </button>
            </div>

            {transportTasks.length === 0 ? (
              <div className="empty-state">暂无运输任务</div>
            ) : (
              <div className="transport-list">
                {transportTasks.map((task) => {
                  const progress = (task.progress / task.totalTime) * 100;
                  return (
                    <div key={task.id} className="transport-item">
                      <div className="transport-header">
                        <span className="transport-resource">
                          {RESOURCE_INFO[task.resource].icon} {task.amount}
                        </span>
                        <span className="transport-status">运输中</span>
                      </div>
                      <div className="transport-bar">
                        <div
                          className="transport-fill"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="transport-footer">
                        <span>
                          剩余 {Math.ceil(task.totalTime - task.progress)}秒
                        </span>
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => cancelTransport(task.id)}
                        >
                          取消 (退80%)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {spoilageEvents.length > 0 && (
        <div className="section">
          <h4 className="section-title">⚠️ 损耗事件</h4>
          <div className="spoilage-list">
            {spoilageEvents.map((event) => (
              <div key={event.id} className="spoilage-item">
                <div className="spoilage-header">
                  <span className="spoilage-icon">{event.icon}</span>
                  <span className="spoilage-name">{event.name}</span>
                  <button
                    className="btn-close-small"
                    onClick={() => dismissSpoilageEvent(event.id)}
                  >
                    ×
                  </button>
                </div>
                <div className="spoilage-desc">{event.description}</div>
                <div className="spoilage-loss">
                  损失：{RESOURCE_INFO[event.resource].icon} -{event.lossAmount}
                  ({((event.lossPercent || 0) * 100).toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const MAX_TRANSPORT_TASKS = 5;
