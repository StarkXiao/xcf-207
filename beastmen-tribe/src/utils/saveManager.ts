import type { GameState, SaveSlot, SaveSlotInfo, LoadSaveResult, SaveType } from '../types';
import { SAVE_VERSION } from '../types';

const SAVE_SLOTS_KEY = 'beastmen_tribe_save_slots';
const MAX_MANUAL_SLOTS = 8;
const MAX_AUTO_SLOTS = 5;
const BACKUP_SUFFIX = '_backup';

const generateSlotId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

export const createSaveSlot = (
  slotIndex: number,
  type: SaveType,
  state: GameState,
  note: string = ''
): SaveSlot => {
  return {
    id: generateSlotId(),
    slotIndex,
    type,
    note,
    tribeName: state.tribeName,
    day: state.day,
    population: state.population,
    totalWins: state.totalWins,
    totalLosses: state.totalLosses,
    timestamp: Date.now(),
    version: SAVE_VERSION,
    data: { ...state, lastSave: Date.now() },
    isCorrupted: false,
  };
};

export const saveSlotToInfo = (slot: SaveSlot): SaveSlotInfo => {
  const { data, ...info } = slot;
  return info;
};

const getAllSlots = (): SaveSlot[] => {
  try {
    const raw = localStorage.getItem(SAVE_SLOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SaveSlot[];
  } catch (e) {
    console.error('Failed to load save slots:', e);
    return [];
  }
};

const persistAllSlots = (slots: SaveSlot[]): void => {
  try {
    localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots));
  } catch (e) {
    console.error('Failed to persist save slots:', e);
  }
};

const validateSaveData = (data: unknown): { valid: boolean; reason?: string } => {
  if (!data || typeof data !== 'object') {
    return { valid: false, reason: '存档数据不是有效的对象' };
  }
  const state = data as Record<string, unknown>;
  if (typeof state.tribeName !== 'string') {
    return { valid: false, reason: '缺少部落名称字段' };
  }
  if (typeof state.day !== 'number' || state.day < 0) {
    return { valid: false, reason: '天数字段异常' };
  }
  if (!Array.isArray(state.buildings)) {
    return { valid: false, reason: '建筑数据缺失' };
  }
  return { valid: true };
};

export const getSaveSlotInfos = (): SaveSlotInfo[] => {
  return getAllSlots().map(saveSlotToInfo).sort((a, b) => b.timestamp - a.timestamp);
};

export const getSlotsByType = (type: SaveType): SaveSlot[] => {
  return getAllSlots().filter((s) => s.type === type).sort((a, b) => b.timestamp - a.timestamp);
};

export const getNextAvailableSlot = (type: SaveType): number => {
  const existing = getSlotsByType(type);
  const maxSlots = type === 'auto' ? MAX_AUTO_SLOTS : MAX_MANUAL_SLOTS;
  const usedIndices = new Set(existing.map((s) => s.slotIndex));
  for (let i = 0; i < maxSlots; i++) {
    if (!usedIndices.has(i)) return i;
  }
  return 0;
};

export const getOldestAutoSave = (): SaveSlot | null => {
  const autos = getSlotsByType('auto');
  return autos.length >= MAX_AUTO_SLOTS ? autos[autos.length - 1] : null;
};

export const saveToSlot = (
  state: GameState,
  slotIndex: number,
  type: SaveType = 'manual',
  note: string = ''
): SaveSlot => {
  const allSlots = getAllSlots();
  const existingIndex = allSlots.findIndex((s) => s.slotIndex === slotIndex && s.type === type);
  const newSlot = createSaveSlot(slotIndex, type, state, note);

  if (existingIndex >= 0) {
    const oldSlot = allSlots[existingIndex];
    const backupKey = `${SAVE_SLOTS_KEY}_${oldSlot.id}${BACKUP_SUFFIX}`;
    try {
      localStorage.setItem(backupKey, JSON.stringify(oldSlot));
      setTimeout(() => localStorage.removeItem(backupKey), 24 * 60 * 60 * 1000);
    } catch (e) {
      console.warn('Could not create backup:', e);
    }
    allSlots[existingIndex] = newSlot;
  } else {
    if (type === 'auto') {
      const autos = allSlots.filter((s) => s.type === 'auto');
      if (autos.length >= MAX_AUTO_SLOTS) {
        const oldest = autos.sort((a, b) => a.timestamp - b.timestamp)[0];
        const idx = allSlots.findIndex((s) => s.id === oldest.id);
        if (idx >= 0) allSlots.splice(idx, 1);
      }
    }
    allSlots.push(newSlot);
  }

  persistAllSlots(allSlots);
  return newSlot;
};

export const quickSave = (state: GameState): SaveSlot => {
  return saveToSlot(state, 0, 'quicksave', '快速存档');
};

export const autoSave = (state: GameState): SaveSlot => {
  const nextSlot = getNextAvailableSlot('auto');
  return saveToSlot(state, nextSlot, 'auto', `自动存档 - 第${Math.floor(state.day)}天`);
};

