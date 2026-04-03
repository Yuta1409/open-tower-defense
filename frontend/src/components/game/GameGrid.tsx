import { useApp } from '@/store/AppContext'
import { placeTower } from '@/api/game'
import type { PlacedTower } from '@/types'

const COLS = 20
const ROWS = 15
const TOWER_EMOJIS = ['🗼', '🏹', '⚡', '🔮', '💣', '🔫', '🪃', '🎯']

function getTowerEmoji(towerTypeId: string, towersRef: { id: string }[]): string {
  const idx = towersRef.findIndex(t => t.id === towerTypeId)
  return TOWER_EMOJIS[(idx >= 0 ? idx : 0) % TOWER_EMOJIS.length]
}

export default function GameGrid() {
  const { state, dispatch } = useApp()
  const { path, game, selectedTowerTypeId, towersRef } = state

  const pathSet = new Set(path.map(p => `${p.x},${p.y}`))
  const towerMap = new Map<string, PlacedTower>()
  if (game) {
    for (const tower of game.towers) {
      towerMap.set(`${tower.x},${tower.y}`, tower)
    }
  }

  // Determine path direction for arrow display
  function getPathArrow(x: number, y: number): string {
    const idx = path.findIndex(p => p.x === x && p.y === y)
    if (idx < 0 || idx >= path.length - 1) return '→'
    const next = path[idx + 1]
    const dx = next.x - x
    const dy = next.y - y
    if (dx > 0) return '→'
    if (dx < 0) return '←'
    if (dy > 0) return '↓'
    if (dy < 0) return '↑'
    return '→'
  }

  async function handleCellClick(x: number, y: number) {
    if (!selectedTowerTypeId) return
    if (pathSet.has(`${x},${y}`)) return
    if (towerMap.has(`${x},${y}`)) return
    if (!game) return
    if (state.loading) return

    dispatch({ type: 'SET_LOADING', loading: true })
    dispatch({ type: 'SET_ERROR', error: null })
    try {
      const newState = await placeTower({ tower_type_id: selectedTowerTypeId, x, y })
      dispatch({ type: 'SET_GAME', game: newState })
      dispatch({ type: 'SELECT_TOWER', towerTypeId: null })
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Impossible de placer la tour',
      })
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }

  const cells = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const key = `${col},${row}`
      const isPath = pathSet.has(key)
      const tower = towerMap.get(key)
      const isStart = path.length > 0 && path[0].x === col && path[0].y === row
      const isEnd = path.length > 0 && path[path.length - 1].x === col && path[path.length - 1].y === row

      let cellClass = ''
      let cellStyle: React.CSSProperties = {}
      let content: React.ReactNode = null

      if (isPath) {
        cellClass = 'cursor-default'
        cellStyle = {
          backgroundColor: 'var(--path)',
          borderColor: 'var(--path-border)',
        }
        if (isStart) {
          content = (
            <span className="text-[0.5rem] text-[var(--red)] font-pixel opacity-80">IN</span>
          )
        } else if (isEnd) {
          content = (
            <span className="text-[0.5rem] text-[var(--red)] font-pixel opacity-80">OUT</span>
          )
        } else {
          content = (
            <span className="text-xs text-[rgba(255,34,68,0.3)] select-none">
              {getPathArrow(col, row)}
            </span>
          )
        }
      } else if (tower) {
        cellClass = 'cursor-default'
        cellStyle = {
          backgroundColor: '#0a2a40',
          borderColor: '#1a5080',
          boxShadow: 'inset 0 0 8px rgba(68,136,255,0.3)',
        }
        content = (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <span className="text-sm leading-none">
              {getTowerEmoji(tower.tower_type_id, towersRef)}
            </span>
          </div>
        )
      } else {
        // Empty placeable cell
        const canPlace = !!selectedTowerTypeId
        cellClass = canPlace
          ? 'cursor-crosshair hover:bg-[rgba(68,136,255,0.15)] hover:border-[var(--blue)]'
          : 'cursor-default'
        cellStyle = {
          backgroundColor: 'var(--tower-cell)',
          borderColor: '#1a3050',
        }
      }

      cells.push(
        <div
          key={key}
          className={`
            relative flex items-center justify-center
            border border-solid
            transition-colors duration-100
            ${cellClass}
          `}
          style={cellStyle}
          onClick={() => handleCellClick(col, row)}
          title={tower ? `${tower.tower_name} (Niv.${tower.level}) | DMG:${tower.damage} RNG:${tower.scope}` : undefined}
        >
          {content}
        </div>
      )
    }
  }

  return (
    <div
      className="crt-screen flex-1 relative"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        aspectRatio: `${COLS}/${ROWS}`,
        maxHeight: '100%',
        maxWidth: '100%',
      }}
    >
      {cells}
    </div>
  )
}
