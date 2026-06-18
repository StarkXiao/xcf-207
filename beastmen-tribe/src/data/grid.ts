import type {
  Building,
  BuildingType,
  GridSize,
  PlacementValidationResult,
  AdjacencyBonusResult,
  PlacementPreviewInfo,
  UpgradeAdjacencyInfo,
} from '../types';
import { BUILDINGS } from './buildings';

export const GRID_SIZE = 60;

export const getBuildingGridSize = (type: BuildingType): GridSize => {
  const config = BUILDINGS[type];
  return config?.gridSize || { width: 1, height: 1 };
};

export const getGridCellFromPosition = (x: number, y: number): { gx: number; gy: number } => {
  const gx = Math.floor(x / GRID_SIZE);
  const gy = Math.floor(y / GRID_SIZE);
  return { gx, gy };
};

export const getPositionFromGridCell = (gx: number, gy: number): { x: number; y: number } => {
  const x = gx * GRID_SIZE + GRID_SIZE / 2;
  const y = gy * GRID_SIZE + GRID_SIZE / 2;
  return { x, y };
};

export const getBuildingOccupiedCells = (
  centerX: number,
  centerY: number,
  gridSize: GridSize
): { gx: number; gy: number }[] => {
  const cells: { gx: number; gy: number }[] = [];
  const { gx: centerGx, gy: centerGy } = getGridCellFromPosition(centerX, centerY);
  const offsetX = Math.floor(gridSize.width / 2);
  const offsetY = Math.floor(gridSize.height / 2);

  for (let dx = 0; dx < gridSize.width; dx++) {
    for (let dy = 0; dy < gridSize.height; dy++) {
      cells.push({
        gx: centerGx - offsetX + dx,
        gy: centerGy - offsetY + dy,
      });
    }
  }

  return cells;
};

export const getBuildingNeighborCells = (
  occupiedCells: { gx: number; gy: number }[]
): { gx: number; gy: number }[] => {
  const neighbors = new Set<string>();
  const occupiedSet = new Set(occupiedCells.map((c) => `${c.gx},${c.gy}`));

  for (const cell of occupiedCells) {
    const directions = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: 1 },
    ];

    for (const dir of directions) {
      const key = `${cell.gx + dir.dx},${cell.gy + dir.dy}`;
      if (!occupiedSet.has(key)) {
        neighbors.add(key);
      }
    }
  }

  return Array.from(neighbors).map((key) => {
    const [gx, gy] = key.split(',').map(Number);
    return { gx, gy };
  });
};

export const getBuildingAtCell = (
  buildings: Building[],
  gx: number,
  gy: number
): Building | null => {
  for (const building of buildings) {
    if (building.isBuilding) continue;
    const gridSize = getBuildingGridSize(building.type);
    const cells = getBuildingOccupiedCells(building.x, building.y, gridSize);
    if (cells.some((c) => c.gx === gx && c.gy === gy)) {
      return building;
    }
  }
  return null;
};

export const getBuildingsAtCells = (
  buildings: Building[],
  cells: { gx: number; gy: number }[]
): Building[] => {
  const result: Building[] = [];
  const seen = new Set<string>();

  for (const cell of cells) {
    const building = getBuildingAtCell(buildings, cell.gx, cell.gy);
    if (building && !seen.has(building.id)) {
      seen.add(building.id);
      result.push(building);
    }
  }

  return result;
};

