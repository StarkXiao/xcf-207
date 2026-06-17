import { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import {
  FACTIONS,
  STANCE_INFO,
  calculateTotalReputation,
  countAllyFactions,
  countEnemyFactions,
} from '../data/factions';
import { getInvasionDiplomacyInfo } from '../data/enemies';
import { getTradeDiplomacyInfo } from '../data/trades';
import type { FactionType, DiplomaticAction } from '../types';
import { RESOURCE_INFO } from '../data/trades';

export function DiplomacyPanel() {
  const [selectedFaction, setSelectedFaction] = useState<FactionType | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      forceUpdate((n) => n + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const factions = useGameStore((s) => s.factions);
  const activeDiplomaticEvents = useGameStore((s) => s.activeDiplomaticEvents);
  const allyReinforcements = useGameStore((s) => s.allyReinforcements);
  const resources = useGameStore((s) => s.resources);
  const executeDiplomaticAction = useGameStore((s) => s.executeDiplomaticAction);
  const getAvailableDiplomaticActions = useGameStore((s) => s.getAvailableDiplomaticActions);
  const resolveDiplomaticEvent = useGameStore((s) => s.resolveDiplomaticEvent);

  const totalRep = calculateTotalReputation(factions);
  const allyCount = countAllyFactions(factions);
  const enemyCount = countEnemyFactions(factions);
  const invasionInfo = getInvasionDiplomacyInfo(factions);
  const tradeInfo = getTradeDiplomacyInfo(factions);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAction = (actionId: string) => {
    const result = executeDiplomaticAction(actionId);
    showNotification(result.message);
    forceUpdate((n) => n + 1);
  };

  const handleEventChoice = (eventId: string, choiceId: string) => {
    resolveDiplomaticEvent(eventId, choiceId);
    forceUpdate((n) => n + 1);
  };

  const getActionCooldown = (action: DiplomaticAction) => {
    const faction = factions[action.factionId];
    if (!faction) return { onCooldown: false, remaining: 0 };
    const elapsed = (Date.now() - faction.lastInteraction) / 1000;
    const remaining = Math.max(0, action.cooldown - elapsed);
    return { onCooldown: remaining > 0, remaining: Math.ceil(remaining) };
  };

  return (
    <div className="panel diplomacy-panel">
      <h3 className="panel-title">🏛️ 外交声望</h3>

      {notification && (
        <div className="diplomacy-notification">
          {notification}
        </div>
      )}

      <div className="diplomacy-overview">
        <div className="overview-item">
          <span className="overview-label">总声望</span>
          <span className={`overview-value ${totalRep >= 0 ? 'positive' : 'negative'}`}>
            {totalRep >= 0 ? '+' : ''}{totalRep}
          </span>
        </div>
        <div className="overview-item">
          <span className="overview-label">同盟</span>
          <span className="overview-value ally">{allyCount}</span>
        </div>
        <div className="overview-item">
          <span className="overview-label">敌对</span>
          <span className="overview-value enemy">{enemyCount}</span>
        </div>
      </div>

      <div className="diplomacy-effects">
        <div className="effect-item">
          <span>📦 贸易加成：</span>
          <span className={tradeInfo.bonusPercent >= 0 ? 'positive' : 'negative'}>
            {tradeInfo.bonusPercent >= 0 ? '+' : ''}{tradeInfo.bonusPercent}%
          </span>
          <span className="effect-hint">（友好/同盟部落数：{tradeInfo.friendlyTraders}）</span>
        </div>
        <div className="effect-item">
          <span>⚔️ 入侵威胁：</span>
          <span className="negative">{invasionInfo.invasionChance}%</span>
          {invasionInfo.mostHostile && (
            <span className="effect-hint">（最大威胁：{invasionInfo.mostHostile}）</span>
          )}
        </div>
        <div className="effect-item">
          <span>💪 敌军强度：</span>
          <span className={invasionInfo.strengthMod >= 0 ? 'negative' : 'positive'}>
            {invasionInfo.strengthMod >= 0 ? '+' : ''}{invasionInfo.strengthMod}%
          </span>
        </div>
      </div>

      {allyReinforcements.length > 0 && (
        <div className="reinforcements-section">
          <h4>🤝 同盟援军</h4>
          <div className="reinforcements-list">
            {allyReinforcements.map((r) => (
              <div key={r.id} className="reinforcement-card">
                <div className="reinforcement-header">
                  <span className="reinforcement-icon">{r.factionIcon}</span>
                  <span className="reinforcement-name">{r.factionName}</span>
                  <span className="reinforcement-duration">剩余：{Math.ceil(r.duration)}s</span>
                </div>
                <div className="reinforcement-troops">
                  {r.warriors.map((w, i) => (
                    <span key={i} className="troop-item">
                      {w.type} x{w.count}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeDiplomaticEvents.length > 0 && (
        <div className="diplomatic-events-section">
          <h4>📜 外交事件</h4>
          <div className="diplomatic-events-list">
            {activeDiplomaticEvents.map((event) => (
              <div key={event.id} className="diplomatic-event-card">
                <div className="event-header">
                  <span className="event-icon">{event.icon}</span>
                  <span className="event-name">{event.name}</span>
                </div>
                <div className="event-description">{event.description}</div>
                <div className="event-choices">
                  {event.choices.map((choice) => (
                    <button
                      key={choice.id}
                      className="btn event-choice-btn"
                      onClick={() => handleEventChoice(event.id, choice.id)}
                    >
                      {choice.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="factions-section">
        <h4>🌍 部落势力</h4>
        <div className="factions-list">
          {(Object.keys(factions) as FactionType[]).map((fid) => {
            const faction = factions[fid];
            const config = FACTIONS[fid];
            const stanceInfo = STANCE_INFO[faction.stance];
            const isSelected = selectedFaction === fid;
            const actions = getAvailableDiplomaticActions(fid);

            return (
              <div key={fid} className={`faction-card ${isSelected ? 'selected' : ''}`}>
                <div
                  className="faction-header"
                  onClick={() => setSelectedFaction(isSelected ? null : fid)}
                >
                  <span className="faction-icon" style={{ color: config.color }}>
                    {config.icon}
                  </span>
                  <div className="faction-info">
                    <div className="faction-name">{config.name}</div>
                    <div className="faction-speciality">
                      专长：{config.speciality === 'warriors' ? '军事' : config.speciality === 'knowledge' ? '知识' : RESOURCE_INFO[config.speciality]?.name || config.speciality}
                    </div>
                  </div>
                  <div className="faction-stance" style={{ color: stanceInfo.color }}>
                    {stanceInfo.name}
                  </div>
                  <div className="faction-reputation">
                    <div className="rep-bar">
                      <div
                        className={`rep-fill ${faction.reputation >= 0 ? 'positive' : 'negative'}`}
                        style={{ width: `${Math.abs(faction.reputation)}%` }}
                      />
                    </div>
                    <span className={`rep-value ${faction.reputation >= 0 ? 'positive' : 'negative'}`}>
                      {faction.reputation >= 0 ? '+' : ''}{faction.reputation}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="faction-detail">
                    <div className="faction-description">{config.description}</div>
                    <div className="stance-hint" style={{ color: stanceInfo.color }}>
                      {stanceInfo.description}
                    </div>
                    <div className="diplomatic-actions">
                      {actions.map((action) => {
                        const canAfford = Object.entries(action.cost).every(
                          ([key, amount]) => resources[key as keyof typeof resources] >= (amount as number)
                        );
                        const cooldown = getActionCooldown(action);
                        const isDisabled = !canAfford || cooldown.onCooldown;
                        return (
                          <button
                            key={action.id}
                            className={`btn diplomatic-action-btn ${isDisabled ? 'disabled' : ''}`}
                            onClick={() => handleAction(action.id)}
                            disabled={isDisabled}
                          >
                            <span className="action-icon">{action.icon}</span>
                            <span className="action-name">
                              {action.name}
                              {cooldown.onCooldown && (
                                <span className="cooldown-badge">冷却中 {cooldown.remaining}s</span>
                              )}
                            </span>
                            <span className="action-cost">
                              {Object.entries(action.cost).length > 0 ? (
                                Object.entries(action.cost).map(([k, v]) => (
                                  <span key={k} className="cost-item">
                                    {RESOURCE_INFO[k as keyof typeof RESOURCE_INFO]?.icon}{v}
                                  </span>
                                ))
                              ) : (
                                <span className="cost-free">免费</span>
                              )}
                            </span>
                            <span className="action-success">
                              成功率：{Math.round(action.successRate * 100)}%
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