export const loadSlot = (slotId: string): LoadSaveResult => {
  const allSlots = getAllSlots();
  const slot = allSlots.find((s) => s.id === slotId);

  if (!slot) {
    return { success: false, error: '存档槽位不存在' };
  }

  const versionMismatch = slot.version !== SAVE_VERSION
    ? { saveVersion: slot.version, currentVersion: SAVE_VERSION }
    : undefined;

  if (slot.isCorrupted) {
    const warnings: string[] = [];
    if (slot.corruptionReason) warnings.push(slot.corruptionReason);

    const backupKey = `${SAVE_SLOTS_KEY}_${slot.id}${BACKUP_SUFFIX}`;
    const backupRaw = localStorage.getItem(backupKey);
    const hasValidBackup = (() => {
      if (!backupRaw) return false;
      try {
        const backup = JSON.parse(backupRaw) as SaveSlot;
        return validateSaveData(backup.data).valid;
      } catch (e) {
        return false;
      }
    })();

    return {
      success: false,
      error: hasValidBackup ? '存档已损坏，请使用「回滚备份」功能恢复' : '存档已损坏，无可用备份',
      warnings,
      hasBackup: hasValidBackup,
      versionMismatch,
    };
  }

  const validation = validateSaveData(slot.data);
  if (!validation.valid) {
    const warnings: string[] = [];
    if (validation.reason) warnings.push(`损坏原因：${validation.reason}`);

    const slotIndex = allSlots.findIndex((s) => s.id === slot.id);
    if (slotIndex >= 0) {
      allSlots[slotIndex] = {
        ...allSlots[slotIndex],
        isCorrupted: true,
        corruptionReason: validation.reason,
      };
      persistAllSlots(allSlots);
    }

    const backupKey = `${SAVE_SLOTS_KEY}_${slot.id}${BACKUP_SUFFIX}`;
    const backupRaw = localStorage.getItem(backupKey);
    const hasValidBackup = (() => {
      if (!backupRaw) return false;
      try {
        const backup = JSON.parse(backupRaw) as SaveSlot;
        return validateSaveData(backup.data).valid;
      } catch (e) {
        return false;
      }
    })();

    if (hasValidBackup) {
      return {
        success: false,
        error: '存档已损坏，请使用「回滚备份」功能恢复',
        warnings: [...warnings, '检测到可用的备份存档，可点击「回滚备份」按钮恢复'],
        hasBackup: true,
        versionMismatch,
      };
    }

    return {
      success: false,
      error: `存档已损坏：${validation.reason}`,
      warnings,
      hasBackup: false,
      versionMismatch,
    };
  }

  return {
    success: true,
    state: slot.data,
    warnings: versionMismatch
      ? [`存档版本 v${slot.version}，当前版本 v${SAVE_VERSION}，数据已自动迁移`]
      : [],
    needsMigration: !!versionMismatch,
    versionMismatch,
  };
};

export const deleteSlot = (slotId: string): boolean => {
  const allSlots = getAllSlots();
  const index = allSlots.findIndex((s) => s.id === slotId);
  if (index < 0) return false;

  const backupKey = `${SAVE_SLOTS_KEY}_${slotId}${BACKUP_SUFFIX}`;
  localStorage.removeItem(backupKey);
  allSlots.splice(index, 1);
  persistAllSlots(allSlots);
  return true;
};

export const updateSlotNote = (slotId: string, note: string): boolean => {
  const allSlots = getAllSlots();
  const index = allSlots.findIndex((s) => s.id === slotId);
  if (index < 0) return false;
  allSlots[index] = { ...allSlots[index], note, timestamp: Date.now() };
  persistAllSlots(allSlots);
  return true;
};

export const rollbackToBackup = (slotId: string): LoadSaveResult => {
  const backupKey = `${SAVE_SLOTS_KEY}_${slotId}${BACKUP_SUFFIX}`;
  const backupRaw = localStorage.getItem(backupKey);
  if (!backupRaw) {
    return { success: false, error: '未找到备份存档' };
  }
  try {
    const backup = JSON.parse(backupRaw) as SaveSlot;
    const validation = validateSaveData(backup.data);
    if (!validation.valid) {
      return { success: false, error: `备份存档也已损坏：${validation.reason}` };
    }
    return {
      success: true,
      state: backup.data,
      warnings: ['已回滚到上一个备份存档'],
    };
  } catch (e) {
    return { success: false, error: '备份存档解析失败' };
  }
};

export const markSlotCorrupted = (slotId: string, reason: string): boolean => {
  const allSlots = getAllSlots();
  const index = allSlots.findIndex((s) => s.id === slotId);
  if (index < 0) return false;
  allSlots[index] = { ...allSlots[index], isCorrupted: true, corruptionReason: reason };
  persistAllSlots(allSlots);
  return true;
};

export const getSlotById = (slotId: string): SaveSlot | null => {
  return getAllSlots().find((s) => s.id === slotId) || null;
};

export const getMostRecentSlot = (): SaveSlot | null => {
  const slots = getAllSlots().sort((a, b) => b.timestamp - a.timestamp);
  for (const slot of slots) {
    if (!slot.isCorrupted) return slot;
  }
  return null;
};

export const getBackupExists = (slotId: string): boolean => {
  return !!localStorage.getItem(`${SAVE_SLOTS_KEY}_${slotId}${BACKUP_SUFFIX}`);
};

export const migrateLegacySave = (legacyState: GameState): SaveSlot => {
  return saveToSlot(legacyState, 0, 'manual', '迁移自旧版存档');
};
