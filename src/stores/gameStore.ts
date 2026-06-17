import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { 
  GameState,
  MapTile, 
  Monster, 
  Equipment, 
  Item,
  PlayerStats,
  GameClass
} from '../types/game'

const CLASS_STATS: Record<GameClass, PlayerStats> = {
  warrior: {
    hp: 120, maxHp: 120, mp: 30, maxMp: 30,
    attack: 15, defense: 12, speed: 8, luck: 5
  },
  mage: {
    hp: 70, maxHp: 70, mp: 80, maxMp: 80,
    attack: 8, defense: 5, speed: 10, luck: 7
  },
  rogue: {
    hp: 90, maxHp: 90, mp: 50, maxMp: 50,
    attack: 12, defense: 8, speed: 15, luck: 12
  }
}

const MONSTER_TEMPLATES: Monster[] = [
  { id: 'slime', name: '史莱姆', level: 1, hp: 30, maxHp: 30, attack: 5, defense: 2, exp: 15, gold: 10, sprite: 'slime', skills: [] },
  { id: 'goblin', name: '哥布林', level: 2, hp: 45, maxHp: 45, attack: 8, defense: 4, exp: 25, gold: 18, sprite: 'goblin', skills: [] },
  { id: 'skeleton', name: '骷髅战士', level: 3, hp: 60, maxHp: 60, attack: 12, defense: 8, exp: 40, gold: 28, sprite: 'skeleton', skills: ['反击'] },
  { id: 'orc', name: '兽人', level: 4, hp: 80, maxHp: 80, attack: 15, defense: 10, exp: 55, gold: 38, sprite: 'orc', skills: ['狂暴'] },
  { id: 'darkKnight', name: '黑暗骑士', level: 5, hp: 100, maxHp: 100, attack: 20, defense: 15, exp: 80, gold: 55, sprite: 'darkknight', skills: ['暗斩'] },
  { id: 'dragon', name: '幼龙', level: 6, hp: 150, maxHp: 150, attack: 25, defense: 18, exp: 120, gold: 80, sprite: 'dragon', skills: ['火焰吐息'] }
]

const EQUIPMENT_TEMPLATES: Equipment[] = [
  { id: 'wp1', name: '铁剑', type: 'weapon', rarity: 'common', attack: 5 },
  { id: 'wp2', name: '火焰剑', type: 'weapon', rarity: 'rare', attack: 12 },
  { id: 'wp3', name: '霜之哀伤', type: 'weapon', rarity: 'legendary', attack: 20, luck: 5 },
  { id: 'ar1', name: '皮甲', type: 'armor', rarity: 'common', defense: 3 },
  { id: 'ar2', name: '锁甲', type: 'armor', rarity: 'uncommon', defense: 6 },
  { id: 'ar3', name: '龙鳞甲', type: 'armor', rarity: 'legendary', defense: 15, hp: 30 },
  { id: 'ac1', name: '幸运符', type: 'accessory', rarity: 'uncommon', luck: 5 },
  { id: 'ac2', name: '速度之靴', type: 'accessory', rarity: 'rare', speed: 5 },
  { id: 'ac3', name: '生命戒指', type: 'accessory', rarity: 'rare', hp: 25, defense: 3 }
]

const ITEM_TEMPLATES: Item[] = [
  { id: 'hp1', name: '生命药水', type: 'potion', effect: 'hp', value: 30, description: '恢复30点生命' },
  { id: 'hp2', name: '高级生命药水', type: 'potion', effect: 'hp', value: 60, description: '恢复60点生命' },
  { id: 'mp1', name: '魔法药水', type: 'potion', effect: 'mp', value: 20, description: '恢复20点魔法' },
  { id: 'mp2', name: '高级魔法药水', type: 'potion', effect: 'mp', value: 40, description: '恢复40点魔法' },
  { id: 'buf1', name: '力量药水', type: 'potion', effect: 'buff', value: 5, description: '攻击+5，持续3回合' },
  { id: 'key1', name: '钥匙', type: 'key', effect: 'buff', value: 0, description: '打开锁住的门' }
]

const SHOP_ITEMS: Item[] = [
  { id: 'shop_hp1', name: '生命药水', type: 'potion', effect: 'hp', value: 30, description: '恢复30点生命', },
  { id: 'shop_mp1', name: '魔法药水', type: 'potion', effect: 'mp', value: 20, description: '恢复20点魔法' },
  { id: 'shop_hp2', name: '高级生命药水', type: 'potion', effect: 'hp', value: 60, description: '恢复60点生命' },
  { id: 'shop_buf1', name: '力量药水', type: 'potion', effect: 'buff', value: 5, description: '攻击+5，持续3回合' }
]

