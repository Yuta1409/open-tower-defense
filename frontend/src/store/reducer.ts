import type {
  AppState,
  View,
  User,
  GameStateResponse,
  WaveResultResponse,
  TowerType,
  EnemyType,
  ScoreResponse,
  PathCell,
} from '../types'

export type Action =
  | { type: 'SET_VIEW'; view: View }
  | { type: 'SET_USER'; user: User }
  | { type: 'SET_GAME'; game: GameStateResponse | null }
  | { type: 'SET_PATH'; path: PathCell[] }
  | { type: 'SET_LEADERBOARD'; leaderboard: ScoreResponse[] }
  | { type: 'SET_MY_SCORES'; myScores: ScoreResponse[] }
  | { type: 'SET_TOWERS_REF'; towers: TowerType[] }
  | { type: 'SET_ENEMIES_REF'; enemies: EnemyType[] }
  | { type: 'SELECT_TOWER'; towerTypeId: string | null }
  | { type: 'SET_WAVE_RESULT'; result: WaveResultResponse | null }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'ADD_GOLD'; amount: number }
  | { type: 'LOGOUT' }

export const initialState: AppState = {
  view: 'auth',
  user: null,
  game: null,
  path: [],
  leaderboard: [],
  myScores: [],
  towersRef: [],
  enemiesRef: [],
  selectedTowerTypeId: null,
  waveResult: null,
  error: null,
  loading: false,
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.view, error: null }

    case 'SET_USER':
      return { ...state, user: action.user }

    case 'SET_GAME':
      return { ...state, game: action.game }

    case 'SET_PATH':
      return { ...state, path: action.path }

    case 'SET_LEADERBOARD':
      return { ...state, leaderboard: action.leaderboard }

    case 'SET_MY_SCORES':
      return { ...state, myScores: action.myScores }

    case 'SET_TOWERS_REF':
      return { ...state, towersRef: action.towers }

    case 'SET_ENEMIES_REF':
      return { ...state, enemiesRef: action.enemies }

    case 'SELECT_TOWER':
      return { ...state, selectedTowerTypeId: action.towerTypeId }

    case 'SET_WAVE_RESULT':
      return { ...state, waveResult: action.result }

    case 'SET_ERROR':
      return { ...state, error: action.error }

    case 'SET_LOADING':
      return { ...state, loading: action.loading }

    case 'ADD_GOLD':
      if (!state.game) return state
      return { ...state, game: { ...state.game, gold: state.game.gold + action.amount } }

    case 'LOGOUT':
      return {
        ...initialState,
        view: 'auth',
      }

    default:
      return state
  }
}

export function generatePath(cols = 20, rows = 15): PathCell[] {
  const path: PathCell[] = []
  let x = 0
  let y = 2 + Math.floor(Math.random() * (rows - 4))
  path.push({ x, y })

  while (x < cols - 1) {
    const canUp = y > 1 && !path.some(p => p.x === x && p.y === y - 1)
    const canDown = y < rows - 2 && !path.some(p => p.x === x && p.y === y + 1)
    const distToEnd = cols - 1 - x
    const mustGoRight = distToEnd <= 1

    const options: Array<{ dx: number; dy: number }> = []
    if (!mustGoRight) {
      if (canUp) options.push({ dx: 0, dy: -1 })
      if (canDown) options.push({ dx: 0, dy: 1 })
    }
    // Weight right movement more heavily
    options.push({ dx: 1, dy: 0 })
    options.push({ dx: 1, dy: 0 })
    options.push({ dx: 1, dy: 0 })

    const choice = options[Math.floor(Math.random() * options.length)]
    x += choice.dx
    y += choice.dy
    path.push({ x, y })
  }
  return path
}
