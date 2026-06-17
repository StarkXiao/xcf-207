import { useGameStore } from '../store/useGameStore';
import { RESOURCE_INFO } from '../data/trades';
import type { ResourceType } from '../types';

export function ResourceBar() {
  const resources = useGameStore((s) => s.resources);
  const tribeName = useGameStore((s) => s.tribeName);
  const day = useGameStore((s) => s.day);
  const population = useGameStore((s) => s.population);
  const maxPopulation = useGameStore((s) => s.maxPopulation);
  const loyalty = useGameStore((s) => s.loyalty);
  const activeEvents = useGameStore((s) => s.activeEvents);

  const loyaltyColor =
    loyalty >= 80 ? '#4caf50' : loyalty >= 60 ? '#8bc34a' : loyalty >= 40 ? '#ff9800' : loyalty >= 20 ? '#ff5722' : '#e53935';

  return (
    <div className="resource-bar">
      <div className="tribe-info">
        <span className="tribe-name">🏕️ {tribeName}</span>
        <span className="day-counter">第 {Math.floor(day)} 天</span>
      </div>
      <div className="resources">
        <div className="resource-item population-item">
          <span className="resource-icon">👥</span>
          <span className="resource-value">{population}/{maxPopulation}</span>
        </div>
        <div className="resource-item loyalty-item">
          <span className="resource-icon">❤️</span>
          <span className="resource-value" style={{ color: loyaltyColor }}>
            {Math.floor(loyalty)}%
          </span>
        </div>
        {activeEvents.length > 0 && (
          <div className="resource-item event-indicator">
            <span className="resource-icon">📜</span>
            <span className="resource-value">{activeEvents.length}</span>
          </div>
        )}
        {(Object.keys(RESOURCE_INFO) as ResourceType[]).map((key) => (
          <div key={key} className="resource-item" title={RESOURCE_INFO[key].name}>
            <span className="resource-icon">{RESOURCE_INFO[key].icon}</span>
            <span className="resource-value">
              {Math.floor(resources[key]).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
