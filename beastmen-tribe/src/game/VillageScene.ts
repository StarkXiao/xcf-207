import Phaser from 'phaser';
import { useGameStore } from '../store/useGameStore';
import { BUILDINGS } from '../data/buildings';

export class VillageScene extends Phaser.Scene {
  private buildings: Map<string, Phaser.GameObjects.Container> = new Map();
  private placingBuilding: string | null = null;
  private ghostBuilding: Phaser.GameObjects.Container | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private lastTick: number = 0;

  constructor() {
    super('VillageScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x3d5c3d);

    this.gridGraphics = this.add.graphics();
    this.gridGraphics.lineStyle(1, 0x2d4a2d, 0.5);
    const gridSize = 60;
    for (let x = 0; x < width; x += gridSize) {
      this.gridGraphics.moveTo(x, 0);
      this.gridGraphics.lineTo(x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
      this.gridGraphics.moveTo(0, y);
      this.gridGraphics.lineTo(width, y);
    }
    this.gridGraphics.strokePath();

    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      const y = Phaser.Math.Between(50, height - 50);
      const deco = this.add.text(x, y, ['🌿', '🌾', '🪨', '🌸'][i % 4], {
        fontSize: '20px',
      });
      deco.setOrigin(0.5);
      deco.setAlpha(0.6);
    }

    this.renderBuildings();

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.placingBuilding && this.ghostBuilding) {
        const gridSize = 60;
        const gx = Math.floor(pointer.x / gridSize) * gridSize + gridSize / 2;
        const gy = Math.floor(pointer.y / gridSize) * gridSize + gridSize / 2;
        this.ghostBuilding.setPosition(gx, gy);
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.placingBuilding && this.ghostBuilding) {
        const gridSize = 60;
        const gx = Math.floor(pointer.x / gridSize) * gridSize + gridSize / 2;
        const gy = Math.floor(pointer.y / gridSize) * gridSize + gridSize / 2;

        const state = useGameStore.getState();
        const success = state.buildBuilding(this.placingBuilding as any, gx, gy);
        if (success) {
          this.cancelPlacing();
          this.renderBuildings();
        }
      }
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.cancelPlacing();
    });

    this.events.on('startPlacing', (type: string) => {
      this.startPlacing(type);
    });
  }

  startPlacing(type: string) {
    this.cancelPlacing();
    this.placingBuilding = type;
    const config = BUILDINGS[type];
    if (!config) return;

    const container = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 50, 50, 0xffffff, 0.3);
    bg.setStrokeStyle(2, 0xffff00);
    const icon = this.add.text(0, 0, config.icon, { fontSize: '28px' });
    icon.setOrigin(0.5);
    container.add([bg, icon]);
    container.setAlpha(0.6);
    this.ghostBuilding = container;
  }

  cancelPlacing() {
    this.placingBuilding = null;
    if (this.ghostBuilding) {
      this.ghostBuilding.destroy();
      this.ghostBuilding = null;
    }
  }

  renderBuildings() {
    this.buildings.forEach((b) => b.destroy());
    this.buildings.clear();

    const state = useGameStore.getState();

    for (const building of state.buildings) {
      const config = BUILDINGS[building.type];
      if (!config) continue;

      const container = this.add.container(building.x, building.y);
      const bgColor = building.isBuilding ? 0x888888 : 0x5d4037;
      const bg = this.add.rectangle(0, 0, 50, 50, bgColor);
      bg.setStrokeStyle(2, 0x3e2723);
      const icon = this.add.text(0, -5, config.icon, { fontSize: '26px' });
      icon.setOrigin(0.5);
      const levelText = this.add.text(0, 18, `Lv.${building.level}`, {
        fontSize: '11px',
        color: building.isBuilding ? '#ffaa00' : '#ffffff',
      });
      levelText.setOrigin(0.5);

      if (building.isBuilding) {
        const bar = this.add.rectangle(0, 28, 46, 4, 0x000000, 0.5);
        const fill = this.add.rectangle(-23 + (building.buildProgress / 100) * 46, 28, (building.buildProgress / 100) * 46, 4, 0x4caf50);
        fill.setOrigin(0, 0.5);
        container.add([bar, fill]);
      }

      container.add([bg, icon, levelText]);

      container.setSize(50, 50);
      container.setInteractive();
      container.on('pointerover', () => {
        bg.setFillStyle(0x795548);
      });
      container.on('pointerout', () => {
        bg.setFillStyle(building.isBuilding ? 0x888888 : 0x5d4037);
      });
      container.on('pointerdown', () => {
        useGameStore.getState().selectBuilding(building.id);
      });

      this.buildings.set(building.id, container);
    }
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    this.lastTick += dt;

    if (this.lastTick >= 0.5) {
      useGameStore.getState().tick(this.lastTick);
      const selectedId = useGameStore.getState().selectedBuildingId;
      this.renderBuildings();

      if (selectedId && this.buildings.has(selectedId)) {
        const b = this.buildings.get(selectedId)!;
        const bg = b.getAt(0) as Phaser.GameObjects.Rectangle;
        bg.setStrokeStyle(3, 0xffd700);
      }

      this.lastTick = 0;
    }
  }
}
