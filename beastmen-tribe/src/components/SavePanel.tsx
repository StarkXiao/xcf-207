import { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';
import type { SaveSlotInfo, LoadSaveResult } from '../types';
import { SAVE_VERSION } from '../types';

const typeLabels: Record<string, string> = {
  manual: '手动存档',
  auto: '自动存档',
  quicksave: '快速存档',
};

const typeColors: Record<string, string> = {
  manual: 'type-manual',
  auto: 'type-auto',
  quicksave: 'type-quicksave',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SaveSlotCard({
  slot,
  onLoad,
  onDelete,
  onEditNote,
  onRollback,
  hasBackup,
}: {
  slot: SaveSlotInfo;
  onLoad: () => void;
  onDelete: () => void;
  onEditNote: () => void;
  onRollback: () => void;
  hasBackup: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  const versionBadge = slot.version !== SAVE_VERSION ? (
    <span className="version-badge outdated">v{slot.version}</span>
  ) : (
    <span className="version-badge">v{slot.version}</span>
  );

  return (
    <div className={`save-slot-card ${slot.isCorrupted ? 'corrupted' : ''} ${typeColors[slot.type]}`}>
      <div className="slot-header">
        <div className="slot-type-badge">{typeLabels[slot.type]}</div>
        {versionBadge}
        {slot.isCorrupted && <span className="corrupt-badge">⚠️ 已损坏</span>}
      </div>

      <div className="slot-tribe-info">
        <div className="slot-tribe-name">{slot.tribeName}</div>
        <div className="slot-meta">
          第 {Math.floor(slot.day)} 天 · 人口 {slot.population} · 胜 {slot.totalWins}/负 {slot.totalLosses}
        </div>
      </div>

      {slot.note ? (
        <div className="slot-note" onClick={onEditNote}>
          📝 {slot.note}
        </div>
      ) : (
        <div className="slot-note empty" onClick={onEditNote}>
          📝 点击添加备注...
        </div>
      )}

      <div className="slot-timestamp">{formatDate(slot.timestamp)}</div>

      {slot.isCorrupted ? (
        <div className="slot-actions corrupted-actions">
          {hasBackup ? (
            <button className="btn btn-warning" onClick={onRollback}>
              🔄 回滚备份
            </button>
          ) : (
            <span className="no-backup-hint">无可用备份</span>
          )}
          <button className="btn btn-danger-outline" onClick={onDelete}>
            删除
          </button>
        </div>
      ) : (
        <div className="slot-actions">
          <button className="btn btn-primary btn-small" onClick={onLoad}>
            加载
          </button>
          <button className="btn btn-secondary btn-small" onClick={onEditNote}>
            备注
          </button>
          {hasBackup && (
            <button className="btn btn-warning-outline btn-small" onClick={onRollback}>
              回滚
            </button>
          )}
          <button className="btn btn-danger-outline btn-small" onClick={() => setShowConfirm(true)}>
            删除
          </button>
        </div>
      )}

      {showConfirm && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-box">
            <div className="confirm-text">确定删除这个存档？</div>
            <div className="confirm-buttons">
              <button
                className="btn btn-danger"
                onClick={() => {
                  onDelete();
                  setShowConfirm(false);
                }}
              >
                删除
              </button>
              <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteEditorModal({
  currentNote,
  onSave,
  onCancel,
}: {
  currentNote: string;
  onSave: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState(currentNote);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box note-editor" onClick={(e) => e.stopPropagation()}>
        <h4>编辑备注</h4>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={100}
          placeholder="为这个存档添加备注..."
          className="note-textarea"
          autoFocus
        />
        <div className="note-counter">{note.length}/100</div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={() => onSave(note)}>
            确定
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function SaveToSlotModal({
  onSave,
  onCancel,
  existingSlots,
}: {
  onSave: (slotIndex: number, note: string) => void;
  onCancel: () => void;
  existingSlots: SaveSlotInfo[];
}) {
  const manualSlots = existingSlots.filter((s) => s.type === 'manual');
  const usedIndices = new Set(manualSlots.map((s) => s.slotIndex));
  const nextAvailable = (() => {
    for (let i = 0; i < 8; i++) {
      if (!usedIndices.has(i)) return i;
    }
    return 0;
  })();

  const [selectedSlot, setSelectedSlot] = useState<number>(nextAvailable);
  const [note, setNote] = useState('');
  const [overwriteSlot, setOverwriteSlot] = useState<SaveSlotInfo | null>(null);

  const handleSave = () => {
    const existing = manualSlots.find((s) => s.slotIndex === selectedSlot);
    if (existing) {
      setOverwriteSlot(existing);
    } else {
      onSave(selectedSlot, note);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box save-to-slot" onClick={(e) => e.stopPropagation()}>
        <h4>保存到槽位</h4>
        <div className="slot-selector">
          {Array.from({ length: 8 }).map((_, i) => {
            const slot = manualSlots.find((s) => s.slotIndex === i);
            const isSelected = selectedSlot === i;
            return (
              <div
                key={i}
                className={`slot-selector-item ${isSelected ? 'selected' : ''} ${slot ? 'occupied' : 'empty'}`}
                onClick={() => setSelectedSlot(i)}
              >
                <div className="slot-number">#{i + 1}</div>
                {slot ? (
                  <>
                    <div className="slot-selector-name">{slot.tribeName}</div>
                    <div className="slot-selector-day">第{Math.floor(slot.day)}天</div>
                  </>
                ) : (
                  <div className="slot-selector-empty">空槽位</div>
                )}
              </div>
            );
          })}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={100}
          placeholder="存档备注（可选）..."
          className="note-textarea"
        />
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            保存
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
        </div>
      </div>

      {overwriteSlot && (
        <div className="modal-overlay" onClick={() => setOverwriteSlot(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h4>⚠️ 确认覆盖</h4>
            <div className="overwrite-info">
              即将覆盖槽位 #{overwriteSlot.slotIndex + 1}:
              <br />
              <strong>{overwriteSlot.tribeName}</strong> - 第{Math.floor(overwriteSlot.day)}天
              <br />
              {formatDate(overwriteSlot.timestamp)}
            </div>
            <div className="confirm-buttons">
              <button
                className="btn btn-danger"
                onClick={() => {
                  onSave(selectedSlot, note);
                  setOverwriteSlot(null);
                }}
              >
                确认覆盖
              </button>
              <button className="btn btn-secondary" onClick={() => setOverwriteSlot(null)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultNotification({
  result,
  onClose,
}: {
  result: LoadSaveResult;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = result.success;
  const title = isSuccess ? '✅ 加载成功' : '❌ 加载失败';

  return (
    <div className={`result-notification ${isSuccess ? 'success' : 'error'}`}>
      <div className="result-title">{title}</div>
      {result.error && <div className="result-error">{result.error}</div>}
      {result.warnings && result.warnings.length > 0 && (
        <ul className="result-warnings">
          {result.warnings.map((w, i) => (
            <li key={i}>⚠️ {w}</li>
          ))}
        </ul>
      )}
      {result.versionMismatch && (
        <div className="result-version">
          存档版本: v{result.versionMismatch.saveVersion} → 当前版本: v{result.versionMismatch.currentVersion}
        </div>
      )}
      <button className="btn btn-secondary btn-small" onClick={onClose}>
        关闭
      </button>
    </div>
  );
}

export function SavePanel() {
  const lastSave = useGameStore((s) => s.lastSave);
  const saveGame = useGameStore((s) => s.saveGame);
  const resetGame = useGameStore((s) => s.resetGame);
  const setTribeName = useGameStore((s) => s.setTribeName);
  const tribeName = useGameStore((s) => s.tribeName);

  const getSaveSlots = useGameStore((s) => s.getSaveSlots);
  const saveToSlot = useGameStore((s) => s.saveToSlot);
  const loadFromSlot = useGameStore((s) => s.loadFromSlot);
  const deleteSaveSlot = useGameStore((s) => s.deleteSaveSlot);
  const updateSlotNote = useGameStore((s) => s.updateSlotNote);
  const rollbackSlot = useGameStore((s) => s.rollbackSlot);
  const hasBackup = useGameStore((s) => s.hasBackup);
  const quickSaveGame = useGameStore((s) => s.quickSaveGame);

  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const [showReset, setShowReset] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(tribeName);
  const [noteEditor, setNoteEditor] = useState<{ slotId: string; currentNote: string } | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [loadResult, setLoadResult] = useState<LoadSaveResult | null>(null);

  const refreshSlots = () => {
    setSlots(getSaveSlots());
  };

  useEffect(() => {
    refreshSlots();
  }, []);

  const manualSlots = useMemo(() => slots.filter((s) => s.type === 'manual'), [slots]);
  const autoSlots = useMemo(() => slots.filter((s) => s.type === 'auto'), [slots]);
  const quickSlots = useMemo(() => slots.filter((s) => s.type === 'quicksave'), [slots]);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      setTribeName(nameInput.trim());
    }
    setEditingName(false);
  };

  const handleLoad = (slotId: string) => {
    const result = loadFromSlot(slotId);
    setLoadResult(result);
    refreshSlots();
  };

  const handleDelete = (slotId: string) => {
    deleteSaveSlot(slotId);
    refreshSlots();
  };

  const handleSaveNote = (slotId: string, note: string) => {
    updateSlotNote(slotId, note);
    setNoteEditor(null);
    refreshSlots();
  };

  const handleRollback = (slotId: string) => {
    const result = rollbackSlot(slotId);
    setLoadResult(result);
    if (result.success) {
      refreshSlots();
    }
  };

  const handleSaveToSlot = (slotIndex: number, note: string) => {
    saveToSlot(slotIndex, note);
    setShowSaveModal(false);
    refreshSlots();
  };

  const handleQuickSave = () => {
    const result = quickSaveGame();
    if (result) {
      setLoadResult({
        success: true,
        warnings: [`快速存档已保存 - ${result.tribeName} 第${Math.floor(result.day)}天`],
      });
      refreshSlots();
    }
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
        <div className="save-time">{new Date(lastSave).toLocaleString('zh-CN')}</div>
        <div className="auto-save-hint">(每30秒自动保存)</div>
      </div>

      <div className="main-save-buttons">
        <button className="btn btn-primary" onClick={saveGame}>
          💾 立即保存
        </button>
        <button className="btn btn-secondary" onClick={handleQuickSave}>
          ⚡ 快速存档
        </button>
        <button className="btn btn-accent" onClick={() => setShowSaveModal(true)}>
          📂 另存为...
        </button>
      </div>

      <div className="save-slots-section">
        {quickSlots.length > 0 && (
          <div className="save-slots-group">
            <div className="group-title">⚡ 快速存档</div>
            <div className="save-slots-grid">
              {quickSlots.map((slot) => (
                <SaveSlotCard
                  key={slot.id}
                  slot={slot}
                  onLoad={() => handleLoad(slot.id)}
                  onDelete={() => handleDelete(slot.id)}
                  onEditNote={() => setNoteEditor({ slotId: slot.id, currentNote: slot.note })}
                  onRollback={() => handleRollback(slot.id)}
                  hasBackup={hasBackup(slot.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="save-slots-group">
          <div className="group-title">
            📂 手动存档 <span className="group-count">({manualSlots.length}/8)</span>
          </div>
          <div className="save-slots-grid">
            {manualSlots.length > 0 ? (
              manualSlots.map((slot) => (
                <SaveSlotCard
                  key={slot.id}
                  slot={slot}
                  onLoad={() => handleLoad(slot.id)}
                  onDelete={() => handleDelete(slot.id)}
                  onEditNote={() => setNoteEditor({ slotId: slot.id, currentNote: slot.note })}
                  onRollback={() => handleRollback(slot.id)}
                  hasBackup={hasBackup(slot.id)}
                />
              ))
            ) : (
              <div className="empty-slots-hint">暂无手动存档，点击「另存为...」创建</div>
            )}
          </div>
        </div>

        {autoSlots.length > 0 && (
          <div className="save-slots-group">
            <div className="group-title">
              🤖 自动存档 <span className="group-count">({autoSlots.length}/5)</span>
            </div>
            <div className="save-slots-grid">
              {autoSlots.map((slot) => (
                <SaveSlotCard
                  key={slot.id}
                  slot={slot}
                  onLoad={() => handleLoad(slot.id)}
                  onDelete={() => handleDelete(slot.id)}
                  onEditNote={() => setNoteEditor({ slotId: slot.id, currentNote: slot.note })}
                  onRollback={() => handleRollback(slot.id)}
                  hasBackup={hasBackup(slot.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {!showReset ? (
        <button className="btn btn-danger-outline reset-btn" onClick={() => setShowReset(true)}>
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
                refreshSlots();
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

      {noteEditor && (
        <NoteEditorModal
          currentNote={noteEditor.currentNote}
          onSave={(note) => handleSaveNote(noteEditor.slotId, note)}
          onCancel={() => setNoteEditor(null)}
        />
      )}

      {showSaveModal && (
        <SaveToSlotModal
          onSave={handleSaveToSlot}
          onCancel={() => setShowSaveModal(false)}
          existingSlots={slots}
        />
      )}

      {loadResult && (
        <ResultNotification result={loadResult} onClose={() => setLoadResult(null)} />
      )}
    </div>
  );
}
