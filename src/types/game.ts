export type GameClass = 'warrior' | 'mage' | 'rogue'

export interface PlayerStats {
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  attack: number
  defense: number
  speed: number
  luck: number
}

export interface Player {
  name: string
  gameClass: GameClass
  level: number
  exp: number
  expToNext: number
  gold: number
  stats: PlayerStats
  equipment: Equipment[]
  inventory: Item[]
}

export interface Equipment {
  id: string
  name: string
  type: 'weapon' | 'armor' | 'accessory'
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
  attack?: number
  defense?: number
  hp?: number
  mp?: number
  speed?: number
  luck?: number
  sprite?: string
}

export interface Item {
  id: string
  name: string
  type: 'potion' | 'scroll' | 'key'
  effect: 'hp' | 'mp' | 'buff'
  value: number
  description: string
}

export interface Monster {
  id: string
  name: string
  level: number
  hp: number
  maxHp: number
  attack: number
  defense: number
  exp: number
  gold: number
  sprite: string
  skills: string[]
}

export interface MapTile {
  type: 'floor' | 'wall' | 'door' | 'chest' | 'exit' | 'shop' | 'start'
  x: number
  y: number
  explored: boolean
  monster?: Monster
  item?: Equipment | Item
}

export interface GameMap {
  width: number
  height: number
  tiles: MapTile[][]
  floor: number
}

export type GamePhase = 
  | 'menu' 
  | 'class-select' 
  | 'map' 
  | 'battle' 
  | 'shop' 
  | 'inventory' 
  | 'game-over' 
  | 'victory'

export interface GameState {
  phase: GamePhase
  player: Player | null
  currentMap: GameMap | null
  playerPosition: { x: number, y: number }
  battleLog: string[]
  shopInventory: Item[]
  notification: string | null
}