<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useGameStore } from './stores/gameStore'
import type { GameClass } from './types/game'
import * as PIXI from 'pixi.js'

const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window

const store = useGameStore()
const pixiContainer = ref<HTMLDivElement | null>(null)
let app: PIXI.Application | null = null

const classes: { type: GameClass; name: string; desc: string }[] = [
  { type: 'warrior', name: '战士', desc: '高生命值，高防御，近战专家' },
  { type: 'mage', name: '法师', desc: '高魔法值，高攻击，低防御' },
  { type: 'rogue', name: '盗贼', desc: '高速度，高幸运，擅长闪避' }
]

const classIcons: Record<GameClass, string> = {
  warrior: '⚔️',
  mage: '🔮',
  rogue: '🗡️'
}

const rarityColors: Record<string, string> = {
  common: '#9d9d9d',
  uncommon: '#1eff00',
  rare: '#0070dd',
  legendary: '#ff8000'
}

let gameSprites: Record<string, PIXI.Graphics> = {}

function initPixi() {
  if (!pixiContainer.value || app) return

  app = new PIXI.Application({
    width: pixiContainer.value.clientWidth,
    height: pixiContainer.value.clientHeight,
    backgroundColor: 0x1a1a2e,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
  })

  pixiContainer.value.appendChild(app.view as HTMLCanvasElement)
  renderMap()
}

function renderMap() {
  if (!app || !store.currentMap) return

  Object.values(gameSprites).forEach(sprite => sprite.destroy())
  gameSprites = {}

  const tileSize = Math.min(
    Math.floor(app!.renderer.width / store.currentMap.width),
    Math.floor(app!.renderer.height / store.currentMap.height),
    48
  )

  const offsetX = (app!.renderer.width - store.currentMap.width * tileSize) / 2
  const offsetY = (app!.renderer.height - store.currentMap.height * tileSize) / 2

  for (let y = 0; y < store.currentMap!.height; y++) {
    for (let x = 0; x < store.currentMap!.width; x++) {
      const tile = store.currentMap!.tiles[y][x]
      const sprite = new PIXI.Graphics()
      const px = offsetX + x * tileSize
      const py = offsetY + y * tileSize

      if (tile.type === 'wall') {
        sprite.beginFill(0x4a4a6a)
        sprite.drawRect(px, py, tileSize, tileSize)
        sprite.endFill()
        sprite.beginFill(0x3a3a5a)
        sprite.drawRect(px + 2, py + 2, tileSize - 4, tileSize - 4)
        sprite.endFill()
      } else if (tile.type === 'floor') {
        sprite.beginFill(0x2a2a4a)
        sprite.drawRect(px, py, tileSize, tileSize)
        sprite.endFill()
        sprite.beginFill(0x3a3a5a, 0.3)
        sprite.drawRect(px + 2, py + 2, tileSize - 4, tileSize - 4)
        sprite.endFill()
      } else if (tile.type === 'start') {
        sprite.beginFill(0x1a1a3a)
        sprite.drawRect(px, py, tileSize, tileSize)
        sprite.endFill()
      } else if (tile.type === 'exit') {
        sprite.beginFill(0x00ff00, 0.3)
        sprite.drawRect(px, py, tileSize, tileSize)
        sprite.endFill()
        sprite.beginFill(0x00aa00)
        sprite.drawRect(px + 4, py + 4, tileSize - 8, tileSize - 8)
        sprite.endFill()
      } else if (tile.type === 'shop') {
        sprite.beginFill(0xffd700, 0.3)
        sprite.drawRect(px, py, tileSize, tileSize)
        sprite.endFill()
        sprite.beginFill(0xffd700)
        sprite.drawRect(px + 4, py + 4, tileSize - 8, tileSize - 8)
        sprite.endFill()
      } else if (tile.type === 'chest') {
        sprite.beginFill(0x8b4513)
        sprite.drawRect(px, py, tileSize, tileSize)
        sprite.endFill()
        sprite.beginFill(0xffd700)
        sprite.drawRect(px + tileSize / 3, py + tileSize / 3, tileSize / 3, tileSize / 3)
        sprite.endFill()
      } else if (tile.type === 'door') {
        sprite.beginFill(0x8b4513)
        sprite.drawRect(px, py, tileSize, tileSize)
        sprite.endFill()
      }

      if (tile.monster) {
        sprite.beginFill(0xff0000)
        sprite.drawCircle(px + tileSize / 2, py + tileSize / 2, tileSize / 3)
        sprite.endFill()
        sprite.beginFill(0x000000)
        sprite.drawRect(px + tileSize / 3, py + tileSize / 3, 4, 4)
        sprite.drawRect(px + tileSize / 2, py + tileSize / 3, 4, 4)
        sprite.endFill()
      }

      if (tile.item && tile.type !== 'chest') {
        sprite.beginFill(0x00ff00)
        sprite.drawRect(px + tileSize / 4, py + tileSize / 4, tileSize / 2, tileSize / 2)
        sprite.endFill()
      }

      app!.stage.addChild(sprite)
      gameSprites[`tile_${x}_${y}`] = sprite
    }
  }

  const playerSprite = new PIXI.Graphics()
  const playerColor = store.player?.gameClass === 'warrior' ? 0x00aaff :
                      store.player?.gameClass === 'mage' ? 0xaa00ff : 0x00ff00
  playerSprite.beginFill(playerColor)
  playerSprite.drawCircle(
    offsetX + store.state.playerPosition.x * tileSize + tileSize / 2,
    offsetY + store.state.playerPosition.y * tileSize + tileSize / 2,
    tileSize / 3
  )
  playerSprite.endFill()
  playerSprite.beginFill(0xffffff)
  playerSprite.drawRect(
    offsetX + store.state.playerPosition.x * tileSize + tileSize / 3,
    offsetY + store.state.playerPosition.y * tileSize + tileSize / 4,
    4, 4
  )
  playerSprite.endFill()
  app!.stage.addChild(playerSprite)
  gameSprites['player'] = playerSprite
}

