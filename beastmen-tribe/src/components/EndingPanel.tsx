import { useGameStore } from '../store/useGameStore';
import { ENDINGS } from '../data/endings';
import { FACTIONS } from '../data/factions';
import type { FactionType } from '../types';

export function EndingPanel() {
  const gameEnding = useGameStore((s) => s.gameEnding);
  const resetGame = useGameStore((s) => s.resetGame);

  if (!gameEnding) return null;

  const endingConfig = ENDINGS[gameEnding.ending];
  const stats = gameEnding.stats;

  return (
    <div className="ending-overlay">
      <div className="ending-panel">
        <div className="ending-icon">{endingConfig.icon}</div>
        <h2 className="ending-title">{endingConfig.name}</h2>
        <p className="ending-description">{endingConfig.description}</p>
        <div className="ending-epilogue">
          <p>{endingConfig.epilogue}</p>
        </div>

        <div className="ending-stats">
          <h3>📊 部落统计</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">存活天数</span>
              <span className="stat-value">{stats.finalDay}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">战斗胜利</span>
              <span className="stat-value positive">{stats.totalWins}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">战斗失败</span>
              <span className="stat-value negative">{stats.totalLosses}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">最终人口</span>
              <span className="stat-value">{stats.finalPopulation}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">交易次数</span>
              <span className="stat-value">{stats.totalTrades}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">远征次数</span>
              <span className="stat-value">{stats.totalExpeditions}</span>
            </div>
          </div>
        </div>

        <div className="ending-factions">
          <h3>🌍 势力关系最终状态</h3>
          <div className="factions-final">
            {(Object.keys(stats.factionRelations) as FactionType[]).map((fid) => {
              const rep = stats.factionRelations[fid];
              const config = FACTIONS[fid];
              return (
                <div key={fid} className="faction-final">
                  <span className="faction-final-icon">{config.icon}</span>
                  <span className="faction-final-name">{config.name}</span>
                  <span className={`faction-final-rep ${rep >= 0 ? 'positive' : 'negative'}`}>
                    {rep >= 0 ? '+' : ''}{rep}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <button className="btn btn-primary ending-restart-btn" onClick={resetGame}>
          🔄 重新开始
        </button>
      </div>
    </div>
  );
}
