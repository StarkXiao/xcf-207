import Phaser from 'phaser';
import { useGameStore } from '../store/useGameStore';
import { BUILDINGS } from '../data/buildings';
import { SEASONS, WEATHERS } from '../data/weather';
import { getBuildingGridSize, GRID_SIZE } from '../data/grid';
import type { SeasonType, WeatherType } from '../types';

export class VillageScene extends Phaser.Scene {
  private buildings: Map<string, Phaser.GameObjects.Container> = new Map();
  private placingBuilding: string | null = null;
  private ghostBuilding: Phaser.GameObjects.Container | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private previewGraphics: Phaser.GameObjects.Graphics | null = null;
  private previewInfoText: Phaser.GameObjects.Text | null = null;
  private lastTick: number = 0;
  private background: Phaser.GameObjects.Rectangle | null = null;
  private weatherParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private weatherOverlay: Phaser.GameObjects.Rectangle | null = null;
  private decorations: Phaser.GameObjects.Text[] = [];
  private currentSeason: SeasonType | null = null;
  private currentWeather: WeatherType | null = null;

  constructor() {
    super('VillageScene');
  }

  create() {
    const { width, height } = this.scale;

    this.background = this.add.rectangle(width / 2, height / 2, width, height, 0x3d5c3d);

    this.gridGraphics = this.add.graphics();
    this.gridGraphics.lineStyle(1, 0x2d4a2d, 0.5);
    for (let x = 0; x < width; x += GRID_SIZE) {
      this.gridGraphics.moveTo(x, 0);
      this.gridGraphics.lineTo(x, height);
    }
    for (let y = 0; y < height; y += GRID_SIZE) {
      this.gridGraphics.moveTo(0, y);
      this.gridGraphics.lineTo(width, y);
    }
    this.gridGraphics.strokePath();

    this.previewGraphics = this.add.graphics();
    this.previewGraphics.setDepth(90);

    this.previewInfoText = this.add.text(10, 10, '', {
      fontSize: '13px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 8, y: 6 },
    });
    this.previewInfoText.setDepth(200);
    this.previewInfoText.setVisible(false);

    this.weatherOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
    this.weatherOverlay.setDepth(100);

    this.createDecorations();
    this.updateSeasonVisuals();
    this.updateWeatherVisuals();
    this.renderBuildings();

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.placingBuilding && this.ghostBuilding) {
        const gx = Math.floor(pointer.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const gy = Math.floor(pointer.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        this.ghostBuilding.setPosition(gx, gy);
        this.updatePreview(this.placingBuilding, gx, gy);
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.placingBuilding && this.ghostBuilding) {
        const gx = Math.floor(pointer.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const gy = Math.floor(pointer.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

        const state = useGameStore.getState();
        const validation = state.validatePlacement(this.placingBuilding as any, gx, gy);
        if (validation.valid) {
          const success = state.addToBuildQueue('build', this.placingBuilding as any, gx, gy);
          if (success) {
            this.cancelPlacing();
            this.renderBuildings();
          }
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

  createDecorations() {
    const { width, height } = this.scale;
    this.decorations.forEach(d => d.destroy());
    this.decorations = [];

    const state = useGameStore.getState();
    const seasonDecos: Record<SeasonType, string[]> = {
      spring: ['🌸', '🌿', '🌱', '🦋', '🌼'],
      summer: ['☀️', '🌿', '🌻', '🦗', '🌳'],
      autumn: ['🍂', '🍁', '🌾', '🎃', '🍄'],
      winter: ['❄️', '⛄', '🌨️', '🧊', '🏔️'],
    };

    const decos = seasonDecos[state.season] || seasonDecos.spring;
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      const y = Phaser.Math.Between(50, height - 50);
      const deco = this.add.text(x, y, decos[i % decos.length], {
        fontSize: '20px',
      });
      deco.setOrigin(0.5);
      deco.setAlpha(0.6);
      deco.setDepth(-1);
      this.decorations.push(deco);
    }
  }

  updateSeasonVisuals() {
    const state = useGameStore.getState();
    if (this.currentSeason === state.season) return;
    
    this.currentSeason = state.season;
    const seasonConfig = SEASONS[state.season];
    
    const bgColor = Phaser.Display.Color.HexStringToColor(seasonConfig.bgColor).color;
    if (this.background) {
      this.tweens.add({
        targets: this.background,
        fillColor: bgColor,
        duration: 2000,
        ease: 'Linear',
      });
    }

    if (this.gridGraphics) {
      const gridColor = Phaser.Display.Color.HexStringToColor(seasonConfig.bgColor).color;
      this.gridGraphics.clear();
      this.gridGraphics.lineStyle(1, gridColor, 0.3);
      const gridSize = 60;
      const { width, height } = this.scale;
      for (let x = 0; x < width; x += gridSize) {
        this.gridGraphics.moveTo(x, 0);
        this.gridGraphics.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        this.gridGraphics.moveTo(0, y);
        this.gridGraphics.lineTo(width, y);
      }
      this.gridGraphics.strokePath();
    }

    this.createDecorations();
  }

  updateWeatherVisuals() {
    const state = useGameStore.getState();
    if (this.currentWeather === state.weather) return;
    
    this.currentWeather = state.weather;
    const weatherConfig = WEATHERS[state.weather];
    
    if (this.weatherParticles) {
      this.weatherParticles.stop();
      this.weatherParticles.destroy();
      this.weatherParticles = null;
    }

    if (this.weatherOverlay) {
      this.tweens.add({
        targets: this.weatherOverlay,
        alpha: 0,
        duration: 1000,
        ease: 'Linear',
      });
    }

    if (weatherConfig.particleCount > 0) {
      const { width, height } = this.scale;
      let texture = '❄️';
      let speedY: any = { min: 50, max: 150 };
      let speedX: any = { min: -30, max: 30 };
      let scale: any = { start: 0.5, end: 1 };
      let lifespan = 4000;
      let alpha: any = { start: 1, end: 1 };
      let emitZoneY = -50;
      let emitZoneHeight = 50;
      let speedYSign = 1;

      if (state.weather === 'rainy' || state.weather === 'stormy') {
        texture = '💧';
        speedY = { min: 200, max: 400 };
        speedX = { min: -50, max: 50 };
        scale = { start: 0.3, end: 0.6 };
        lifespan = 1500;
      } else if (state.weather === 'snowy') {
        texture = '❄️';
        speedY = { min: 30, max: 80 };
        speedX = { min: -20, max: 20 };
        scale = { start: 0.4, end: 0.8 };
        lifespan = 6000;
      } else if (state.weather === 'drought') {
        texture = '🔥';
        speedY = { min: 20, max: 50 };
        speedX = { min: -10, max: 10 };
        scale = { start: 0.3, end: 0.5 };
        lifespan = 2000;
        emitZoneY = height;
        emitZoneHeight = 50;
        speedYSign = -1;
      } else if (state.weather === 'foggy') {
        texture = '☁️';
        speedY = { min: 5, max: 15 };
        speedX = { min: 10, max: 30 };
        scale = { start: 1, end: 2 };
        alpha = { start: 0.1, end: 0.3 };
        lifespan = 8000;
      }

      const particles = this.add.particles(0, 0, texture, {
        lifespan,
        speedY: {
          onEmit: () => (Phaser.Math.Between(speedY.min, speedY.max) as number) * speedYSign,
        },
        speedX: {
          onEmit: () => Phaser.Math.Between(speedX.min, speedX.max),
        },
        scale: {
          onEmit: () => Phaser.Math.FloatBetween(scale.start, scale.end),
        },
        alpha: {
          onEmit: () => Phaser.Math.FloatBetween(alpha.start, alpha.end),
        },
        quantity: weatherConfig.particleCount / 10,
        emitZone: {
          type: 'random',
          source: new Phaser.Geom.Rectangle(0, emitZoneY, width, emitZoneHeight) as any,
        },
        deathZone: {
          type: 'onLeave',
          source: new Phaser.Geom.Rectangle(0, -100, width, height + 200) as any,
        },
      });

      particles.setDepth(50);
      this.weatherParticles = particles;
    }

    if (this.weatherOverlay) {
      let overlayAlpha = 0;
      let overlayColor = 0x000000;
      
      if (state.weather === 'stormy') {
        overlayAlpha = 0.3;
        overlayColor = 0x1e3a5f;
      } else if (state.weather === 'foggy') {
        overlayAlpha = 0.25;
        overlayColor = 0x9ca3af;
      } else if (state.weather === 'drought') {
        overlayAlpha = 0.15;
        overlayColor = 0xfbbf24;
      } else if (state.weather === 'snowy') {
        overlayAlpha = 0.1;
        overlayColor = 0xe0f2fe;
      }

      if (overlayAlpha > 0) {
        this.weatherOverlay.setFillStyle(overlayColor);
        this.tweens.add({
          targets: this.weatherOverlay,
          alpha: overlayAlpha,
          duration: 1500,
          ease: 'Linear',
        });
      }
    }
  }

  startPlacing(type: string) {
    this.cancelPlacing();
    this.placingBuilding = type;
    const config = BUILDINGS[type];
    if (!config) return;

    const gridSize = getBuildingGridSize(type as any);
    const width = gridSize.width * GRID_SIZE - 10;
    const height = gridSize.height * GRID_SIZE - 10;

    const container = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, width, height, 0xffffff, 0.3);
    bg.setStrokeStyle(2, 0xffff00);
    const icon = this.add.text(0, 0, config.icon, { fontSize: '28px' });
    icon.setOrigin(0.5);
    container.add([bg, icon]);
    container.setAlpha(0.6);
    this.ghostBuilding = container;

    if (this.previewInfoText) {
      this.previewInfoText.setVisible(true);
    }
  }

  cancelPlacing() {
    this.placingBuilding = null;
    if (this.ghostBuilding) {
      this.ghostBuilding.destroy();
      this.ghostBuilding = null;
    }
    if (this.previewGraphics) {
      this.previewGraphics.clear();
    }
    if (this.previewInfoText) {
      this.previewInfoText.setVisible(false);
    }
  }

  updatePreview(type: string, x: number, y: number) {
    if (!this.previewGraphics) return;
    this.previewGraphics.clear();

    const state = useGameStore.getState();
    const preview = state.getPlacementPreview(type as any, x, y);
    const gridSize = getBuildingGridSize(type as any);

    const fillColor = preview.canPlace.valid ? 0x00ff00 : 0xff0000;
    const fillAlpha = preview.canPlace.valid ? 0.15 : 0.25;

    for (const cell of preview.occupiedCells) {
      const cellX = cell.gx * GRID_SIZE + GRID_SIZE / 2;
      const cellY = cell.gy * GRID_SIZE + GRID_SIZE / 2;
      this.previewGraphics.fillStyle(fillColor, fillAlpha);
      this.previewGraphics.fillRect(cellX - GRID_SIZE / 2 + 2, cellY - GRID_SIZE / 2 + 2, GRID_SIZE - 4, GRID_SIZE - 4);
      this.previewGraphics.lineStyle(2, fillColor, 0.8);
      this.previewGraphics.strokeRect(cellX - GRID_SIZE / 2 + 2, cellY - GRID_SIZE / 2 + 2, GRID_SIZE - 4, GRID_SIZE - 4);
    }

    if (this.ghostBuilding) {
      const bg = this.ghostBuilding.getAt(0) as Phaser.GameObjects.Rectangle;
      if (bg) {
        bg.setStrokeStyle(2, preview.canPlace.valid ? 0x00ff00 : 0xff0000);
      }
    }

    if (this.previewInfoText) {
      const config = BUILDINGS[type];
      let text = `${config?.icon || ''} ${config?.name || type}\n`;
      text += `尺寸: ${gridSize.width}x${gridSize.height}\n`;
      if (!preview.canPlace.valid) {
        text += `❌ ${preview.canPlace.reason || '无法放置'}\n`;
      } else {
        text += `✅ 可以放置\n`;
      }
      if (preview.adjacencyBonus.totalBonusPercent > 0) {
        text += `\n🏆 邻接加成: +${preview.adjacencyBonus.totalBonusPercent}%\n`;
        for (const detail of preview.adjacencyBonus.bonusDetails.slice(0, 3)) {
          text += `  ↳ ${detail.neighborBuildingName}: +${detail.bonusPercent}%\n`;
        }
      } else {
        const rules = config?.adjacencyBonusRules || [];
        if (rules.length > 0) {
          text += `\n💡 邻接加成规则:\n`;
          for (const rule of rules.slice(0, 3)) {
            text += `  ↳ ${rule.description}\n`;
          }
        }
      }
      this.previewInfoText.setText(text.trim());
    }
  }

  renderBuildings() {
    this.buildings.forEach((b) => b.destroy());
    this.buildings.clear();

    const state = useGameStore.getState();

    for (const building of state.buildings) {
      const config = BUILDINGS[building.type];
      if (!config) continue;

      const gridSize = getBuildingGridSize(building.type);
      const width = gridSize.width * GRID_SIZE - 10;
      const height = gridSize.height * GRID_SIZE - 10;

      const container = this.add.container(building.x, building.y);
      const bgColor = building.isBuilding ? 0x888888 : 0x5d4037;
      const bg = this.add.rectangle(0, 0, width, height, bgColor);
      bg.setStrokeStyle(2, 0x3e2723);

      const adjacencyBonus = state.getBuildingAdjacencyBonus(building.id);
      if (adjacencyBonus.totalBonusPercent > 0 && !building.isBuilding) {
        bg.setStrokeStyle(2, 0xffd700);
      }

      const icon = this.add.text(0, -5, config.icon, { fontSize: '26px' });
      icon.setOrigin(0.5);
      const levelText = this.add.text(0, Math.min(18, height / 2 - 8), `Lv.${building.level}`, {
        fontSize: '11px',
        color: building.isBuilding ? '#ffaa00' : '#ffffff',
      });
      levelText.setOrigin(0.5);

      if (adjacencyBonus.totalBonusPercent > 0 && !building.isBuilding) {
        const bonusText = this.add.text(0, -height / 2 + 6, `+${adjacencyBonus.totalBonusPercent}%`, {
          fontSize: '10px',
          color: '#ffd700',
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: { x: 3, y: 1 },
        });
        bonusText.setOrigin(0.5);
        container.add(bonusText);
      }

      if (building.isBuilding) {
        const barWidth = Math.min(width - 4, 60);
        const bar = this.add.rectangle(0, Math.min(28, height / 2 - 4), barWidth, 4, 0x000000, 0.5);
        const fill = this.add.rectangle(-barWidth / 2 + (building.buildProgress / 100) * barWidth, Math.min(28, height / 2 - 4), (building.buildProgress / 100) * barWidth, 4, 0x4caf50);
        fill.setOrigin(0, 0.5);
        container.add([bar, fill]);
      }

      container.add([bg, icon, levelText]);

      container.setSize(width, height);
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
      
      this.updateSeasonVisuals();
      this.updateWeatherVisuals();
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