function handleKeydown(e: KeyboardEvent) {
  if (store.phase !== 'map') return

  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      store.movePlayer(0, -1)
      break
    case 'ArrowDown':
    case 's':
    case 'S':
      store.movePlayer(0, 1)
      break
    case 'ArrowLeft':
    case 'a':
    case 'A':
      store.movePlayer(-1, 0)
      break
    case 'ArrowRight':
    case 'd':
    case 'D':
      store.movePlayer(1, 0)
      break
  }
}

function handleTouch(dx: number, dy: number) {
  if (store.phase === 'map') {
    store.movePlayer(dx, dy)
  }
}

watch(() => store.currentMap, () => {
  if (app && store.currentMap) {
    renderMap()
  }
}, { deep: true })

watch(() => store.state.playerPosition, () => {
  if (app && store.currentMap) {
    renderMap()
  }
}, { deep: true })

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', () => {
    if (app && pixiContainer.value) {
      app.renderer.resize(pixiContainer.value.clientWidth, pixiContainer.value.clientHeight)
      renderMap()
    }
  })

  if (store.phase === 'map') {
    setTimeout(initPixi, 100)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (app) {
    app.destroy(true)
    app = null
  }
})

watch(() => store.phase, (newPhase) => {
  if (newPhase === 'map') {
    setTimeout(initPixi, 100)
  }
})

function getEquipIcon(type: string): string {
  switch (type) {
    case 'weapon': return '⚔️'
    case 'armor': return '🛡️'
    case 'accessory': return '💍'
    default: return '📦'
  }
}
</script>

