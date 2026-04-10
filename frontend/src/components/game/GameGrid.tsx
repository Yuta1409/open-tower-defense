import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/store/AppContext'
import { placeTower, removeTower } from '@/api/game'
import type { ActiveEnemy, PlacedTower } from '@/types'
import PixelSprite, { getEnemyTile, getTowerTile } from './PixelSprite'

const COLS = 20
const ROWS = 15
const TICK_MS = 120

interface AnimEnemy {
  idx: number
  enemy: ActiveEnemy
  pos: number        // position flottante sur le chemin
  dieAt: number      // index du chemin où il meurt (path.length si survit)
  dead: boolean
  diedAt: number     // timestamp de la mort (0 = pas encore mort)
  startDelay: number // ms avant de commencer à avancer
  hits: { pos: number; dmg: number }[]  // coups prévisionnels (position + dégâts)
}

interface Props {
  onAnimationComplete: () => void
  canRemoveTower: boolean  // true pendant le countdown (phase de placement)
}

export default function GameGrid({ onAnimationComplete, canRemoveTower }: Props) {
  const { state, dispatch } = useApp()
  const { path, game, selectedTowerTypeId, towersRef } = state

  const [animEnemies, setAnimEnemies] = useState<AnimEnemy[]>([])
  const [gridPx, setGridPx] = useState({ w: 0, h: 0 })
  const gridRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Mesure les dimensions réelles de la grille pour aligner le SVG
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setGridPx({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const prevWaveRef = useRef<number>(-1)
  const goldQueueRef = useRef<number[]>([])
  const onCompleteRef = useRef(onAnimationComplete)
  onCompleteRef.current = onAnimationComplete

  // Lance l'animation uniquement quand le numéro de vague change
  // (pas quand une tour est placée, ce qui crée un nouvel objet game.enemies)
  useEffect(() => {
    const enemies = game?.enemies ?? []
    const wave = game?.wave ?? 0
    if (!enemies.length || !path.length) {
      setAnimEnemies([])
      return
    }
    // Ne relance pas si c'est la même vague (ex: placement de tour)
    if (wave === prevWaveRef.current) return
    prevWaveRef.current = wave

    if (animRef.current) clearInterval(animRef.current)
    goldQueueRef.current = []

    // Multiplicateur de vitesse : lent au début, rapide plus tard
    // Vague 1 → x0.11, Vague 5 → x0.23, Vague 10 → x0.38, Vague 20 → x0.68
    const waveMultiplier = Math.min(0.03 + wave * 0.015, 0.5)

    // Précalcule l'index de chemin le plus proche pour chaque tour
    const localTowerPathIdx = new Map<string, number>()
    if (game) {
      for (const tower of game.towers) {
        let minDist = Infinity; let closest = 0
        path.forEach((cell, idx) => {
          const d = Math.sqrt((cell.x - tower.x) ** 2 + (cell.y - tower.y) ** 2)
          if (d < minDist) { minDist = d; closest = idx }
        })
        localTowerPathIdx.set(`${tower.x},${tower.y}`, closest)
      }
    }

    // Précalcule les coups que chaque tour inflige à cet ennemi.
    // Chaque coup se déclenche à la position du centre de la tour, puis
    // les coups suivants sont espacés selon la vitesse de déplacement et l'attack_speed.
    function computeHits(enemy: ActiveEnemy): { pos: number; dmg: number }[] {
      const hits: { pos: number; dmg: number }[] = []
      let hpLeft = enemy.max_hp
      for (const tower of game!.towers) {
        if (hpLeft <= 0) break
        const towerCenter = localTowerPathIdx.get(`${tower.x},${tower.y}`) ?? 0
        // Espacement en unités de chemin entre deux tirs consécutifs
        const pathPerShot = Math.max(
          (enemy.speed * waveMultiplier * (1000 / TICK_MS)) / tower.attack_speed,
          0.1
        )
        let shotPos = towerCenter
        while (hpLeft > 0 && shotPos <= towerCenter + tower.scope) {
          hits.push({ pos: shotPos, dmg: tower.damage })
          hpLeft -= tower.damage
          shotPos += pathPerShot
        }
      }
      return hits.sort((a, b) => a.pos - b.pos)
    }

    // Trouve la position de mort : dernier coup fatal.
    function findDieAt(enemy: ActiveEnemy, hits: { pos: number; dmg: number }[]): number {
      if (enemy.alive) return path.length
      const lastHit = hits[hits.length - 1]
      return lastHit ? lastHit.pos : path.length
    }

    // Prépare les ennemis animés — TOUS les ennemis, vivants ou non
    // Délais cumulatifs aléatoires : chaque ennemi spawn entre 600ms et 2000ms après le précédent
    let cumulativeDelay = 0
    const anim: AnimEnemy[] = enemies.map((e, i) => {
      const startDelay = cumulativeDelay
      if (i < enemies.length - 1) cumulativeDelay += 600 + Math.random() * 1400
      const hits = computeHits(e)
      return {
        idx: i,
        enemy: e,
        pos: 0,
        dieAt: findDieAt(e, hits),
        dead: false,
        diedAt: 0,
        startDelay,
        hits,
      }
    })

    const started = new Set<number>()
    const startTime = Date.now()
    // Ref to track latest anim state for side-effect checks outside updater
    const latestAnimRef: { current: AnimEnemy[] } = { current: anim }

    setAnimEnemies(anim)

    animRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime

      setAnimEnemies(prev => {
        const next = prev.map(a => {
          // Délai de départ échelonné
          if (elapsed < a.startDelay) return a
          started.add(a.idx)

          if (a.dead) return a

          const speed = a.enemy.speed * waveMultiplier
          const newPos = a.pos + speed

          if (newPos >= a.dieAt) {
            // Ennemi tué par les tours → mettre en file le gold à ajouter
            if (!a.enemy.alive) {
              goldQueueRef.current.push(a.enemy.reward_or)
            }
            return { ...a, pos: a.dieAt, dead: true, diedAt: Date.now() }
          }
          return { ...a, pos: newPos }
        })

        // Store latest state for side-effect check below (pure — no effects here)
        latestAnimRef.current = next
        return next
      })

      // Side effects OUTSIDE the updater to avoid double-firing in StrictMode

      // Dispatcher le gold gagné par les ennemis morts ce tick
      while (goldQueueRef.current.length > 0) {
        const amount = goldQueueRef.current.shift()!
        dispatch({ type: 'ADD_GOLD', amount })
      }

      // Vérifie si tous les ennemis ont fini (démarrés + morts ou en fin)
      const allStarted = started.size === enemies.length
      const allDone = allStarted && latestAnimRef.current.every(a => a.dead || a.pos >= a.dieAt)

      if (allDone) {
        clearInterval(animRef.current!)
        animRef.current = null
        setTimeout(() => onCompleteRef.current(), 400)
      }
    }, TICK_MS)

    return () => {
      if (animRef.current) clearInterval(animRef.current)
    }
  }, [game?.enemies, game?.wave, path])

  // --- Rendu de la grille ---

  const pathSet = new Set(path.map(p => `${p.x},${p.y}`))

  const towerMap = new Map<string, PlacedTower>()
  if (game) {
    for (const tower of game.towers) {
      towerMap.set(`${tower.x},${tower.y}`, tower)
    }
  }

  // HP affiché = max_hp moins les dégâts des coups déjà touchés (pos du coup <= pos actuelle).
  // Chaque coup est discret : la barre saute du montant exact du damage, comme dans LoL.
  function hpPct(a: AnimEnemy): number {
    if (a.dead) return 0
    const dmgDealt = a.hits
      .filter(h => h.pos <= a.pos)
      .reduce((sum, h) => sum + h.dmg, 0)
    return Math.max(0, Math.round((a.enemy.max_hp - dmgDealt) / a.enemy.max_hp * 100))
  }

  // Construit la map des ennemis par cellule (plusieurs ennemis par cellule possible)
  const now = Date.now()
  const enemyCellMap = new Map<string, AnimEnemy[]>()
  for (const a of animEnemies) {
    if (a.pos < 0) continue
    // Disparaît 600ms après la mort
    if (a.dead && a.diedAt && now - a.diedAt > 600) continue
    const cellIdx = Math.min(Math.floor(a.pos), path.length - 1)
    const cell = path[cellIdx]
    if (!cell) continue
    const key = `${cell.x},${cell.y}`
    if (!enemyCellMap.has(key)) enemyCellMap.set(key, [])
    enemyCellMap.get(key)!.push(a)
  }

  const arrowMap = useMemo(() => {
    const m = new Map<string, string>()
    path.forEach((cell, idx) => {
      if (idx >= path.length - 1) return
      const next = path[idx + 1]
      const dx = next.x - cell.x
      const dy = next.y - cell.y
      m.set(`${cell.x},${cell.y}`, dx > 0 ? '→' : dx < 0 ? '←' : dy > 0 ? '↓' : '↑')
    })
    return m
  }, [path])

  function getPathArrow(x: number, y: number): string {
    return arrowMap.get(`${x},${y}`) ?? '→'
  }

  async function handleCellClick(x: number, y: number) {
    if (!game || state.loading) return

    // Clic sur une tour existante pendant la phase de placement → suppression + remboursement
    if (towerMap.has(`${x},${y}`)) {
      if (!canRemoveTower) return
      dispatch({ type: 'SET_LOADING', loading: true })
      dispatch({ type: 'SET_ERROR', error: null })
      try {
        const newState = await removeTower({ x, y })
        dispatch({ type: 'SET_GAME', game: newState })
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          error: err instanceof Error ? err.message : 'Impossible de retirer la tour',
        })
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false })
      }
      return
    }

    if (!selectedTowerTypeId) return
    if (pathSet.has(`${x},${y}`)) return

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

  // --- Tirs : une ligne SVG par tour vers sa cible ---
  interface Shot { fromX: number; fromY: number; toX: number; toY: number; attackSpeed: number }
  const shots: Shot[] = []
  const firingTowerSet = new Set<string>()

  if (game && animEnemies.length > 0) {
    for (const tower of game.towers) {
      const target = [...animEnemies]
        .filter(a => !a.dead)
        .sort((a, b) => b.pos - a.pos)
        .find(a => {
          const cellIdx = Math.min(Math.floor(a.pos), path.length - 1)
          const cell = path[cellIdx]
          return cell
            ? Math.sqrt((tower.x - cell.x) ** 2 + (tower.y - cell.y) ** 2) <= tower.scope
            : false
        })
      if (!target) continue

      // Cible : la cellule où le sprite ennemi est rendu (Math.floor = même logique qu'enemyCellMap)
      const cellIdx = Math.min(Math.floor(target.pos), path.length - 1)
      const cell = path[cellIdx]
      if (!cell) continue

      shots.push({ fromX: tower.x, fromY: tower.y, toX: cell.x, toY: cell.y, attackSpeed: tower.attack_speed })
      firingTowerSet.add(`${tower.x},${tower.y}`)
    }
  }

  const cells = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const key = `${col},${row}`
      const isPath = pathSet.has(key)
      const tower = towerMap.get(key)
      const cellEnemies = enemyCellMap.get(key) ?? []
      const isStart = path.length > 0 && path[0].x === col && path[0].y === row
      const isEnd = path.length > 0 && path[path.length - 1].x === col && path[path.length - 1].y === row

      let cellStyle: React.CSSProperties = {}
      let cellClass = ''
      let content: React.ReactNode = null

      const isFiring = firingTowerSet.has(key)  // true uniquement pendant le flash

      if (tower) {
        cellClass = canRemoveTower ? 'cursor-pointer' : 'cursor-default'
        cellStyle = {
          backgroundColor: isFiring ? '#122a50' : '#0a2a40',
          borderColor: canRemoveTower ? '#ff4444' : isFiring ? '#66ccff' : '#1a5080',
          boxShadow: canRemoveTower
            ? 'inset 0 0 8px rgba(255,68,68,0.3)'
            : isFiring
              ? 'inset 0 0 12px rgba(68,200,255,0.8), 0 0 8px rgba(68,200,255,0.6)'
              : 'inset 0 0 8px rgba(68,136,255,0.3)',
        }
        content = (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <PixelSprite tile={getTowerTile(tower.tower_type_id, towersRef)} size={20} />
          </div>
        )
      } else if (cellEnemies.length > 0) {
        const allDead = cellEnemies.every(a => a.dead)
        // Ennemi le plus avancé en tête
        const sorted = [...cellEnemies].sort((a, b) => b.pos - a.pos)
        const top = sorted[0]
        cellClass = 'cursor-default'
        cellStyle = {
          backgroundColor: allDead ? '#1a0505' : 'rgba(80,0,0,0.95)',
          borderColor: allDead ? '#331111' : '#ff2244',
          boxShadow: allDead ? 'none' : '0 0 6px rgba(255,34,68,0.6)',
        }
        // Tooltip : nom + PV de chaque ennemi vivant dans la cellule
        const tooltipLines = sorted
          .filter(a => !a.dead)
          .map(a => {
            const hp = Math.round(a.enemy.max_hp * hpPct(a) / 100)
            return `${a.enemy.enemy_name}: ${hp}/${Math.round(a.enemy.max_hp)} PV`
          })
        const tooltip = tooltipLines.join('\n')

        content = (
          <div
            className="flex flex-col items-center justify-center w-full h-full relative overflow-hidden"
            title={tooltip}
          >
            {/* Sprite du premier ennemi */}
            <PixelSprite
              tile={getEnemyTile(top.enemy)}
              size={14}
              grayscale={allDead}
              style={{ cursor: 'default', flexShrink: 0 }}
            />
            {/* Barre de vie continue par ennemi vivant */}
            {!allDead && (
              <div className="flex flex-col w-full px-0.5" style={{ gap: 1 }}>
                {sorted.filter(a => !a.dead).map(a => {
                  const pct = hpPct(a)
                  const barColor = pct > 50 ? '#00ff41' : pct > 25 ? '#ffd700' : '#ff2244'
                  return (
                    <div key={a.idx} className="w-full px-0.5">
                      <div style={{ width: '100%', height: 3, backgroundColor: '#1a0000' }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          backgroundColor: barColor,
                          transition: 'width 120ms linear, background-color 200ms',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {/* Badge nombre d'ennemis */}
            {sorted.filter(a => !a.dead).length > 1 && (
              <span className="absolute top-0 right-0 font-pixel text-[0.3rem] text-[var(--red)] leading-none bg-black/60 px-px">
                {sorted.filter(a => !a.dead).length}
              </span>
            )}
          </div>
        )
      } else if (isPath) {
        cellClass = 'cursor-default'
        cellStyle = {
          backgroundColor: 'var(--path)',
          borderColor: 'var(--path-border)',
        }
        if (isStart) {
          content = <span className="text-[0.5rem] text-[var(--red)] font-pixel opacity-80">IN</span>
        } else if (isEnd) {
          content = <span className="text-[0.5rem] text-[var(--red)] font-pixel opacity-80">OUT</span>
        } else {
          content = <span className="text-xs text-[rgba(255,34,68,0.25)] select-none">{getPathArrow(col, row)}</span>
        }
      } else {
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
          className={`relative flex items-center justify-center border border-solid transition-colors duration-75 ${cellClass}`}
          style={cellStyle}
          onClick={() => handleCellClick(col, row)}
          title={tower ? `${tower.tower_name} (Niv.${tower.level})` : undefined}
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
        aspectRatio: `${COLS}/${ROWS}`,
        maxHeight: '100%',
        maxWidth: '100%',
      }}
    >
      {/* Grille */}
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          width: '100%',
          height: '100%',
        }}
      >
        {cells}
      </div>

      {/* Overlay SVG : lignes de tir.
          viewBox en pixels réels mesurés par ResizeObserver → 1 unité SVG = 1 px CSS,
          ce qui garantit l'alignement exact avec les cellules de la grille. */}
      {shots.length > 0 && gridPx.w > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          viewBox={`0 0 ${gridPx.w} ${gridPx.h}`}
          style={{ width: '100%', height: '100%' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <style>{`
            @keyframes shot-flash {
              0%   { opacity: 1;   }
              20%  { opacity: 0.7; }
              100% { opacity: 0;   }
            }
          `}</style>
          {shots.map((s, i) => {
            const cw = gridPx.w / COLS
            const ch = gridPx.h / ROWS
            return (
              <line
                key={i}
                x1={(s.fromX + 0.5) * cw}
                y1={(s.fromY + 0.5) * ch}
                x2={(s.toX + 0.5) * cw}
                y2={(s.toY + 0.5) * ch}
                stroke="#00ccff"
                strokeWidth={2}
                style={{ animation: `shot-flash ${Math.round(1000 / s.attackSpeed)}ms ease-in infinite` }}
              />
            )
          })}
        </svg>
      )}
    </div>
  )
}
