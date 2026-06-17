import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { WARRIORS } from '../data/warriors';
import { ENEMIES } from '../data/enemies';
import { RESOURCE_INFO } from '../data/trades';
import {
  EXPEDITION_MAPS,
  DIFFICULTY_COLORS,
  DIFFICULTY_NAMES,
  NODE_MARCH_TIME,
} from '../data/expedition';
import type { MapEventChoice } from '../types';

const CHOICE_LABELS: Record<MapEventChoice, { label: string; icon: string }> = {
  fight: { label: '战斗', icon: '⚔️' },
  flee: { label: '撤退', icon: '🏃' },
  negotiate: { label: '谈判', icon: '🤝' },
  explore: { label: '探索', icon: '🔍' },
  pray: { label: '祈祷', icon: '🙏' },
  rest: { label: '休息', icon: '💤' },
};

export function ExpeditionPanel() {
  const activeExpedition = useGameStore((s) => s.activeExpedition);
  const warriors = useGameStore((s) => s.warriors);
  const expeditionNotifications = useGameStore((s) => s.expeditionNotifications);
  const totalExpeditions = useGameStore((s) => s.totalExpeditions);
  const expeditionWins = useGameStore((s) => s.expeditionWins);
  const startExpedition = useGameStore((s) => s.startExpedition);
  const resolveExpeditionEvent = useGameStore((s) => s.resolveExpeditionEvent);
  const settleExpedition = useGameStore((s) => s.settleExpedition);
  const cancelExpedition = useGameStore((s) => s.cancelExpedition);
  const dismissExpeditionNotification = useGameStore((s) => s.dismissExpeditionNotification);

  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedWarriorIds, setSelectedWarriorIds] = useState<string[]>([]);
  const [showLogIndex, setShowLogIndex] = useState<number | null>(null);

  const selectedMap = EXPEDITION_MAPS.find((m) => m.id === selectedMapId);

  const toggleWarrior = (id: string) => {
    setSelectedWarriorIds((prev) =>
      prev.includes(id) ? prev.filter((wId) => wId !== id) : [...prev, id]
    );
  };

  const handleStartExpedition = () => {
    if (!selectedMapId || selectedWarriorIds.length === 0) return;
    const success = startExpedition(selectedMapId, selectedWarriorIds);
    if (success) {
      setSelectedMapId(null);
      setSelectedWarriorIds([]);
    }
  };

  if (activeExpedition) {
    return (
      <div className="panel expedition-panel">
        <h3 className="panel-title">
          {activeExpedition.mapIcon} {activeExpedition.mapName} — 远征中
        </h3>

        <ExpeditionStatusBar expedition={activeExpedition} />

        {activeExpedition.status === 'marching' && (
          <MarchingView expedition={activeExpedition} />
        )}

        {activeExpedition.status === 'event' && activeExpedition.pendingEvent && (
          <EventView
            node={activeExpedition.pendingEvent}
            warriors={activeExpedition.warriors}
            onChoice={resolveExpeditionEvent}
          />
        )}

        {activeExpedition.status === 'returning' && (
          <ReturningView expedition={activeExpedition} />
        )}

        {activeExpedition.status === 'completed' && (
          <CompletedView
            expedition={activeExpedition}
            onSettle={settleExpedition}
            showLogIndex={showLogIndex}
            onToggleLog={setShowLogIndex}
          />
        )}

        {activeExpedition.results.length > 0 && activeExpedition.status !== 'completed' && (
          <ResultsList
            results={activeExpedition.results}
            showLogIndex={showLogIndex}
            onToggleLog={setShowLogIndex}
          />
        )}

        {(activeExpedition.status === 'marching' || activeExpedition.status === 'event') && (
          <button
            className="btn btn-danger-outline btn-small"
            style={{ marginTop: '12px' }}
            onClick={cancelExpedition}
          >
            ⚠️ 放弃远征
          </button>
        )}

        <NotificationStack
          notifications={expeditionNotifications}
          onDismiss={dismissExpeditionNotification}
        />
      </div>
    );
  }

  return (
    <div className="panel expedition-panel">
      <h3 className="panel-title">🗡️ 英雄远征</h3>

      <div className="battle-stats">
        <div className="stat-item">
          <span className="stat-label">远征次数</span>
          <span className="stat-value">{totalExpeditions}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">凯旋次数</span>
          <span className="stat-value win">{expeditionWins}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">可用战士</span>
          <span className="stat-value">{warriors.length}</span>
        </div>
      </div>

      {!selectedMapId ? (
        <div className="expedition-map-list">
          <div className="queue-title">选择远征地图</div>
          {EXPEDITION_MAPS.map((map) => (
            <div
              key={map.id}
              className={`expedition-map-card ${warriors.length < map.requiredWarriors ? 'disabled' : ''}`}
              onClick={() => warriors.length >= map.requiredWarriors && setSelectedMapId(map.id)}
            >
              <div className="map-header">
                <span className="map-icon">{map.icon}</span>
                <div className="map-info">
                  <div className="map-name">{map.name}</div>
                  <div className="map-desc">{map.description}</div>
                </div>
                <span
                  className="map-difficulty"
                  style={{ color: DIFFICULTY_COLORS[map.difficulty] }}
                >
                  {DIFFICULTY_NAMES[map.difficulty]}
                </span>
              </div>
              <div className="map-meta">
                <span>👥 最低{map.requiredWarriors}人</span>
                <span>📍 {map.nodes.length}个节点</span>
                {map.bonusLoot && (
                  <span className="bonus-loot">
                    通关奖励：
                    {Object.entries(map.bonusLoot).map(([k, v]) => (
                      <span key={k}>
                        {RESOURCE_INFO[k as keyof typeof RESOURCE_INFO].icon}
                        {v}
                      </span>
                    ))}
                  </span>
                )}
              </div>
              {warriors.length < map.requiredWarriors && (
                <div className="requirement">需要至少{map.requiredWarriors}名战士</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="expedition-forming">
          <div className="forming-header">
            <button className="btn btn-secondary btn-small" onClick={() => { setSelectedMapId(null); setSelectedWarriorIds([]); }}>
              ← 返回
            </button>
            <span className="forming-title">
              {selectedMap?.icon} {selectedMap?.name} — 编队
            </span>
          </div>

          <div className="forming-info">
            <span>已选：{selectedWarriorIds.length} / {warriors.length} 人</span>
            {selectedMap && (
              <span style={{ color: selectedWarriorIds.length >= selectedMap.requiredWarriors ? '#81c784' : '#e57373' }}>
                （最低需要 {selectedMap.requiredWarriors} 人）
              </span>
            )}
          </div>

          <div className="warrior-select-grid">
            {warriors.map((w) => {
              const selected = selectedWarriorIds.includes(w.id);
              const config = WARRIORS[w.type];
              return (
                <div
                  key={w.id}
                  className={`warrior-select-card ${selected ? 'selected' : ''}`}
                  onClick={() => toggleWarrior(w.id)}
                >
                  <span className="wsc-icon">{config.icon}</span>
                  <span className="wsc-name">{config.name}</span>
                  <span className="wsc-hp">❤️{Math.floor(w.hp)}/{w.maxHp}</span>
                  <span className="wsc-stats">⚔️{w.attack} 🛡️{w.defense}</span>
                  {selected && <span className="wsc-check">✓</span>}
                </div>
              );
            })}
          </div>

          <button
            className="btn btn-danger btn-large"
            style={{ marginTop: '12px' }}
            disabled={!selectedMap || selectedWarriorIds.length < selectedMap.requiredWarriors}
            onClick={handleStartExpedition}
          >
            ⚔️ 出征！
          </button>
        </div>
      )}

      <NotificationStack
        notifications={expeditionNotifications}
        onDismiss={dismissExpeditionNotification}
      />
    </div>
  );
}

function ExpeditionStatusBar({ expedition }: { expedition: typeof useGameStore extends (s: infer S) => any ? NonNullable<S['activeExpedition']> : never }) {
  const statusMap: Record<string, { label: string; color: string }> = {
    marching: { label: '行军中', color: '#64b5f6' },
    event: { label: '遭遇事件', color: '#ff9800' },
    returning: { label: '回营中', color: '#ce93d8' },
    completed: { label: '已归来', color: '#81c784' },
  };

  const status = statusMap[expedition.status] || { label: expedition.status, color: '#999' };
  const aliveCount = expedition.warriors.filter((w) => w.hp > 0).length;

  return (
    <div className="expedition-status-bar">
      <div className="esb-status" style={{ color: status.color }}>
        {status.label}
      </div>
      <div className="esb-details">
        <span>👥 存活 {aliveCount}/{expedition.warriors.length + expedition.totalCasualties}</span>
        {expedition.totalCasualties > 0 && (
          <span className="esb-casualties">☠️ 伤亡 {expedition.totalCasualties}</span>
        )}
      </div>
    </div>
  );
}

function MarchingView({ expedition }: { expedition: any }) {
  const currentNode = expedition.nodes[expedition.currentNodeIndex];
  const marchTime = currentNode ? NODE_MARCH_TIME[currentNode.difficulty] || 10 : 10;
  const progressPercent = Math.min(100, (expedition.currentNodeProgress / marchTime) * 100);

  return (
    <div className="marching-view">
      <div className="march-route">
        {expedition.nodes.map((node: any, i: number) => (
          <div
            key={node.id}
            className={`route-node ${
              i < expedition.currentNodeIndex
                ? 'passed'
                : i === expedition.currentNodeIndex
                  ? 'current'
                  : 'upcoming'
            }`}
          >
            <span className="rn-icon">{node.icon}</span>
            <span className="rn-name">{node.name}</span>
          </div>
        ))}
      </div>

      {currentNode && (
        <div className="march-progress">
          <div className="march-label">
            正在前往：{currentNode.icon} {currentNode.name}
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="march-time">
            {Math.max(0, Math.ceil(marchTime - expedition.currentNodeProgress))}s
          </div>
        </div>
      )}

      <SquadPreview warriors={expedition.warriors} />
    </div>
  );
}

function EventView({ node, warriors, onChoice }: { node: any; warriors: any[]; onChoice: (choice: MapEventChoice) => void }) {
  const diffColor = DIFFICULTY_COLORS[node.difficulty] || '#999';

  return (
    <div className="event-view">
      <div className="event-encounter" style={{ borderColor: diffColor }}>
        <div className="ee-header">
          <span className="ee-icon">{node.icon}</span>
          <div className="ee-info">
            <div className="ee-name">{node.name}</div>
            <div className="ee-desc">{node.description}</div>
            <span className="ee-difficulty" style={{ color: diffColor }}>
              {DIFFICULTY_NAMES[node.difficulty]}
            </span>
          </div>
        </div>

        {node.enemyType && (
          <div className="ee-enemy">
            <span>敌人：{ENEMIES[node.enemyType]?.icon} {ENEMIES[node.enemyType]?.name} x{node.enemyCount || 1}</span>
          </div>
        )}

        <SquadPreview warriors={warriors} />

        <div className="ee-choices">
          <div className="queue-title">选择行动</div>
          {node.choices?.map((choice: MapEventChoice) => {
            const c = CHOICE_LABELS[choice];
            return (
              <button
                key={choice}
                className={`btn choice-btn choice-${choice}`}
                onClick={() => onChoice(choice)}
              >
                {c.icon} {c.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReturningView({ expedition }: { expedition: any }) {
  const returnProgress = Math.min(100, (expedition.returningProgress / 15) * 100);
  const isWiped = expedition.warriors.every((w: any) => w.hp <= 0);

  return (
    <div className="returning-view">
      <div className="return-banner">
        <span className="return-icon">{isWiped ? '💀' : '🏕️'}</span>
        <span className="return-text">
          {isWiped ? '远征队全军覆没...' : '远征队正在返回营地'}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${returnProgress}%`, background: 'linear-gradient(90deg, #ce93d8, #ba68c8)' }}
        />
      </div>
      <div className="return-time">
        {Math.max(0, Math.ceil(15 - expedition.returningProgress))}s 后到达
      </div>

      {expedition.totalLoot && Object.keys(expedition.totalLoot).length > 0 && (
        <div className="return-loot-preview">
          <div className="queue-title">已获得战利品</div>
          <div className="loot-items">
            {Object.entries(expedition.totalLoot).map(([key, amount]) => (
              <span key={key} className="loot-item">
                {RESOURCE_INFO[key as keyof typeof RESOURCE_INFO]?.icon} +{amount as number}
              </span>
            ))}
          </div>
        </div>
      )}

      <SquadPreview warriors={expedition.warriors} />
    </div>
  );
}

function CompletedView({ expedition, onSettle, showLogIndex, onToggleLog }: { expedition: any; onSettle: () => void; showLogIndex: number | null; onToggleLog: (i: number | null) => void }) {
  const survivedCount = expedition.warriors.filter((w: any) => w.hp > 0).length;
  const totalCount = expedition.warriors.length + expedition.totalCasualties;
  const isVictory = survivedCount > 0 && expedition.results.some((r: any) => r.victory);

  return (
    <div className="completed-view">
      <div className={`settle-banner ${isVictory ? 'victory' : 'defeat'}`}>
        <div className="settle-icon">{isVictory ? '🏆' : '💔'}</div>
        <div className="settle-title">
          {isVictory ? '远征凯旋！' : '远征失败...'}
        </div>
        <div className="settle-stats">
          <span>👥 生还 {survivedCount}/{totalCount}</span>
          {expedition.totalCasualties > 0 && (
            <span className="esb-casualties">☠️ 伤亡 {expedition.totalCasualties}</span>
          )}
        </div>
      </div>

      {Object.keys(expedition.totalLoot).length > 0 && (
        <div className="settle-loot">
          <div className="queue-title">战利品</div>
          <div className="loot-items">
            {Object.entries(expedition.totalLoot).map(([key, amount]) => (
              <span key={key} className="loot-item">
                {RESOURCE_INFO[key as keyof typeof RESOURCE_INFO]?.icon} +{amount as number}
              </span>
            ))}
          </div>
        </div>
      )}

      {expedition.totalExp > 0 && (
        <div className="settle-exp">
          <span className="queue-title">经验获得</span>
          <span className="exp-value">✨ {expedition.totalExp}</span>
        </div>
      )}

      <ResultsList results={expedition.results} showLogIndex={showLogIndex} onToggleLog={onToggleLog} />

      <SquadPreview warriors={expedition.warriors} showDamage />

      <button className="btn btn-primary btn-large" style={{ marginTop: '12px' }} onClick={onSettle}>
        🏠 收兵回营
      </button>
    </div>
  );
}

function ResultsList({ results, showLogIndex, onToggleLog }: { results: any[]; showLogIndex: number | null; onToggleLog: (i: number | null) => void }) {
  return (
    <div className="results-list">
      <div className="queue-title">战报记录</div>
      {results.map((result, i) => (
        <div key={i} className={`result-card ${result.victory ? 'victory' : 'defeat'}`}>
          <div className="result-summary" onClick={() => onToggleLog(showLogIndex === i ? null : i)}>
            <span>{result.victory ? '🏆' : '💀'} {result.nodeName}</span>
            <span className="result-type-tag">{result.type}</span>
            {result.casualties > 0 && <span className="esb-casualties">伤亡{result.casualties}</span>}
            <span className="result-toggle">{showLogIndex === i ? '▲' : '▼'}</span>
          </div>
          {showLogIndex === i && (
            <div className="battle-log">
              {result.log.map((line: string, li: number) => (
                <div key={li} className="log-line">{line}</div>
              ))}
              {Object.keys(result.loot).length > 0 && (
                <div className="result-loot">
                  战利品：
                  {Object.entries(result.loot).map(([k, v]) => (
                    <span key={k} className="loot-item">
                      {RESOURCE_INFO[k as keyof typeof RESOURCE_INFO]?.icon} +{v as number}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SquadPreview({ warriors, showDamage }: { warriors: any[]; showDamage?: boolean }) {
  return (
    <div className="squad-preview">
      <div className="queue-title">远征队</div>
      <div className="squad-grid">
        {warriors.map((w: any) => {
          const config = WARRIORS[w.type];
          const hpPercent = (w.hp / w.maxHp) * 100;
          const isDead = w.hp <= 0;
          const hpColor = hpPercent > 60 ? '#4caf50' : hpPercent > 30 ? '#ff9800' : '#e53935';
          return (
            <div key={w.id} className={`squad-unit ${isDead ? 'dead' : ''}`}>
              <span className="su-icon">{config.icon}</span>
              <div className="su-info">
                <span className="su-name">{config.name}</span>
                {!isDead && (
                  <div className="hp-bar-mini">
                    <div className="hp-fill" style={{ width: `${hpPercent}%`, background: hpColor }} />
                  </div>
                )}
                {isDead && <span className="su-dead">☠️</span>}
                {showDamage && !isDead && w.originalHp && w.hp < w.originalHp && (
                  <span className="su-damage">-{Math.floor(w.originalHp - w.hp)}HP</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NotificationStack({ notifications, onDismiss }: { notifications: any[]; onDismiss: (id: string) => void }) {
  if (notifications.length === 0) return null;

  return (
    <div className="notification-stack">
      {notifications.map((n) => (
        <div key={n.id} className={`notification notif-${n.type}`} onClick={() => onDismiss(n.id)}>
          <span className="notif-icon">{n.icon}</span>
          <span className="notif-msg">{n.message}</span>
          <span className="notif-close">✕</span>
        </div>
      ))}
    </div>
  );
}
