import { useEffect, useRef, useState } from 'react';
import { createGame } from './game/config';
import { ResourceBar } from './components/ResourceBar';
import { BuildingPanel } from './components/BuildingPanel';
import { WarriorPanel } from './components/WarriorPanel';
import { BattlePanel } from './components/BattlePanel';
import { TradePanel } from './components/TradePanel';
import { SavePanel } from './components/SavePanel';
import { PopulationPanel } from './components/PopulationPanel';
import { ExpeditionPanel } from './components/ExpeditionPanel';
import { TechTreePanel } from './components/TechTreePanel';
import { TaskPanel } from './components/TaskPanel';
import { WeatherPanel } from './components/WeatherPanel';
import { DiplomacyPanel } from './components/DiplomacyPanel';
import { EndingPanel } from './components/EndingPanel';
import { StoragePanel } from './components/StoragePanel';
import './App.css';

type TabType = 'population' | 'building' | 'warrior' | 'tech' | 'battle' | 'expedition' | 'task' | 'trade' | 'storage' | 'diplomacy' | 'save';

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'population', label: '人口', icon: '👥' },
  { id: 'building', label: '建设', icon: '🏗️' },
  { id: 'warrior', label: '训练', icon: '⚔️' },
  { id: 'tech', label: '科技', icon: '🔬' },
  { id: 'battle', label: '战斗', icon: '🛡️' },
  { id: 'expedition', label: '远征', icon: '🗡️' },
  { id: 'task', label: '委托', icon: '📜' },
  { id: 'trade', label: '交易', icon: '🏪' },
  { id: 'storage', label: '仓储', icon: '📦' },
  { id: 'diplomacy', label: '外交', icon: '🏛️' },
  { id: 'save', label: '设置', icon: '💾' },
];

function App() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('population');

  useEffect(() => {
    if (gameContainerRef.current && !gameRef.current) {
      gameRef.current = createGame(gameContainerRef.current);
    }
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="app">
      <ResourceBar />
      <EndingPanel />

      <div className="main-content">
        <div className="game-area">
          <div ref={gameContainerRef} className="game-container" />
        </div>

        <div className="side-panel">
          <WeatherPanel />
          <div className="tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="panel-content">
            {activeTab === 'population' && <PopulationPanel />}
            {activeTab === 'building' && <BuildingPanel gameRef={gameRef} />}
            {activeTab === 'warrior' && <WarriorPanel />}
            {activeTab === 'tech' && <TechTreePanel />}
            {activeTab === 'battle' && <BattlePanel />}
            {activeTab === 'expedition' && <ExpeditionPanel />}
            {activeTab === 'task' && <TaskPanel />}
            {activeTab === 'trade' && <TradePanel />}
            {activeTab === 'storage' && <StoragePanel onClose={() => {}} />}
            {activeTab === 'diplomacy' && <DiplomacyPanel />}
            {activeTab === 'save' && <SavePanel />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