export const validatePlacement = (
  type: BuildingType,
  x: number,
  y: number,
  buildings: Building[],
  sceneWidth: number = 800,
  sceneHeight: number = 500
): PlacementValidationResult => {
  const gridSize = getBuildingGridSize(type);
  const occupiedCells = getBuildingOccupiedCells(x, y, gridSize);

  if (occupiedCells.length === 0) {
    return { valid: false, reason: '无法计算建筑占用范围' };
  }

  for (const cell of occupiedCells) {
    if (cell.gx < 0 || cell.gy < 0) {
      return { valid: false, reason: '建筑位置超出地图边界' };
    }
    const cellX = cell.gx * GRID_SIZE + GRID_SIZE;
    const cellY = cell.gy * GRID_SIZE + GRID_SIZE;
    if (cellX > sceneWidth || cellY > sceneHeight) {
      return { valid: false, reason: '建筑位置超出地图边界' };
    }
  }

  const overlappingBuildings: string[] = [];
  for (const building of buildings) {
    const buildingGridSize = getBuildingGridSize(building.type);
    const buildingCells = getBuildingOccupiedCells(building.x, building.y, buildingGridSize);
    const hasOverlap = occupiedCells.some((c1) =>
      buildingCells.some((c2) => c1.gx === c2.gx && c1.gy === c2.gy)
    );
    if (hasOverlap) {
      overlappingBuildings.push(building.id);
    }
  }

  if (overlappingBuildings.length > 0) {
    return { valid: false, reason: '此位置已被其他建筑占用', overlappingBuildings };
  }

  return { valid: true };
};

export const calculateAdjacencyBonus = (
  buildingType: BuildingType,
  x: number,
  y: number,
  buildings: Building[],
  excludeBuildingId?: string
): AdjacencyBonusResult => {
  const config = BUILDINGS[buildingType];
  const bonusRules = config?.adjacencyBonusRules || [];

  if (bonusRules.length === 0) {
    return { totalBonusPercent: 0, bonusDetails: [] };
  }

  const gridSize = getBuildingGridSize(buildingType);
  const occupiedCells = getBuildingOccupiedCells(x, y, gridSize);
  const neighborCells = getBuildingNeighborCells(occupiedCells);
  const neighborBuildings = getBuildingsAtCells(buildings, neighborCells).filter(
    (b) => b.id !== excludeBuildingId
  );

  const bonusDetails: AdjacencyBonusResult['bonusDetails'] = [];
  let totalBonusPercent = 0;

  for (const neighbor of neighborBuildings) {
    for (const rule of bonusRules) {
      if (neighbor.type === rule.targetBuildingType) {
        bonusDetails.push({
          neighborBuildingId: neighbor.id,
          neighborBuildingType: neighbor.type,
          neighborBuildingName: BUILDINGS[neighbor.type]?.name || neighbor.type,
          bonusPercent: rule.bonusPercent,
        });
        totalBonusPercent += rule.bonusPercent;
      }
    }
  }

  return { totalBonusPercent, bonusDetails };
};

export const getPlacementPreview = (
  type: BuildingType,
  x: number,
  y: number,
  buildings: Building[],
  sceneWidth?: number,
  sceneHeight?: number
): PlacementPreviewInfo => {
  const gridSize = getBuildingGridSize(type);
  const occupiedCells = getBuildingOccupiedCells(x, y, gridSize);
  const adjacencyBonus = calculateAdjacencyBonus(type, x, y, buildings);
  const canPlace = validatePlacement(type, x, y, buildings, sceneWidth, sceneHeight);

  return {
    occupiedCells,
    adjacencyBonus,
    canPlace,
  };
};

export const getUpgradeAdjacencyInfo = (
  buildingId: string,
  buildings: Building[]
): UpgradeAdjacencyInfo => {
  const building = buildings.find((b) => b.id === buildingId);
  if (!building) {
    return {
      currentBonus: { totalBonusPercent: 0, bonusDetails: [] },
      projectedBonus: { totalBonusPercent: 0, bonusDetails: [] },
      bonusGainPercent: 0,
    };
  }

  const currentBonus = calculateAdjacencyBonus(
    building.type,
    building.x,
    building.y,
    buildings,
    buildingId
  );

  const projectedBonus = currentBonus;
  const bonusGainPercent = 0;

  return {
    currentBonus,
    projectedBonus,
    bonusGainPercent,
  };
};

export const getAdjacentBonusForBuilding = (
  building: Building,
  buildings: Building[]
): AdjacencyBonusResult => {
  return calculateAdjacencyBonus(building.type, building.x, building.y, buildings, building.id);
};

export const getTotalAdjacencyProductionMultiplier = (
  building: Building,
  buildings: Building[]
): number => {
  const bonus = getAdjacentBonusForBuilding(building, buildings);
  return 1 + bonus.totalBonusPercent / 100;
};
