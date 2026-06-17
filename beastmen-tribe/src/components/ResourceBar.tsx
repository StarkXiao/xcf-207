import { useGameStore } from '../store/useGameStore';
import { RESOURCE_INFO } from '../data/trades';
import type { ResourceType } from '../types';

export function ResourceBar() {
  const resources = useGameStore((s) => s.resources);
  const tribeName = useGameStore((s) => s.tribeName);
  const day = useGameStore((s) => s.day);

  return (
    <div className="resource-bar">
      <div className="tribe-info">
        <span className="tribe-name">🏕️ {tribeName}</span>
        <span className="day-counter">第 {Math.floor(day)} 天</span>
      </div>
      <div className="resources">
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