<template>
  <div class="game-container">
    <div v-if="store.state.notification" class="notification">
      {{ store.state.notification }}
    </div>

    <div v-if="store.phase === 'menu'" class="menu-screen">
      <div class="menu-content">
        <h1 class="game-title">地牢探险</h1>
        <p class="game-subtitle">Dungeon Explorer</p>
        <div class="menu-buttons">
          <button class="menu-btn" @click="store.startNewGame()">开始游戏</button>
          <button class="menu-btn" @click="store.continueGame()">继续游戏</button>
        </div>
      </div>
      <div class="menu-footer">
        <p>使用方向键/WASD移动 | 点击按钮进行战斗</p>
      </div>
    </div>

    <div v-if="store.phase === 'class-select'" class="class-select-screen">
      <h2 class="screen-title">选择你的职业</h2>
      <div class="class-grid">
        <div
          v-for="cls in classes"
          :key="cls.type"
          class="class-card"
          @click="store.selectClass(cls.type)"
        >
          <div class="class-icon">{{ classIcons[cls.type] }}</div>
          <h3>{{ cls.name }}</h3>
          <p>{{ cls.desc }}</p>
        </div>
      </div>
    </div>

    <div v-if="store.phase === 'map'" class="map-screen">
      <div class="game-header">
        <div class="player-info">
          <span class="player-level">Lv.{{ store.player?.level }}</span>
          <span class="player-class">{{ classIcons[store.player?.gameClass || 'warrior'] }}</span>
          <span class="player-gold">💰 {{ store.player?.gold }}</span>
        </div>
        <div class="floor-indicator">第 {{ store.currentMap?.floor }} 层</div>
      </div>

      <div ref="pixiContainer" class="pixi-container"></div>

      <div class="mobile-controls" v-if="isTouchDevice">
        <div class="control-row">
          <button class="control-btn" @touchstart.prevent="handleTouch(0, -1)">⬆️</button>
        </div>
        <div class="control-row">
          <button class="control-btn" @touchstart.prevent="handleTouch(-1, 0)">⬅️</button>
          <button class="control-btn" @touchstart.prevent="store.openInventory()">🎒</button>
          <button class="control-btn" @touchstart.prevent="handleTouch(1, 0)">➡️</button>
        </div>
        <div class="control-row">
          <button class="control-btn" @touchstart.prevent="handleTouch(0, 1)">⬇️</button>
        </div>
      </div>

      <div class="map-legend">
        <span>🟢 玩家</span>
        <span>🔴 怪物</span>
        <span>🟡 商店</span>
        <span>🟢 出口</span>
        <span>📦 宝箱</span>
      </div>
    </div>

    <div v-if="store.phase === 'battle'" class="battle-screen">
      <div class="battle-header">
        <h2>战斗！</h2>
      </div>

      <div class="battle-arena" v-if="store.getCurrentMonster()">
        <div class="monster-section">
          <div class="monster-info">
            <h3>{{ store.getCurrentMonster()?.name }}</h3>
            <p>等级 {{ store.getCurrentMonster()?.level }}</p>
          </div>
          <div class="hp-bar-container">
            <div class="hp-bar" :style="{ width: (store.getCurrentMonster()!.hp / store.getCurrentMonster()!.maxHp * 100) + '%' }"></div>
            <span class="hp-text">{{ store.getCurrentMonster()?.hp }} / {{ store.getCurrentMonster()?.maxHp }}</span>
          </div>
        </div>

        <div class="battle-divider">VS</div>

        <div class="player-battle-section">
          <div class="player-battle-info">
            <h3>{{ store.player?.name || '冒险者' }}</h3>
            <p>Lv.{{ store.player?.level }}</p>
          </div>
          <div class="hp-bar-container">
            <div class="hp-bar player-hp" :style="{ width: (store.player!.stats.hp / store.player!.stats.maxHp * 100) + '%' }"></div>
            <span class="hp-text">{{ store.player?.stats.hp }} / {{ store.player?.stats.maxHp }}</span>
          </div>
          <div class="mp-bar-container">
            <div class="mp-bar" :style="{ width: (store.player!.stats.mp / store.player!.stats.maxMp * 100) + '%' }"></div>
            <span class="mp-text">{{ store.player?.stats.mp }} / {{ store.player?.stats.maxMp }}</span>
          </div>
        </div>
      </div>

      <div class="battle-log">
        <p v-for="(log, idx) in store.state.battleLog.slice(-5)" :key="idx">{{ log }}</p>
      </div>

      <div class="battle-actions">
        <button class="battle-btn attack-btn" @click="store.attackMonster()">攻击 ⚔️</button>
        <button class="battle-btn item-btn" @click="store.openInventory()">物品 🎒</button>
        <button class="battle-btn flee-btn" @click="store.flee()">逃跑 🏃</button>
      </div>

      <div v-if="store.state.battleLog.includes('你被击败了...')" class="game-over-overlay">
        <div class="game-over-content">
          <h2>💀 游戏结束 💀</h2>
          <p>你被击败了...</p>
          <p>获得了 {{ store.player?.level }} 级</p>
          <button class="menu-btn" @click="store.restartGame()">返回主菜单</button>
        </div>
      </div>
    </div>

    <div v-if="store.phase === 'shop'" class="shop-screen">
      <div class="shop-header">
        <h2>🏪 商店</h2>
        <button class="back-btn" @click="store.returnToMap()">返回地图</button>
      </div>

      <div class="player-gold-display">
        💰 {{ store.player?.gold }} 金币
      </div>

      <div class="shop-section">
        <h3>购买物品</h3>
        <div class="shop-grid">
          <div
            v-for="item in store.state.shopInventory"
            :key="item.id"
            class="shop-item"
            @click="store.buyItem(item)"
          >
            <div class="item-name">{{ item.name }}</div>
            <div class="item-desc">{{ item.description }}</div>
            <div class="item-price">{{ 20 + item.value * 2 }} 💰</div>
          </div>
        </div>
      </div>

      <div class="shop-section">
        <h3>出售装备</h3>
        <div class="equipment-sell-grid">
          <div
            v-for="equip in store.player?.equipment"
            :key="equip.id"
            class="shop-item sell-item"
            :style="{ borderColor: rarityColors[equip.rarity] }"
            @click="store.sellEquipment(equip)"
          >
            <div class="item-icon">{{ getEquipIcon(equip.type) }}</div>
            <div class="item-name" :style="{ color: rarityColors[equip.rarity] }">{{ equip.name }}</div>
            <div class="item-stats">
              <span v-if="equip.attack">⚔️ {{ equip.attack }}</span>
              <span v-if="equip.defense">🛡️ {{ equip.defense }}</span>
              <span v-if="equip.hp">❤️ {{ equip.hp }}</span>
            </div>
            <div class="item-price">出售: {{ 30 + (equip.attack || 0) * 5 + (equip.defense || 0) * 5 }} 💰</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="store.phase === 'inventory'" class="inventory-screen">
      <div class="inventory-header">
        <h2>🎒 背包</h2>
        <button class="back-btn" @click="store.returnToMap()">返回</button>
      </div>

      <div class="player-stats-display">
        <div class="stat-row">
          <span>生命:</span>
          <div class="stat-bar">
            <div class="stat-fill hp" :style="{ width: (store.player!.stats.hp / store.player!.stats.maxHp * 100) + '%' }"></div>
          </div>
          <span>{{ store.player?.stats.hp }}/{{ store.player?.stats.maxHp }}</span>
        </div>
        <div class="stat-row">
          <span>魔法:</span>
          <div class="stat-bar">
            <div class="stat-fill mp" :style="{ width: (store.player!.stats.mp / store.player!.stats.maxMp * 100) + '%' }"></div>
          </div>
          <span>{{ store.player?.stats.mp }}/{{ store.player?.stats.maxMp }}</span>
        </div>
        <div class="stat-row">
          <span>攻击:</span>
          <span>{{ store.player?.stats.attack }}</span>
        </div>
        <div class="stat-row">
          <span>防御:</span>
          <span>{{ store.player?.stats.defense }}</span>
        </div>
        <div class="stat-row">
          <span>速度:</span>
          <span>{{ store.player?.stats.speed }}</span>
        </div>
        <div class="stat-row">
          <span>幸运:</span>
          <span>{{ store.player?.stats.luck }}</span>
        </div>
      </div>

      <div class="equipment-display">
        <h3>已装备</h3>
        <div class="equip-grid">
          <div
            v-for="equip in store.player?.equipment"
            :key="equip.id"
            class="equipped-item"
            :style="{ borderColor: rarityColors[equip.rarity] }"
          >
            <div class="item-icon">{{ getEquipIcon(equip.type) }}</div>
            <div class="item-name" :style="{ color: rarityColors[equip.rarity] }">{{ equip.name }}</div>
          </div>
          <div v-if="!store.player?.equipment.length" class="empty-slot">空</div>
        </div>
      </div>

      <div class="items-display">
        <h3>物品</h3>
        <div class="items-grid">
          <div
            v-for="item in store.player?.inventory"
            :key="item.id"
            class="item-card"
            @click="store.useItem(item)"
          >
            <div class="item-name">{{ item.name }}</div>
            <div class="item-desc">{{ item.description }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 10px 20px;
  border-radius: 20px;
  z-index: 1000;
  font-size: 14px;
  animation: fadeInOut 2s ease-in-out;
}

