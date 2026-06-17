import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';

export function SavePanel() {
  const lastSave = useGameStore((s) => s.lastSave);
  const saveGame = useGameStore((s) => s.saveGame);
  const resetGame = useGameStore((s) => s.resetGame);
  const setTribeName = useGameStore((s) => s.setTribeName);
  const tribeName = useGameStore((s) => s.tribeName);
  const [showReset, setShowReset] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(tribeName);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      setTribeName(nameInput.trim());
    }
    setEditingName(false);
  };

  return (
    <div className="panel save-panel">
      <h3 className="panel-title">💾 进度管理</h3>

      <div className="tribe-name-section">
        <div className="section-label">部落名称</div>
        {editingName ? (
          <div className="name-edit">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={12}
              className="name-input"
            />
            <button className="btn btn-primary btn-small" onClick={handleSaveName}>
              确定
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => {
                setNameInput(tribeName);
                setEditingName(false);
              }}
            >
              取消
            </button>
          </div>
        ) : (
          <div className="name-display" onClick={() => setEditingName(true)}>
            {tribeName} ✏️
          </div>
        )}
      </div>

      <div className="save-info">
        <div className="save-label">上次保存</div>
        <div className="save-time">
          {new Date(lastSave).toLocaleString('zh-CN')}
        </div>
        <div className="auto-save-hint">(每30秒自动保存)</div>
      </div>

      <button className="btn btn-primary" onClick={saveGame}>
        💾 立即保存
      </button>

      {!showReset ? (
        <button className="btn btn-danger-outline" onClick={() => setShowReset(true)}>
          🔄 重置游戏
        </button>
      ) : (
        <div className="reset-confirm">
          <div className="confirm-text">确定要重置所有进度吗？此操作不可撤销！</div>
          <div className="confirm-buttons">
            <button
              className="btn btn-danger"
              onClick={() => {
                resetGame();
                setShowReset(false);
              }}
            >
              确认重置
            </button>
            <button className="btn btn-secondary" onClick={() => setShowReset(false)}>
              取消
            </button>
          </div>
        </div>
      )}

      <div className="game-tips">
        <div className="tips-title">🎮 游戏指南</div>
        <ul className="tips-list">
          <li>建造【狩猎场/伐木场/采石场】自动产出资源</li>
          <li>建造【兵营】训练战士保卫部落</li>
          <li>建造【铁匠铺】解锁高级兵种</li>
          <li>建造【交易市场】与其他部落交易</li>
          <li>建造【防御工事】提升战斗防御力</li>
          <li>升级【部落大厅】解锁更多建筑</li>
          <li>每隔一段时间会有外敌入侵，做好准备！</li>
        </ul>
      </div>
    </div>
  );
}