export const useGameStore = defineStore('game', () => {
  const state = ref<GameState>({
    phase: 'menu',
    player: null,
    currentMap: null,
    playerPosition: { x: 0, y: 0 },
    battleLog: [],
    shopInventory: [],
    notification: null
  })

  const player = computed(() => state.value.player)
  const phase = computed(() => state.value.phase)
  const currentMap = computed(() => state.value.currentMap)

  function showNotification(msg: string, duration = 2000) {
    state.value.notification = msg
    setTimeout(() => {
      state.value.notification = null
    }, duration)
  }

  function startNewGame() {
    state.value.phase = 'class-select'
  }

  function selectClass(gameClass: GameClass) {
    const baseStats = CLASS_STATS[gameClass]
    state.value.player = {
      name: '',
      gameClass,
      level: 1,
      exp: 0,
      expToNext: 100,
      gold: 100,
      stats: { ...baseStats },
      equipment: [],
      inventory: [
        { ...ITEM_TEMPLATES[0] },
        { ...ITEM_TEMPLATES[2] }
      ]
    }
    state.value.phase = 'map'
    generateMap(1)
    saveGame()
  }

  function generateMap(floor: number) {
    const width = 12
    const height = 10
    const tiles: MapTile[][] = []

    for (let y = 0; y < height; y++) {
      tiles[y] = []
      for (let x = 0; x < width; x++) {
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          tiles[y][x] = { type: 'wall', x, y, explored: false }
        } else if (Math.random() < 0.2) {
          tiles[y][x] = { type: 'wall', x, y, explored: false }
        } else {
          tiles[y][x] = { type: 'floor', x, y, explored: false }
        }
      }
    }

    const startX = 1
    const startY = 1
    tiles[startY][startX] = { type: 'start', x: startX, y: startY, explored: true }
    state.value.playerPosition = { x: startX, y: startY }

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (tiles[y][x].type === 'floor' && Math.random() < 0.15) {
          const monsterLevel = Math.min(floor + Math.floor(Math.random() * 2), MONSTER_TEMPLATES.length)
          const monster = MONSTER_TEMPLATES[Math.floor(Math.random() * monsterLevel)]
          const newMonster = {
            ...monster,
            id: `mon_${Date.now()}_${Math.random()}`,
            level: monsterLevel,
            hp: monster.hp + floor * 5,
            maxHp: monster.maxHp + floor * 5
          }
          tiles[y][x].monster = newMonster
        }
      }
    }

    const chestPositions: { x: number, y: number }[] = []
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (tiles[y][x].type === 'floor' && Math.random() < 0.1) {
          chestPositions.push({ x, y })
        }
      }
    }
    chestPositions.slice(0, 2).forEach(pos => {
      const equip = EQUIPMENT_TEMPLATES[Math.floor(Math.random() * EQUIPMENT_TEMPLATES.length)]
      tiles[pos.y][pos.x].item = { ...equip, id: `eq_${Date.now()}` }
      tiles[pos.y][pos.x].type = 'chest'
    })

    const exitX = width - 2
    const exitY = height - 2
    tiles[exitY][exitX] = { type: 'exit', x: exitX, y: exitY, explored: false }

    const shopX = Math.floor(width / 2)
    const shopY = 1
    tiles[shopY][shopX] = { type: 'shop', x: shopX, y: shopY, explored: true }

    state.value.currentMap = { width, height, tiles, floor }
    state.value.shopInventory = SHOP_ITEMS.map(item => ({ ...item, id: `shop_${Date.now()}_${Math.random()}` }))
  }

  function movePlayer(dx: number, dy: number) {
    if (state.value.phase !== 'map' || !state.value.currentMap) return

    const newX = state.value.playerPosition.x + dx
    const newY = state.value.playerPosition.y + dy
    const tile = state.value.currentMap.tiles[newY]?.[newX]

    if (!tile) return
    if (tile.type === 'wall') return

    if (tile.type === 'door' || tile.type === 'chest') {
      const keyItem = state.value.player?.inventory.find(i => i.type === 'key')
      if (keyItem) {
        state.value.player!.inventory = state.value.player!.inventory.filter(i => i.id !== keyItem.id)
        tile.type = 'floor'
        if (tile.item) {
          pickupItem(tile.item)
          tile.item = undefined
        }
        showNotification('使用钥匙打开了门/宝箱！')
      } else {
        showNotification('需要钥匙才能打开！')
        return
      }
    }

    if (tile.monster) {
      state.value.phase = 'battle'
      state.value.battleLog = [`遇到了 ${tile.monster.name}！`]
      return
    }

    if (tile.type === 'shop') {
      state.value.phase = 'shop'
      return
    }

    if (tile.type === 'exit') {
      const nextFloor = (state.value.currentMap?.floor || 1) + 1
      showNotification(`进入第 ${nextFloor} 层地牢！`)
      generateMap(nextFloor)
      return
    }

    if (tile.item) {
      pickupItem(tile.item)
      tile.item = undefined
    }

    state.value.playerPosition = { x: newX, y: newY }
    tile.explored = true
    state.value.currentMap.tiles[newY][newX].type = 'floor'
    saveGame()
  }

  function pickupItem(item: Equipment | Item) {
    if (!state.value.player) return

    if ('rarity' in item) {
      const existing = state.value.player.equipment.find(e => e.type === item.type)
      if (existing) {
        state.value.player.equipment = state.value.player.equipment.filter(e => e.id !== existing.id)
        showNotification(`获得 ${item.name}，替换了 ${existing.name}`)
      } else {
        showNotification(`获得装备 ${item.name}！`)
      }
      state.value.player.equipment.push(item)
      applyEquipmentBonus()
    } else {
      state.value.player.inventory.push({ ...item, id: `item_${Date.now()}` })
      showNotification(`获得物品 ${item.name}！`)
    }
    saveGame()
  }

  function applyEquipmentBonus() {
    if (!state.value.player) return
    const baseStats = CLASS_STATS[state.value.player.gameClass]

    let totalAttack = baseStats.attack
    let totalDefense = baseStats.defense
    let totalHp = baseStats.hp
    let totalMp = baseStats.mp
    let totalSpeed = baseStats.speed
    let totalLuck = baseStats.luck

    state.value.player.equipment.forEach(eq => {
      totalAttack += eq.attack || 0
      totalDefense += eq.defense || 0
      totalHp += eq.hp || 0
      totalMp += eq.mp || 0
      totalSpeed += eq.speed || 0
      totalLuck += eq.luck || 0
    })

    state.value.player.stats = {
      hp: totalHp,
      maxHp: totalHp,
      mp: totalMp,
      maxMp: totalMp,
      attack: totalAttack,
      defense: totalDefense,
      speed: totalSpeed,
      luck: totalLuck
    }
  }

  function attackMonster() {
    if (!state.value.player || !state.value.currentMap) return

    const monster = getCurrentMonster()
    if (!monster) return

    const playerDmg = Math.max(1, state.value.player.stats.attack - monster.defense / 2 + Math.floor(Math.random() * 5))
    monster.hp -= playerDmg
    state.value.battleLog.push(`你对 ${monster.name} 造成 ${playerDmg} 点伤害`)

    if (monster.hp <= 0) {
      state.value.battleLog.push(`击败了 ${monster.name}！`)
      const expGain = monster.exp
      const goldGain = monster.gold + Math.floor(Math.random() * 20)
      state.value.player.exp += expGain
      state.value.player.gold += goldGain
      state.value.battleLog.push(`获得 ${expGain} 经验，${goldGain} 金币`)

      if (Math.random() < 0.3) {
        const dropEquip = EQUIPMENT_TEMPLATES[Math.floor(Math.random() * EQUIPMENT_TEMPLATES.length)]
        pickupItem({ ...dropEquip, id: `drop_${Date.now()}` })
        state.value.battleLog.push(`战利品：${dropEquip.name}`)
      }

      const pos = state.value.playerPosition
      state.value.currentMap.tiles[pos.y][pos.x].monster = undefined
      checkLevelUp()
      state.value.phase = 'map'
      saveGame()
      return
    }

    monsterAttack()
  }

  function monsterAttack() {
    if (!state.value.player) return
    const monster = getCurrentMonster()
    if (!monster) return

    const monsterDmg = Math.max(1, monster.attack - state.value.player.stats.defense / 2 + Math.floor(Math.random() * 3))
    state.value.player.stats.hp -= monsterDmg
    state.value.battleLog.push(`${monster.name} 对你造成 ${monsterDmg} 点伤害`)

    if (state.value.player.stats.hp <= 0) {
      state.value.player.stats.hp = 0
      state.value.phase = 'game-over'
      state.value.battleLog.push('你被击败了...')
      clearSave()
    }
  }

  function useItem(item: Item) {
    if (!state.value.player) return

    if (item.effect === 'hp') {
      state.value.player.stats.hp = Math.min(state.value.player.stats.maxHp, state.value.player.stats.hp + item.value)
      showNotification(`恢复了 ${item.value} 点生命`)
    } else if (item.effect === 'mp') {
      state.value.player.stats.mp = Math.min(state.value.player.stats.maxMp, state.value.player.stats.mp + item.value)
      showNotification(`恢复了 ${item.value} 点魔法`)
    } else if (item.effect === 'buff') {
      state.value.player.stats.attack += item.value
      showNotification(`攻击临时提升 ${item.value}`)
    }

    state.value.player.inventory = state.value.player.inventory.filter(i => i.id !== item.id)
    saveGame()
  }

  function flee() {
    if (!state.value.player || Math.random() > state.value.player.stats.speed / 30) {
      state.value.battleLog.push('逃跑失败！')
      monsterAttack()
    } else {
      state.value.battleLog.push('成功逃跑！')
      state.value.phase = 'map'
    }
  }

  function checkLevelUp() {
    if (!state.value.player) return

    while (state.value.player.exp >= state.value.player.expToNext) {
      state.value.player.exp -= state.value.player.expToNext
      state.value.player.level++
      state.value.player.expToNext = Math.floor(state.value.player.expToNext * 1.5)

      const levelBonus = state.value.player.level * 5
      state.value.player.stats.maxHp += 10 + levelBonus
      state.value.player.stats.maxMp += 5 + levelBonus
      state.value.player.stats.hp = state.value.player.stats.maxHp
      state.value.player.stats.mp = state.value.player.stats.maxMp
      state.value.player.stats.attack += 3
      state.value.player.stats.defense += 2
      state.value.player.stats.speed += 1

      showNotification(`升级了！现在是 ${state.value.player.level} 级`)
    }
  }

  function buyItem(item: Item) {
    if (!state.value.player) return
    const price = 20 + item.value

    if (state.value.player.gold < price) {
      showNotification('金币不足！')
      return
    }

    state.value.player.gold -= price
    state.value.player.inventory.push({ ...item, id: `item_${Date.now()}` })
    showNotification(`购买了 ${item.name}！`)
    saveGame()
  }

  function sellEquipment(equip: Equipment) {
    if (!state.value.player) return
    const price = 30 + (equip.attack || 0) * 5 + (equip.defense || 0) * 5

    state.value.player.gold += price
    state.value.player.equipment = state.value.player.equipment.filter(e => e.id !== equip.id)
    applyEquipmentBonus()
    showNotification(`出售了 ${equip.name}，获得 ${price} 金币`)
    saveGame()
  }

  function getCurrentMonster(): Monster | null {
    if (!state.value.currentMap) return null
    const pos = state.value.playerPosition
    return state.value.currentMap.tiles[pos.y][pos.x].monster || null
  }

  function returnToMap() {
    state.value.phase = 'map'
  }

  function openInventory() {
    state.value.phase = 'inventory'
  }

  function saveGame() {
    if (!state.value.player) return
    const saveData = {
      player: state.value.player,
      map: state.value.currentMap,
      position: state.value.playerPosition
    }
    localStorage.setItem('dungeon_save', JSON.stringify(saveData))
  }

  function loadGame() {
    const saveData = localStorage.getItem('dungeon_save')
    if (!saveData) return false

    try {
      const data = JSON.parse(saveData)
      state.value.player = data.player
      state.value.currentMap = data.map
      state.value.playerPosition = data.position
      state.value.phase = 'map'
      return true
    } catch {
      return false
    }
  }

  function clearSave() {
    localStorage.removeItem('dungeon_save')
  }

  function continueGame() {
    if (loadGame()) {
      showNotification('游戏已加载')
    } else {
      showNotification('没有找到存档')
    }
  }

  function restartGame() {
    clearSave()
    state.value.player = null
    state.value.currentMap = null
    state.value.phase = 'menu'
  }

  return {
    state,
    player,
    phase,
    currentMap,
    showNotification,
    startNewGame,
    selectClass,
    movePlayer,
    attackMonster,
    monsterAttack,
    useItem,
    flee,
    buyItem,
    sellEquipment,
    returnToMap,
    openInventory,
    saveGame,
    loadGame,
    continueGame,
    restartGame,
    getCurrentMonster
  }
})