@keyframes fadeInOut {
  0%, 100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  10%, 90% { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.menu-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: radial-gradient(circle at center, #2a2a4a 0%, #1a1a2e 100%);
}

.menu-content {
  text-align: center;
}

.game-title {
  font-size: 48px;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  margin-bottom: 10px;
}

.game-subtitle {
  font-size: 18px;
  color: #888;
  margin-bottom: 40px;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.menu-btn {
  padding: 15px 40px;
  font-size: 18px;
  border: 2px solid #ffd700;
  background: transparent;
  color: #ffd700;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 200px;
}

.menu-btn:hover {
  background: #ffd700;
  color: #1a1a2e;
}

.menu-footer {
  position: absolute;
  bottom: 20px;
  color: #666;
  font-size: 12px;
}

.class-select-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.screen-title {
  font-size: 28px;
  color: #ffd700;
  margin-bottom: 30px;
  margin-top: 20px;
}

.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  max-width: 600px;
  width: 100%;
}

.class-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid #444;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.class-card:hover {
  border-color: #ffd700;
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(255, 215, 0, 0.2);
}

.class-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.class-card h3 {
  color: #fff;
  margin-bottom: 8px;
}

.class-card p {
  color: #888;
  font-size: 12px;
}

.map-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: rgba(0, 0, 0, 0.5);
}

