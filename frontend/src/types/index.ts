export type View = 'auth' | 'menu' | 'game' | 'leaderboard' | 'wiki'

export interface User {
  id: string
  pseudo: string
}

export interface PlacedTower {
  tower_type_id: string
  tower_name: string
  x: number
  y: number
  damage: number
  scope: number
  attack_speed: number
  level: number
}

export interface ActiveEnemy {
  enemy_type_id: string
  enemy_name: string
  current_hp: number
  max_hp: number
  speed: number
  armor: number
  reward_or: number
  is_boss: boolean
  alive: boolean
}

export interface GameStateResponse {
  wave: number
  gold: number
  score: number
  lives: number
  towers: PlacedTower[]
  enemies: ActiveEnemy[]
  is_over: boolean
}

export interface EnemyKillDetail {
  enemy_name: string
  reward_or: number
  score_gained: number
}

export interface WaveResultResponse {
  wave_number: number
  enemies_spawned: number
  enemies_killed: number
  enemies_passed: number
  kills: EnemyKillDetail[]
  gold_earned: number
  score_earned: number
  lives_remaining: number
  is_game_over: boolean
  state: GameStateResponse
}

export interface TowerType {
  id: string
  name: string
  description: string
  base_damage: number
  basic_scope: number
  basic_attack_speed: number
  base_cost: number
  max_level: number
}

export interface EnemyType {
  id: string
  name: string
  description: string
  life_points: number
  speed: number
  armor: number
  reward_or: number
  is_boss: boolean
}

export interface ScoreResponse {
  pseudo: string
  score: number
  wave_reached: number
  played_at: string
}

export interface PathCell {
  x: number
  y: number
}

export interface AppState {
  view: View
  user: User | null
  game: GameStateResponse | null
  path: PathCell[]
  leaderboard: ScoreResponse[]
  myScores: ScoreResponse[]
  towersRef: TowerType[]
  enemiesRef: EnemyType[]
  selectedTowerTypeId: string | null
  waveResult: WaveResultResponse | null
  error: string | null
  loading: boolean
}
