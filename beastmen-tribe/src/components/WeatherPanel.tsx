import { useGameStore } from '../store/useGameStore';
import { SEASONS, WEATHERS } from '../data/weather';
import { RESOURCE_INFO } from '../data/trades';
import type { ResourceType } from '../types';

export function WeatherPanel() {
  const season = useGameStore((s) => s.season);
  const weather = useGameStore((s) => s.weather);
  const seasonProgress = useGameStore((s) => s.seasonProgress);
  const weatherDuration = useGameStore((s) => s.weatherDuration);
  const getWeatherEffects = useGameStore((s) => s.getWeatherEffects);

  const seasonConfig = SEASONS[season];
  const weatherConfig = WEATHERS[weather];
  const effects = getWeatherEffects();

  const seasonPercent = Math.min(100, (seasonProgress / seasonConfig.duration) * 100);
  const nextSeason = SEASONS[
    Object.keys(SEASONS)[
      (Object.keys(SEASONS).indexOf(season) + 1) % Object.keys(SEASONS).length
    ] as keyof typeof SEASONS
  ];

  const formatModifier = (value: number) => {
    const percent = Math.round(value * 100);
    if (percent > 0) return `+${percent}%`;
    if (percent < 0) return `${percent}%`;
    return '0%';
  };

  const getModifierColor = (value: number) => {
    if (value > 0.1) return '#4caf50';
    if (value > 0) return '#8bc34a';
    if (value < -0.2) return '#e53935';
    if (value < 0) return '#ff9800';
    return '#9e9e9e';
  };

  return (
    <div className="weather-panel">
      <div className="weather-header">
        <div className="current-season">
          <span className="season-icon" style={{ color: seasonConfig.color }}>
            {seasonConfig.icon}
          </span>
          <div className="season-info">
            <div className="season-name" style={{ color: seasonConfig.color }}>
              {seasonConfig.name}
            </div>
            <div className="season-progress-bar">
              <div
                className="season-progress-fill"
                style={{
                  width: `${seasonPercent}%`,
                  backgroundColor: seasonConfig.color,
                }}
              />
            </div>
            <div className="season-progress-text">
              {Math.floor(seasonProgress)}/{seasonConfig.duration} 天 → {nextSeason.icon} {nextSeason.name}
            </div>
          </div>
        </div>

        <div className="current-weather">
          <span className="weather-icon">{weatherConfig.icon}</span>
          <div className="weather-info">
            <div className="weather-name">{weatherConfig.name}</div>
            <div className="weather-duration">
              剩余 {Math.max(0, Math.ceil(weatherDuration))} 天
            </div>
          </div>
        </div>
      </div>

      <div className="weather-description">
        <p className="season-desc">{seasonConfig.description}</p>
        <p className="weather-desc">{weatherConfig.description}</p>
      </div>

      <div className="weather-effects">
        <div className="effects-title">当前效果</div>
        
        <div className="effects-grid">
          <div className="effect-section">
            <div className="effect-section-title">资源产出</div>
            {(Object.keys(RESOURCE_INFO) as ResourceType[]).map((resource) => {
              const modifier = effects.resourceModifiers[resource] || 0;
              if (modifier === 0) return null;
              return (
                <div key={resource} className="effect-row">
                  <span className="effect-icon">{RESOURCE_INFO[resource].icon}</span>
                  <span className="effect-name">{RESOURCE_INFO[resource].name}</span>
                  <span
                    className="effect-value"
                    style={{ color: getModifierColor(modifier) }}
                  >
                    {formatModifier(modifier)}
                  </span>
                </div>
              );
            })}
            {Object.values(effects.resourceModifiers).every(v => v === 0) && (
              <div className="effect-row no-effect">
                <span className="effect-value" style={{ color: '#9e9e9e' }}>
                  无额外影响
                </span>
              </div>
            )}
          </div>

          <div className="effect-section">
            <div className="effect-section-title">其他影响</div>
            <div className="effect-row">
              <span className="effect-icon">⚔️</span>
              <span className="effect-name">训练速度</span>
              <span
                className="effect-value"
                style={{ color: getModifierColor(effects.trainingSpeedModifier) }}
              >
                {formatModifier(effects.trainingSpeedModifier)}
              </span>
            </div>
            <div className="effect-row">
              <span className="effect-icon">👹</span>
              <span className="effect-name">敌袭强度</span>
              <span
                className="effect-value"
                style={{ color: getModifierColor(-effects.invasionModifier) }}
              >
                {formatModifier(effects.invasionModifier)}
              </span>
            </div>
            <div className="effect-row">
              <span className="effect-icon">🏪</span>
              <span className="effect-name">交易价格</span>
              <span
                className="effect-value"
                style={{ color: getModifierColor(effects.tradeModifier) }}
              >
                {formatModifier(effects.tradeModifier)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="season-forecast">
        <div className="forecast-title">季节展望</div>
        <div className="forecast-grid">
          {Object.entries(SEASONS).map(([key, s]) => (
            <div
              key={key}
              className={`forecast-item ${key === season ? 'current' : ''}`}
              style={{
                borderColor: key === season ? s.color : 'transparent',
              }}
            >
              <span className="forecast-icon">{s.icon}</span>
              <span className="forecast-name">{s.name}</span>
              <div className="forecast-modifiers">
                <span className="mini-mod" title="食物">
                  🍖{formatModifier(s.resourceModifiers.food || 0)}
                </span>
                <span className="mini-mod" title="训练">
                  ⚔️{formatModifier(s.trainingSpeedModifier)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