.player-info {
  display: flex;
  gap: 15px;
  align-items: center;
}

.player-level, .player-class, .player-gold {
  color: #ffd700;
  font-size: 16px;
}

.floor-indicator {
  color: #00ff00;
  font-size: 14px;
}

.pixi-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.mobile-controls {
  display: none;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: rgba(0, 0, 0, 0.7);
}

@media (pointer: coarse) {
  .mobile-controls {
    display: flex;
  }
}

.control-row {
  display: flex;
  gap: 10px;
}

.control-btn {
  width: 60px;
  height: 60px;
  font-size: 24px;
  border: 2px solid #ffd700;
  background: rgba(255, 215, 0, 0.2);
  border-radius: 12px;
  cursor: pointer;
}

.map-legend {
  display: flex;
  justify-content: center;
  gap: 15px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.5);
  color: #888;
  font-size: 12px;
}

.battle-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  position: relative;
}

.battle-header {
  text-align: center;
  margin-bottom: 20px;
}

.battle-header h2 {
  font-size: 32px;
  color: #ff4444;
  text-shadow: 0 0 20px rgba(255, 68, 68, 0.5);
}

.battle-arena {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
}

.monster-section, .player-battle-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
}

.monster-info h3, .player-battle-info h3 {
  color: #fff;
  margin-bottom: 5px;
}

.monster-info p, .player-battle-info p {
  color: #888;
  font-size: 14px;
}

.battle-divider {
  text-align: center;
  font-size: 24px;
  color: #ffd700;
  font-weight: bold;
}

.hp-bar-container, .mp-bar-container {
  position: relative;
  height: 24px;
  background: #333;
  border-radius: 12px;
  overflow: hidden;
  margin-top: 10px;
}

