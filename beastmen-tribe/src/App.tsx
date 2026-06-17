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
import { TotemPanel } from './components/TotemPanel';
import { NightRaidPanel } from './components/NightRaidPanel';
import { GovernmentPanel } from './components/GovernmentPanel';
import { CaravanPanel } from './components/CaravanPanel';
import { MilestonePanel } from './components/MilestonePanel';
import { MilestonePopup } from './components/MilestonePopup';
import { useGameStore } from './store/useGameStore';
import { MILESTONES } from './data/milestones';
import './App.css';

type TabType = 'population' | 'building' | 'warrior' | 'tech' | 'battle' | 'expedition' | 'nightRaid' | 'totem' | 'task' | 'trade' | 'caravan' | 'storage' | 'diplomacy' | 'government' | 'milestone' | 'save';

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'population', label: '人口', icon: '👥' },
  { id: 'building', label: '建设', icon: '🏗️' },
  { id: 'warrior', label: '训练', icon: '⚔️' },
  { id: 'tech', label: '科技', icon: '🔬' },
  { id: 'battle', label: '战斗', icon: '🛡️' },
  { id: 'expedition', label: '远征', icon: '🗡️' },
  { id: 'nightRaid', label: '夜袭', icon: '🌙' },
  { id: 'totem', label: '图腾', icon: '🗿' },
  { id: 'task', label: '委托', icon: '📜' },
  { id: 'trade', label: '交易', icon: '🏪' },
  { id: 'caravan', label: '商队', icon: '🐪' },
  { id: 'storage', label: '仓储', icon: '📦' },
  { id: 'diplomacy', label: '外交', icon: '🤝' },
  { id: 'government', label: '政务', icon: '🏛️' },
  { id: 'milestone', label: '里程碑', icon: '🏆' },
  { id: 'save', label: '设置', icon: '💾' },
];

function App() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('population');

  const getPanelHasRedDot = useGameStore((s) => s.getPanelHasRedDot);
  const dismissRedDot = useGameStore((s) => s.dismissRedDot);
  const pendingMilestonePopup = useGameStore((s) => s.milestone.pendingMilestonePopup);
  const claimMilestonePopup = useGameStore((s) => s.claimMilestonePopup);
  const closeMilestonePopup = useGameStore((s) => s.closeMilestonePopup);
  const getPendingRedDots = useGameStore((s) => s.getPendingRedDots);
  const getUnlockedPanels = useGameStore((s) => s.getUnlockedPanels);

  const pendingDots = getPendingRedDots();
  const unlockedPanels = getUnlockedPanels();

  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === 'save' || tab.id === 'milestone') return true;
    return unlockedPanels.includes(tab.id);
  });

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [unlockedPanels]);

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

  const handleTabClick = (tabId: TabType) => {
    setActiveTab(tabId);
    const dotsForTab = pendingDots.filter(
      (d) => d.type === 'panel' && d.target === tabId
    );
    for (const dot of dotsForTab) {
      for (const m of MILESTONES) {
        if (m.redDots.some((rd) => rd.type === dot.type && rd.target === dot.target)) {
          dismissRedDot(m.id, dot.type, dot.target);
        }
      }
    }
  };

  return (
    <div className="app">
      <ResourceBar />
      <EndingPanel />
      {pendingMilestonePopup && (
        <MilestonePopup
          milestone={pendingMilestonePopup}
          onClaim={claimMilestonePopup}
          onClose={closeMilestonePopup}
        />
      )}

      <div className="main-content">
        <div className="game-area">
          <div ref={gameContainerRef} className="game-container" />
        </div>

        <div className="side-panel">
          <WeatherPanel />
          <div className="tabs">
            {visibleTabs.map((tab) => {
              const hasRedDot = getPanelHasRedDot(tab.id);
              const isNewlyUnlocked = unlockedPanels.includes(tab.id) && pendingDots.some(
                (d) => d.type === 'panel' && d.target === tab.id
              );
              return (
                <button
                  key={tab.id}
                  className={`tab-btn tab ${activeTab === tab.id ? 'active' : ''} ${hasRedDot ? 'has-red-dot' : ''}`}
                  onClick={() => handleTabClick(tab.id)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-label">{tab.label}</span>
                  {isNewlyUnlocked && <span className="tab-new-badge">NEW</span>}
                  {hasRedDot && !isNewlyUnlocked && <span className="tab-red-dot">!</span>}
                </button>
              );
            })}
          </div>

          <div className="panel-content">
            {activeTab === 'population' && <PopulationPanel />}
            {activeTab === 'building' && <BuildingPanel gameRef={gameRef} />}
            {activeTab === 'warrior' && <WarriorPanel />}
            {activeTab === 'tech' && <TechTreePanel />}
            {activeTab === 'battle' && <BattlePanel />}
            {activeTab === 'expedition' && <ExpeditionPanel />}
            {activeTab === 'nightRaid' && <NightRaidPanel />}
            {activeTab === 'totem' && <TotemPanel />}
            {activeTab === 'task' && <TaskPanel />}
            {activeTab === 'trade' && <TradePanel />}
            {activeTab === 'caravan' && <CaravanPanel />}
            {activeTab === 'storage' && <StoragePanel onClose={() => {}} />}
            {activeTab === 'diplomacy' && <DiplomacyPanel />}
            {activeTab === 'government' && <GovernmentPanel />}
            {activeTab === 'milestone' && <MilestonePanel />}
            {activeTab === 'save' && <SavePanel />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
