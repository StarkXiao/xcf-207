import { useGameStore } from '../store/useGameStore';
import { RESOURCE_INFO } from '../data/trades';
import { WARRIORS } from '../data/warriors';
import type { EventEffect, ResourceType } from '../types';

const getLoyaltyLevel = (loyalty: number) => {
  if (loyalty >= 80) return { label: '忠诚', color: '#4caf50', icon: '💚' };
  if (loyalty >= 60) return { label: '稳定', color: '#8bc34a', icon: '💛' };
  if (loyalty >= 40) return { label: '动摇', color: '#ff9800', icon: '🧡' };
  if (loyalty >= 20) return { label: '不满', color: '#ff5722', icon: '❤️' };
  return { label: '叛离', color: '#e53935', icon: '💔' };
};

const getGrowthStatus = (population: number, maxPopulation: number, loyalty: number, availablePop: number) => {
  if (population >= maxPopulation) return { label: '已达上限', color: '#ff9800' };
  if (availablePop <= 0) return { label: '军队占用', color: '#f44336' };
  if (loyalty > 50) return { label: '增长中', color: '#4caf50' };
  if (loyalty > 20) return { label: '停滞', color: '#ff9800' };
  return { label: '流失中', color: '#e53935' };
};

const formatEffect = (effect: EventEffect): string => {
  switch (effect.type) {
    case 'population_change':
      return `人口 ${effect.value > 0 ? '+' : ''}${effect.value}`;
    case 'loyalty_change':
      return `忠诚 ${effect.value > 0 ? '+' : ''}${effect.value}`;
    case 'food_change':
      return `食物 ${effect.value > 0 ? '+' : ''}${effect.value}`;
    case 'resource_change':
      return `${effect.resource ? RESOURCE_INFO[effect.resource as ResourceType].icon : ''} ${effect.value > 0 ? '+' : ''}${effect.value}`;
    case 'recruit_boost':
      return `征兵效率 +${Math.floor(effect.value * 100)}%`;
    case 'plague':
      return `瘟疫 -${effect.value} 人口`;
    case 'festival':
      return `庆典 +${effect.value} 忠诚`;
    case 'migration':
      return `移民 +${effect.value} 人口`;
  }
};