.hp-bar {
  height: 100%;
  background: linear-gradient(90deg, #ff4444, #ff6666);
  transition: width 0.3s;
}

.hp-bar.player-hp {
  background: linear-gradient(90deg, #44ff44, #66ff66);
}

.mp-bar {
  height: 100%;
  background: linear-gradient(90deg, #4444ff, #6666ff);
  transition: width 0.3s;
}

.hp-text, .mp-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 12px;
  text-shadow: 1px 1px 2px #000;
}

.battle-log {
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  padding: 15px;
  margin: 20px 0;
  max-height: 120px;
  overflow-y: auto;
}

.battle-log p {
  color: #aaa;
  font-size: 14px;
  margin-bottom: 5px;
}

.battle-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.battle-btn {
  padding: 15px 25px;
  font-size: 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  flex: 1;
  max-width: 120px;
}

.attack-btn {
  background: #ff4444;
  color: #fff;
}

.item-btn {
  background: #4444ff;
  color: #fff;
}

.flee-btn {
  background: #888;
  color: #fff;
}

.battle-btn:hover {
  transform: scale(1.05);
}

.game-over-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
}

.game-over-content {
  text-align: center;
}

.game-over-content h2 {
  font-size: 36px;
  color: #ff4444;
  margin-bottom: 20px;
}

.game-over-content p {
  color: #888;
  margin-bottom: 10px;
}

.shop-screen, .inventory-screen {
  width: 100%;
  height: 100%;
  padding: 20px;
  overflow-y: auto;
}

.shop-header, .inventory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.shop-header h2, .inventory-header h2 {
  color: #ffd700;
  font-size: 24px;
}

.back-btn {
  padding: 10px 20px;
  background: transparent;
  border: 2px solid #888;
  color: #888;
  border-radius: 8px;
  cursor: pointer;
}

.back-btn:hover {
  border-color: #ffd700;
  color: #ffd700;
}

.player-gold-display {
  text-align: center;
  font-size: 20px;
  color: #ffd700;
  margin-bottom: 20px;
}

.shop-section {
  margin-bottom: 30px;
}

.shop-section h3 {
  color: #888;
  margin-bottom: 15px;
  font-size: 16px;
}

.shop-grid, .equipment-sell-grid, .items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 15px;
}

.shop-item, .item-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid #444;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s;
}

.shop-item:hover, .item-card:hover {
  border-color: #ffd700;
  transform: translateY(-3px);
}

.item-name {
  color: #fff;
  font-weight: bold;
  margin-bottom: 5px;
}

.item-desc {
  color: #888;
  font-size: 12px;
  margin-bottom: 8px;
}

.item-price {
  color: #ffd700;
  font-size: 14px;
}

.item-stats {
  display: flex;
  gap: 8px;
  color: #aaa;
  font-size: 12px;
  margin-bottom: 5px;
}

.player-stats-display {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  color: #888;
}

.stat-bar {
  flex: 1;
  height: 16px;
  background: #333;
  border-radius: 8px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  transition: width 0.3s;
}

.stat-fill.hp {
  background: linear-gradient(90deg, #44ff44, #66ff66);
}

.stat-fill.mp {
  background: linear-gradient(90deg, #4444ff, #6666ff);
}

.equipment-display, .items-display {
  margin-bottom: 20px;
}

.equipment-display h3, .items-display h3 {
  color: #888;
  margin-bottom: 15px;
}

.equip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}

.equipped-item {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
}

.item-icon {
  font-size: 24px;
  margin-bottom: 5px;
}

.empty-slot {
  background: rgba(255, 255, 255, 0.02);
  border: 2px dashed #444;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  color: #444;
}

@media (max-width: 600px) {
  .game-title {
    font-size: 32px;
  }

  .class-grid {
    grid-template-columns: 1fr;
  }

  .battle-actions {
    flex-wrap: wrap;
  }

  .battle-btn {
    min-width: 100px;
  }

  .shop-grid, .equipment-sell-grid, .items-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .map-legend {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>