import { useEffect, useRef, useState } from 'react'
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
  dieAt: number      // index du chemin où il meurt (path.length+1 si survit)
  dead: boolean
  diedAt: number     // timestamp de la mort (0 = pas encore mort)
  startDelay: number // ms avant de commencer à avancer
}

interface Props {
  onAnimationComplete: () => void
  canRemoveTower: boolean  // true pendant le countdown (phase de placement)
}

export default function GameGrid({ onAnimationComplete, canRemoveTower }: Props) {
  const { state, dispatch } = useApp()
  const { path, game, selectedTowerTypeId, towersRef } = state

  const [animEnemies, setAnimEnemies] = useState<AnimEnemy[]>([])
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)
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

    // Calcule les dégâts cumulés sur un ennemi à une position donnée
    function localDmg(enemy: ActiveEnemy, pos: number): number {
      if (!game) return 0
      let dealt = 0
      for (const tower of game.towers) {
        const centerIdx = localTowerPathIdx.get(`${tower.x},${tower.y}`) ?? 0
        // Clamp pour que la portée ne commence pas avant le début du chemin (index 0)
        const enterIdx = Math.max(0, centerIdx - tower.scope)
        const exitIdx = centerIdx + tower.scope
        if (pos <= enterIdx) continue
        const fraction = Math.min((pos - enterIdx) / (exitIdx - enterIdx), 1)
        const dmg = Math.max(tower.damage - enemy.armor, 1)
        dealt += fraction * dmg
      }
      return Math.min(dealt, enemy.max_hp - Math.max(enemy.current_hp, 0))
    }

    // Trouve la position du chemin où l'ennemi est tué par les tours.
    // Si l'ennemi survit (current_hp > 0), il marche jusqu'à la sortie (path.length).
    function findDieAt(enemy: ActiveEnemy): number {
      if (enemy.alive) return path.length // survit → va jusqu'à la sortie
      const totalDmg = enemy.max_hp - Math.max(enemy.current_hp, 0)
      for (let pos = 0; pos <= path.length; pos += 0.25) {
        if (localDmg(enemy, pos) >= totalDmg * 0.98) return pos
      }
      return path.length
    }

    // Prépare les ennemis animés — TOUS les ennemis, vivants ou non
    const anim: AnimEnemy[] = enemies.map((e, i) => ({
      idx: i,
      enemy: e,
      pos: 0,
      dieAt: findDieAt(e),
      dead: false,
      diedAt: 0,
      startDelay: i * 1500,
    }))

    const started = new Set<number>()
    const startTime = Date.now()

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

        // Vérifie si tous les ennemis ont fini (démarrés + morts ou en fin)
        const allStarted = started.size === prev.length
        const allDone = allStarted && next.every(a => a.dead || a.pos >= a.dieAt)

        if (allDone) {
          clearInterval(animRef.current!)
          animRef.current = null
          setTimeout(() => onCompleteRef.current(), 400)
        }

        return next
      })

      // Dispatcher le gold gagné par les ennemis morts ce tick
      while (goldQueueRef.current.length > 0) {
        const amount = goldQueueRef.current.shift()!
        dispatch({ type: 'ADD_GOLD', amount })
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

  // Index de chemin le plus proche pour chaque tour (utilisé pour les HP bars)
  const towerPathIdx = new Map<string, number>()
  if (game && path.length > 0) {
    for (const tower of game.towers) {
      let minDist = Infinity, closest = 0
      path.forEach((cell, idx) => {
        const d = Math.sqrt((cell.x - tower.x) ** 2 + (cell.y - tower.y) ** 2)
        if (d < minDist) { minDist = d; closest = idx }
      })
      towerPathIdx.set(`${tower.x},${tower.y}`, closest)
    }
  }

  // Zone combinée de toutes les tours
  let firstEnter = Infinity, lastExit = -Infinity
  if (game) {
    for (const tower of game.towers) {
      const center = towerPathIdx.get(`${tower.x},${tower.y}`) ?? 0
      const enter = Math.max(0, center - tower.scope)
      const exit = center + tower.scope
      if (enter < firstEnter) firstEnter = enter
      if (exit > lastExit) lastExit = exit
    }
  }

  // Pourcentage de PV à afficher :
  // - 100% si l'ennemi n'a pas subi de dégâts (non ciblé)
  // - 100% avant d'entrer dans la zone des tours
  // - 100% tant qu'un ennemi prioritaire (idx plus petit) est encore vivant dans la zone
  //   → ciblage séquentiel : la tour est occupée sur l'ennemi précédent
  // - Interpolation linéaire de 100% → current_hp% dans la zone une fois ciblé
  // - current_hp% (ou 0%) après la zone
  function hpPct(a: AnimEnemy): number {
    const finalPct = a.dead ? 0 : Math.round((a.enemy.current_hp / a.enemy.max_hp) * 100)
    if (finalPct === 100 || !game || game.towers.length === 0) return 100

    // Bloquer si un ennemi prioritaire est encore vivant dans la zone
    const prevInZone = animEnemies.some(
      e => e.idx < a.idx && !e.dead && e.pos > firstEnter && e.pos < lastExit
    )
    if (prevInZone) return 100

    if (a.pos <= firstEnter) return 100
    if (a.pos >= lastExit) return finalPct
    const fraction = (a.pos - firstEnter) / (lastExit - firstEnter)
    return Math.round(100 - fraction * (100 - finalPct))
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

  // --- Projectiles animés au rythme de attack_speed ---
  const ATTACK_COLORS = [
    '#ff8800', '#ff4400', '#aa44ff', '#ff2244', '#00ccff',
    '#ffffff',  '#ff6600', '#888888', '#88ccff', '#ffd700',
  ]

  interface AttackProjectile {
    fromX: number; fromY: number; toX: number; toY: number
    color: string; phase: number  // 0 = à la tour, 1 = sur la cible
  }
  const attackProjectiles: AttackProjectile[] = []
  const firingTowerSet = new Set<string>()

  if (game) {
    game.towers.forEach((tower, ti) => {
      // Cible prioritaire : ennemi le plus avancé dans la portée
      let target: AnimEnemy | null = null
      for (const a of animEnemies) {
        if (a.dead) continue
        const cellIdx = Math.min(Math.floor(a.pos), path.length - 1)
        const cell = path[cellIdx]
        if (!cell) continue
        const dx = tower.x - cell.x
        const dy = tower.y - cell.y
        if (Math.sqrt(dx * dx + dy * dy) <= tower.scope) {
          if (!target || a.pos > target.pos) target = a
        }
      }
      if (!target) return

      const cellIdx = Math.min(Math.floor(target.pos), path.length - 1)
      const cell = path[cellIdx]
      if (!cell) return

      const color = ATTACK_COLORS[ti % ATTACK_COLORS.length]
      const periodMs = 1000 / tower.attack_speed
      const basePhase = (now % periodMs) / periodMs

      // Nombre de projectiles en vol simultané (max 2 pour les tours rapides)
      const numProjectiles = tower.attack_speed >= 2 ? 2 : 1
      for (let k = 0; k < numProjectiles; k++) {
        const phase = (basePhase + k / numProjectiles) % 1
        attackProjectiles.push({ fromX: tower.x, fromY: tower.y, toX: cell.x, toY: cell.y, color, phase })
        // Flash de la cellule tour quand le projectile vient d'être tiré (phase proche de 0)
        if (phase < 0.15) firingTowerSet.add(`${tower.x},${tower.y}`)
      }
    })
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
            {/* Une HP bar par ennemi vivant */}
            {!allDead && (
              <div className="flex flex-col w-full px-0.5" style={{ gap: 1 }}>
                {sorted.filter(a => !a.dead).map(a => {
                  const pct = hpPct(a)
                  const totalBlocks = Math.max(3, Math.min(10, Math.ceil(a.enemy.max_hp / 20)))
                  const filledBlocks = Math.ceil(pct / 100 * totalBlocks)
                  const blockColor = pct > 50 ? '#00ff41' : pct > 25 ? '#ffd700' : '#ff2244'
                  return (
                    <div key={a.idx} className="w-full flex px-0.5" style={{ gap: 1 }}>
                      {Array.from({ length: totalBlocks }, (_, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: 3,
                            backgroundColor: i < filledBlocks ? blockColor : '#1a0000',
                          }}
                        />
                      ))}
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

      {/* Overlay SVG : projectiles animés des tours */}
      {attackProjectiles.length > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="attack-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {attackProjectiles.map((proj, i) => {
            const x1pct = ((proj.fromX + 0.5) / COLS) * 100
            const y1pct = ((proj.fromY + 0.5) / ROWS) * 100
            const x2pct = ((proj.toX + 0.5) / COLS) * 100
            const y2pct = ((proj.toY + 0.5) / ROWS) * 100

            // Position courante du projectile
            const px = x1pct + (x2pct - x1pct) * proj.phase
            const py = y1pct + (y2pct - y1pct) * proj.phase

            // Traînée : 15% de la trajectoire derrière le projectile
            const tailPhase = Math.max(0, proj.phase - 0.15)
            const tailX = x1pct + (x2pct - x1pct) * tailPhase
            const tailY = y1pct + (y2pct - y1pct) * tailPhase

            return (
              <g key={i} filter="url(#attack-glow)">
                {/* Traînée lumineuse */}
                <line
                  x1={`${tailX}%`} y1={`${tailY}%`}
                  x2={`${px}%`} y2={`${py}%`}
                  stroke={proj.color}
                  strokeWidth={1.2}
                  opacity={0.55}
                />
                {/* Tête du projectile */}
                <circle cx={`${px}%`} cy={`${py}%`} r="2" fill={proj.color} opacity="0.95" />
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}