export function PopulationPanel() {
  const population = useGameStore((s) => s.population);
  const maxPopulation = useGameStore((s) => s.maxPopulation);
  const loyalty = useGameStore((s) => s.loyalty);
  const foodConsumptionRate = useGameStore((s) => s.foodConsumptionRate);
  const recruitEfficiency = useGameStore((s) => s.recruitEfficiency);
  const activeEvents = useGameStore((s) => s.activeEvents);
  const resources = useGameStore((s) => s.resources);
  const buildings = useGameStore((s) => s.buildings);
  const dismissEvent = useGameStore((s) => s.dismissEvent);
  const warriors = useGameStore((s) => s.warriors);
  const getMilitaryPopulation = useGameStore((s) => s.getMilitaryPopulation);
  const getTrainingPopulation = useGameStore((s) => s.getTrainingPopulation);
  const getAvailablePopulation = useGameStore((s) => s.getAvailablePopulation);
  const getArmyFoodConsumption = useGameStore((s) => s.getArmyFoodConsumption);

  const loyaltyLevel = getLoyaltyLevel(loyalty);
  const militaryPop = getMilitaryPopulation();
  const trainingPop = getTrainingPopulation();
  const availablePop = getAvailablePopulation();
  const civilianPop = Math.max(0, population - militaryPop - trainingPop);
  const growthStatus = getGrowthStatus(population, maxPopulation, loyalty, availablePop);
  const popPercent = maxPopulation > 0 ? (population / maxPopulation) * 100 : 0;

  const hutCount = buildings.filter((b) => b.type === 'hut' && !b.isBuilding).length;
  const hutLevels = buildings
    .filter((b) => b.type === 'hut' && !b.isBuilding)
    .reduce((sum, b) => sum + b.level, 0);

  const armyFoodMultiplier = getArmyFoodConsumption();
  const civilianFoodPerSecond = civilianPop * foodConsumptionRate;
  const militaryFoodPerSecond = armyFoodMultiplier * foodConsumptionRate;
  const totalFoodPerSecond = civilianFoodPerSecond + militaryFoodPerSecond;
  const foodProduction = buildings
    .filter((b) => !b.isBuilding && b.type === 'farm')
    .reduce((sum, b) => sum + 2 * b.level, 0);

  const foodNetRate = foodProduction - totalFoodPerSecond;

  const warriorBreakdown: Record<string, { count: number; pop: number; food: number }> = {};
  for (const w of warriors) {
    const config = WARRIORS[w.type];
    if (!config) continue;
    if (!warriorBreakdown[w.type]) {
      warriorBreakdown[w.type] = { count: 0, pop: 0, food: 0 };
    }
    warriorBreakdown[w.type].count++;
    warriorBreakdown[w.type].pop += config.populationCost;
    warriorBreakdown[w.type].food += config.foodConsumption;
  }

  return (
    <div className="panel population-panel">
      <h3 className="panel-title">👥 部落人口</h3>

      <div className="pop-overview">
        <div className="pop-main-stat">
          <span className="pop-number">{population}</span>
          <span className="pop-max"> / {maxPopulation}</span>
        </div>
        <div className="pop-bar-container">
          <div className="pop-bar">
            <div
              className="pop-bar-fill"
              style={{
                width: `${popPercent}%`,
                backgroundColor: popPercent > 80 ? '#ff9800' : popPercent > 50 ? '#4caf50' : '#66bb6a',
              }}
            />
          </div>
          <div className="pop-growth" style={{ color: growthStatus.color }}>
            {growthStatus.label}
          </div>
        </div>
      </div>

      <div className="pop-details">
        <div className="pop-detail-item">
          <span className="detail-label">🏠 容量来源</span>
          <span className="detail-value">基础10 + 小屋{hutCount}座(Lv合计{hutLevels})</span>
        </div>
        <div className="pop-detail-item">
          <span className="detail-label">👨‍👩‍👧 平民人口</span>
          <span className="detail-value" style={{ color: '#2196f3' }}>{civilianPop}人</span>
        </div>
        <div className="pop-detail-item">
          <span className="detail-label">⚔️ 军队人口</span>
          <span className="detail-value" style={{ color: '#ff9800' }}>
            {militaryPop}人
            {trainingPop > 0 && <span style={{ color: '#2196f3' }}> +训练{trainingPop}</span>}
          </span>
        </div>
        <div className="pop-detail-item">
          <span className="detail-label">✅ 空闲可用</span>
          <span className="detail-value" style={{ color: availablePop > 0 ? '#4caf50' : '#f44336' }}>{availablePop}人</span>
        </div>
        <div className="pop-detail-item">
          <span className="detail-label">🍖 平民食物消耗</span>
          <span className="detail-value">{civilianFoodPerSecond.toFixed(1)}/秒</span>
        </div>
        <div className="pop-detail-item">
          <span className="detail-label">⚔️ 军队食物消耗</span>
          <span className="detail-value" style={{ color: '#ff9800' }}>{militaryFoodPerSecond.toFixed(1)}/秒</span>
        </div>
        <div className="pop-detail-item">
          <span className="detail-label">🍖 总食物消耗</span>
          <span className="detail-value">{totalFoodPerSecond.toFixed(1)}/秒</span>
        </div>
        <div className="pop-detail-item">
          <span className="detail-label">🌿 食物产出</span>
          <span className="detail-value">{foodProduction.toFixed(1)}/秒</span>
        </div>
        <div className="pop-detail-item">
          <span className="detail-label">📊 食物净收支</span>
          <span
            className="detail-value"
            style={{ color: foodNetRate >= 0 ? '#4caf50' : '#e53935' }}
          >
            {foodNetRate >= 0 ? '+' : ''}{foodNetRate.toFixed(1)}/秒
          </span>
        </div>
        <div className="pop-detail-item">
          <span className="detail-label">📦 当前食物</span>
          <span
            className="detail-value"
            style={{ color: resources.food < population * 5 ? '#e53935' : '#4caf50' }}
          >
            {Math.floor(resources.food)}
          </span>
        </div>
      </div>

      {warriors.length > 0 && (
        <div className="army-breakdown">
          <div className="queue-title">⚔️ 军队构成</div>
          <div className="army-breakdown-list">
            {Object.entries(warriorBreakdown).map(([type, info]) => {
              const config = WARRIORS[type];
              return (
                <div key={type} className="breakdown-item">
                  <span>{config.icon} {config.name}</span>
                  <span className="breakdown-stats">
                    x{info.count} | 👥{info.pop}人 | 🍖{info.food.toFixed(1)}x
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="loyalty-section">
        <div className="loyalty-header">
          <span className="loyalty-title">{loyaltyLevel.icon} 忠诚度</span>
          <span className="loyalty-level" style={{ color: loyaltyLevel.color }}>
            {loyaltyLevel.label}
          </span>
        </div>
        <div className="loyalty-bar-container">
          <div className="loyalty-bar">
            <div
              className="loyalty-bar-fill"
              style={{
                width: `${loyalty}%`,
                backgroundColor: loyaltyLevel.color,
              }}
            />
          </div>
          <span className="loyalty-value">{Math.floor(loyalty)}%</span>
        </div>
        <div className="loyalty-effects">
          <div className="loyalty-effect-item">
            <span>征兵效率</span>
            <span className={`effect-value ${recruitEfficiency >= 1 ? 'positive' : 'negative'}`}>
              {Math.floor(recruitEfficiency * 100)}%
            </span>
          </div>
          <div className="loyalty-effect-item">
            <span>人口增长</span>
            <span className={`effect-value ${loyalty > 50 ? 'positive' : 'negative'}`}>
              {loyalty > 50 ? '✔' : '✘'}
            </span>
          </div>
          <div className="loyalty-effect-item">
            <span>人口流失</span>
            <span className={`effect-value ${loyalty < 20 ? 'negative' : 'positive'}`}>
              {loyalty < 20 ? '⚠ 危险' : '稳定'}
            </span>
          </div>
        </div>
      </div>

      {activeEvents.length > 0 && (
        <div className="events-section">
          <div className="queue-title">📜 当前事件</div>
          {activeEvents.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-header">
                <span className="event-icon">{event.icon}</span>
                <span className="event-name">{event.name}</span>
                <span className="event-timer">{Math.ceil(event.duration)}s</span>
              </div>
              <div className="event-desc">{event.description}</div>
              <div className="event-effects">
                {event.effects.map((effect, i) => (
                  <span
                    key={i}
                    className={`effect-tag ${effect.value > 0 || effect.type === 'festival' || effect.type === 'migration' || effect.type === 'recruit_boost' ? 'positive' : 'negative'}`}
                  >
                    {formatEffect(effect)}
                  </span>
                ))}
              </div>
              <button
                className="btn btn-secondary btn-small dismiss-btn"
                onClick={() => dismissEvent(event.id)}
              >
                知道了
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="pop-tips">
        <div className="tips-title">📖 人口与忠诚机制</div>
        <ul className="tips-list">
          <li>每位族人每秒消耗 {foodConsumptionRate} 食物，军队有额外食物倍率</li>
          <li>训练战士会占用人口，退役可释放人口并返还50%食物</li>
          <li>升级兵营可降低训练人口占用（最低70%）</li>
          <li>食物不足时忠诚度持续下降</li>
          <li>忠诚 &gt; 50 人口自然增长，忠诚 &lt; 20 人口流失</li>
          <li>忠诚度影响征兵效率和战斗士气</li>
          <li>建造/升级【兽人小屋】增加人口上限</li>
          <li>随机事件会影响人口、忠诚和资源</li>
        </ul>
      </div>
    </div>
  );
}
