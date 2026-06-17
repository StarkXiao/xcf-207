import { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { RESOURCE_INFO } from '../data/trades';
import { getBuildingStorageCapacity } from '../data/buildings';
import type { ResourceType, BuildingStorageInfo } from '../types';

interface Props {
  onClose: () => void;
}

const MAX_TRANSPORT_TASKS = 5;

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
  const getAllBuildingStorageInfo = useGameStore((s) => s.getAllBuildingStorageInfo);
  const getBuildingStorageUsagePercent = useGameStore((s) => s.getBuildingStorageUsagePercent);

  const [selectedResource, setSelectedResource] = useState<ResourceType>('food');
  const [transportAmount, setTransportAmount] = useState(50);
  const [fromBuildingId, setFromBuildingId] = useState<string>('');
  const [toBuildingId, setToBuildingId] = useState<string>('');

  const hasCaravanserai = buildings.some((b) => b.type === 'caravanserai' && !b.isBuilding);
  const warehouses = buildings.filter((b) => b.type === 'warehouse' && !b.isBuilding);
  const allStorageInfo: BuildingStorageInfo[] = getAllBuildingStorageInfo();
  const eligibleBuildings = allStorageInfo.filter((info) =>
    Object.keys(info.capacity).length > 0
  );

  useEffect(() => {
    if (fromBuildingId === '' && eligibleBuildings.length > 0) {
      setFromBuildingId(eligibleBuildings[0].buildingId);
    }
  }, [eligibleBuildings, fromBuildingId]);

  useEffect(() => {
    if (toBuildingId === '' && eligibleBuildings.length > 1) {
      const last = eligibleBuildings[eligibleBuildings.length - 1];
      if (last.buildingId !== fromBuildingId) {
        setToBuildingId(last.buildingId);
      } else if (eligibleBuildings.length > 1) {
        setToBuildingId(eligibleBuildings[0].buildingId);
      }
    }
  }, [eligibleBuildings, toBuildingId, fromBuildingId]);

  const fromBuilding = eligibleBuildings.find((b) => b.buildingId === fromBuildingId);
  const toBuilding = eligibleBuildings.find((b) => b.buildingId === toBuildingId);
  const fromAvailable = fromBuilding ? (fromBuilding.storage[selectedResource] || 0) : 0;
  const toCapacity = toBuilding ? (toBuilding.capacity[selectedResource] || 0) : 0;
  const toStored = toBuilding ? (toBuilding.storage[selectedResource] || 0) : 0;
  const toCanAccept = toCapacity - toStored;

  const getStorageColor = (percent: number) => {
    if (percent >= 90) return '#e53935';
    if (percent >= 70) return '#ff9800';
    return '#4caf50';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}小时${mins}分`;
    }
    return `${mins}分${secs}秒`;
  };

  const formatPct = (v: number) => `${(v * 100).toFixed(0)}%`;

  const [showOfflineDetail, setShowOfflineDetail] = useState(false);

  const handleStartTransport = () => {
    if (!fromBuildingId || !toBuildingId) return;
    if (fromBuildingId === toBuildingId) return;
    startTransport(selectedResource, transportAmount, fromBuildingId, toBuildingId);
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

  const getBuildingDisplayName = (info: BuildingStorageInfo) => {
    const count = buildings.filter((b) => b.type === info.buildingType).length;
    const idx = buildings
      .filter((b) => b.type === info.buildingType)
      .findIndex((b) => b.id === info.buildingId) + 1;
    if (count > 1) {
      return `${info.buildingName} #${idx}`;
    }
    return info.buildingName;
  };

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
            {offlineEarnings.duration !== offlineEarnings.effectiveDuration && (
              <span className="offline-sub-info">（有效：{formatTime(offlineEarnings.effectiveDuration)}）</span>
            )}
          </div>

          <div className="offline-meta">
            <span className="meta-item" title="基础离线效率">
              效率 {formatPct(offlineEarnings.baseEfficiency)}
            </span>
            {offlineEarnings.timeDecayRate < 1 && (
              <span className="meta-item meta-warn" title="超过阈值后时间衰减">
                ⏳衰减 {formatPct(offlineEarnings.timeDecayRate)}
              </span>
            )}
            {offlineEarnings.techBonus > 0 && (
              <span className="meta-item meta-good" title="科技加成">
                🔬+{formatPct(offlineEarnings.techBonus)}
              </span>
            )}
            {offlineEarnings.totemBonus > 0 && (
              <span className="meta-item meta-good" title="图腾加成">
                🗿+{formatPct(offlineEarnings.totemBonus)}
              </span>
            )}
            {offlineEarnings.governmentBonus > 0 && (
              <span className="meta-item meta-good" title="政府加成">
                👑+{formatPct(offlineEarnings.governmentBonus)}
              </span>
            )}
            {offlineEarnings.buildingBonus > 0 && (
              <span className="meta-item meta-good" title="建筑特效加成">
                🏗️+{formatPct(offlineEarnings.buildingBonus)}
              </span>
            )}
          </div>

          <div className="offline-resources">
            {Object.entries(offlineEarnings.resources).length === 0 ? (
              <span className="offline-empty">（无资源收益）</span>
            ) : (
              Object.entries(offlineEarnings.resources).map(([key, amount]) => (
                <span key={key} className="offline-resource-item">
                  {RESOURCE_INFO[key as keyof typeof RESOURCE_INFO].icon}
                  +{Math.floor(amount as number)}
                </span>
              ))
            )}
          </div>

          {Object.keys(offlineEarnings.cappedByStorage || {}).length > 0 && (
            <div className="offline-capped">
              ⚠️ 存储封顶溢出：
              {Object.entries(offlineEarnings.cappedByStorage)
                .filter(([, v]) => (v as number) > 1)
                .map(([k, v]) => (
                  <span key={k} className="capped-item">
                    {RESOURCE_INFO[k as keyof typeof RESOURCE_INFO]?.icon || ''}
                    -{Math.floor(v as number)}
                  </span>
                ))}
            </div>
          )}

          {offlineEarnings.warnings && offlineEarnings.warnings.length > 0 && (
            <div className="offline-warnings-block">
              <button
                className="btn btn-small btn-warn"
                onClick={() => setShowOfflineDetail(!showOfflineDetail)}
              >
                {showOfflineDetail ? '收起' : '展开'} {offlineEarnings.warnings.length} 条提示
              </button>
              {showOfflineDetail && (
                <ul className="offline-warnings-list">
                  {offlineEarnings.warnings.map((w, i) => (
                    <li key={i} className="warning-item">ℹ️ {w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {offlineEarnings.perBuildingDetail && offlineEarnings.perBuildingDetail.length > 0 && (
            <div className="offline-detail-section">
              <button
                className="btn btn-small btn-secondary"
                onClick={() => setShowOfflineDetail(!showOfflineDetail)}
              >
                {showOfflineDetail ? '收起明细' : '查看建筑明细'}
              </button>
              {showOfflineDetail && (
                <div className="offline-building-detail">
                  {offlineEarnings.perBuildingDetail.map((d) => (
                    <div key={d.buildingId} className={`detail-row ${d.capped ? 'capped' : ''}`}>
                      <span className="detail-name">
                        {BUILDING_ICONS[d.buildingType] || '🏠'} {d.buildingName} Lv.{d.level}
                        {d.capped && <span className="cap-tag" title="已达存储上限">📦</span>}
                      </span>
                      <span className="detail-gain">
                        {Object.entries(d.finalGain).length === 0 ? (
                          <span className="no-gain">—</span>
                        ) : (
                          Object.entries(d.finalGain).map(([k, v]) => (
                            <span key={k} className="detail-gain-item">
                              {RESOURCE_INFO[k as keyof typeof RESOURCE_INFO]?.icon || ''}
                              +{Math.floor(v as number)}
                            </span>
                          ))
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={collectOfflineEarnings}
          >
            领取收益
          </button>
        </div>
      )}

      <div className="section">
        <h4 className="section-title">📊 资源总览</h4>
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
          🏛️ 各建筑仓储 ({eligibleBuildings.length})
        </h4>
        {eligibleBuildings.length === 0 ? (
          <div className="empty-state">暂无仓储建筑</div>
        ) : (
          <div className="building-storage-list">
            {eligibleBuildings.map((info) => (
              <div key={info.buildingId} className="building-storage-item">
                <div className="building-storage-header">
                  <span className="building-storage-name">
                    {BUILDING_ICONS[info.buildingType] || '🏠'} {getBuildingDisplayName(info)}
                  </span>
                </div>
                <div className="building-storage-resources">
                  {(Object.keys(RESOURCE_INFO) as ResourceType[]).map((res) => {
                    const cap = info.capacity[res] || 0;
                    if (cap <= 0) return null;
                    const stored = info.storage[res] || 0;
                    const percent = getBuildingStorageUsagePercent(info.buildingId, res);
                    return (
                      <div key={res} className="mini-capacity-item">
                        <span className="mini-capacity-icon">
                          {RESOURCE_INFO[res].icon}
                        </span>
                        <span className="mini-capacity-value">
                          {Math.floor(stored)}/{cap}
                        </span>
                        <div className="mini-capacity-bar">
                          <div
                            className="mini-capacity-fill"
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
            ))}
          </div>
        )}
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
                <label>来源建筑：</label>
                <select
                  value={fromBuildingId}
                  onChange={(e) => setFromBuildingId(e.target.value)}
                >
                  {eligibleBuildings.map((info) => (
                    <option key={info.buildingId} value={info.buildingId}>
                      {getBuildingDisplayName(info)}
                      ({RESOURCE_INFO[selectedResource].icon}
                      {Math.floor(info.storage[selectedResource] || 0)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>目标建筑：</label>
                <select
                  value={toBuildingId}
                  onChange={(e) => setToBuildingId(e.target.value)}
                >
                  {eligibleBuildings
                    .filter((info) => info.buildingId !== fromBuildingId)
                    .map((info) => {
                      const cap = info.capacity[selectedResource] || 0;
                      const stored = info.storage[selectedResource] || 0;
                      const available = cap - stored;
                      return (
                        <option key={info.buildingId} value={info.buildingId}>
                          {getBuildingDisplayName(info)}
                          (可存: {Math.floor(available)})
                        </option>
                      );
                    })}
                </select>
              </div>
              <div className="form-row">
                <label>数量：</label>
                <input
                  type="number"
                  value={transportAmount}
                  onChange={(e) => setTransportAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  min={1}
                  max={Math.floor(Math.min(fromAvailable, toCanAccept))}
                />
              </div>
              <div className="transport-hint">
                {fromBuilding && (
                  <span>
                    来源可用：{RESOURCE_INFO[selectedResource].icon}{Math.floor(fromAvailable)}
                  </span>
                )}
                {toBuilding && (
                  <span>
                    目标可存：{RESOURCE_INFO[selectedResource].icon}{Math.floor(toCanAccept)}
                  </span>
                )}
              </div>
              <button
                className="btn btn-primary"
                onClick={handleStartTransport}
                disabled={
                  transportTasks.length >= MAX_TRANSPORT_TASKS ||
                  transportAmount <= 0 ||
                  fromAvailable < transportAmount ||
                  toCanAccept < transportAmount ||
                  !fromBuildingId ||
                  !toBuildingId ||
                  fromBuildingId === toBuildingId
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
                  const fromInfo = eligibleBuildings.find((b) => b.buildingId === task.fromBuildingId);
                  const toInfo = eligibleBuildings.find((b) => b.buildingId === task.toBuildingId);
                  return (
                    <div key={task.id} className="transport-item">
                      <div className="transport-header">
                        <span className="transport-resource">
                          {RESOURCE_INFO[task.resource].icon} {task.amount}
                        </span>
                        <span className="transport-status">
                          {fromInfo?.buildingName} → {toInfo?.buildingName}
                        </span>
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

const BUILDING_ICONS: Record<string, string> = {
  townhall: '🏛️',
  lumbermill: '🪓',
  quarry: '⛏️',
  farm: '🌾',
  barracks: '⚔️',
  market: '💰',
  smithy: '🔨',
  wall: '🧱',
  hut: '🛖',
  warehouse: '🏚️',
  caravanserai: '🐪',
};
