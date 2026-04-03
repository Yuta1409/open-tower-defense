import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '@/store/AppContext'
import type { WaveResultResponse, ActiveEnemy, EnemyType } from '@/types'
import { nextWave, endGame } from '@/api/game'
import PixelSprite, { getEnemyTile } from './PixelSprite'

// Réplique la logique _MIN_WAVE du backend pour prévisualiser la vague suivante
const MIN_WAVE: Record<string, number> = {
  'gobelin': 1, 'loup': 1, 'squelette': 3, 'bandit': 4,
  'elfe sombre': 5, 'orc': 6, 'troll': 8,
  'chevalier noir': 9, 'ogre': 11, 'dragon': 5,
}

function getPreviewEnemies(nextWaveNum: number, enemiesRef: EnemyType[]): EnemyType[] {
  const isBossWave = nextWaveNum % 5 === 0
  const available = enemiesRef.filter(e => {
    const minW = MIN_WAVE[e.name.toLowerCase().trim()] ?? 99
    return e.is_boss === isBossWave && minW <= nextWaveNum
  })
  if (available.length) return available
  return enemiesRef.filter(e => !e.is_boss && (MIN_WAVE[e.name.toLowerCase().trim()] ?? 99) <= 1)
}
import HUD from './HUD'
import GameGrid from './GameGrid'
import TowerPanel from './TowerPanel'
import WaveResultModal from './WaveResultModal'

export default function GameView() {
  const { state, dispatch } = useApp()
  const [waveResult, setWaveResult] = useState<WaveResultResponse | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [showEnemyInfo, setShowEnemyInfo] = useState(false)
  const pendingResult = useRef<WaveResultResponse | null>(null)
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Démarre le compte à rebours avant la prochaine vague.
  // Durée : 30s au départ, -5s toutes les 5 vagues, minimum 5s.
  function startCountdown() {
    setCountdown(30)
  }

  // Décrémente le compte à rebours chaque seconde, lance la vague à 0
  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      setCountdown(null)
      triggerNextWave()
      return
    }
    countdownRef.current = setTimeout(() => setCountdown(c => (c !== null ? c - 1 : null)), 1000)
    return () => { if (countdownRef.current) clearTimeout(countdownRef.current) }
  }, [countdown])

  // Lancer la vague (depuis le countdown ou depuis le bouton SKIP)
  const triggerNextWave = useCallback(async () => {
    if (!state.game || state.game.is_over) return
    // Annuler le countdown s'il tourne encore
    if (countdownRef.current) clearTimeout(countdownRef.current)
    setCountdown(null)

    dispatch({ type: 'SET_LOADING', loading: true })
    dispatch({ type: 'SET_ERROR', error: null })
    try {
      const result = await nextWave()
      // Conserver le gold actuel — il sera ajouté progressivement pendant l'animation
      dispatch({ type: 'SET_GAME', game: { ...result.state, gold: state.game!.gold } })
      handleWaveResult(result)
      if (result.is_game_over) {
        try { await endGame() } catch { /* ignore */ }
      }
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Erreur de vague',
      })
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [state.game])


  // Démarrer le countdown dès que la partie commence (wave = 0)
  const gameWave = state.game?.wave
  const gameIsOver = state.game?.is_over
  useEffect(() => {
    if (state.game && gameWave === 0 && !gameIsOver) {
      startCountdown()
    }
  }, [!!state.game])

  function handleWaveResult(result: WaveResultResponse) {
    pendingResult.current = result
    dispatch({ type: 'SET_WAVE_RESULT', result })
  }

  function handleAnimationComplete() {
    if (pendingResult.current) {
      // Sync au gold exact du serveur après l'animation (évite les désynchronisations)
      dispatch({ type: 'SET_GAME', game: pendingResult.current.state })
      setWaveResult(pendingResult.current)
      pendingResult.current = null
    }
  }

  function handleContinue() {
    setWaveResult(null)
    dispatch({ type: 'SET_WAVE_RESULT', result: null })
    // Démarrer le compte à rebours pour la vague suivante
    startCountdown()
  }

  function handleGameOver() {
    setWaveResult(null)
    setCountdown(null)
    if (countdownRef.current) clearTimeout(countdownRef.current)
    dispatch({ type: 'SET_WAVE_RESULT', result: null })
    dispatch({ type: 'SET_GAME', game: null })
    dispatch({ type: 'SET_PATH', path: [] })
    dispatch({ type: 'SELECT_TOWER', towerTypeId: null })
    dispatch({ type: 'SET_VIEW', view: 'menu' })
  }

  if (!state.game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <p className="font-pixel text-xs text-[var(--text-dim)] animate-blink">
          Chargement de la partie...
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)] overflow-hidden">
      {/* HUD */}
      <HUD
        countdown={countdown}
        onSkipCountdown={triggerNextWave}
        onGameOver={handleGameOver}
        onShowEnemyInfo={() => setShowEnemyInfo(true)}
      />

      {/* Game area + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Grid container */}
        <div className="flex-1 flex items-center justify-center bg-[#050508] overflow-hidden p-2">
          <GameGrid
            onAnimationComplete={handleAnimationComplete}
            canRemoveTower={countdown !== null}
          />
        </div>

        {/* Tower panel */}
        <TowerPanel />
      </div>

      {/* Placement hint */}
      {state.selectedTowerTypeId && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 bg-[var(--surface)] border-2 border-[var(--green)] px-4 py-2"
          style={{ boxShadow: '0 0 20px rgba(0,255,65,0.4)' }}
        >
          <p className="font-pixel text-[0.45rem] text-[var(--green)]">
            Cliquez sur une cellule vide pour placer la tour
          </p>
        </div>
      )}

      {/* Countdown overlay */}
      {countdown !== null && !waveResult && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-[var(--surface)] border-2 border-[var(--blue)] px-5 py-3"
          style={{ boxShadow: '0 0 30px rgba(68,136,255,0.4)' }}
        >
          {/* Progress bar */}
          <div className="w-32 h-1 bg-[var(--border)] overflow-hidden">
            <div
              className="h-full bg-[var(--blue)] transition-all duration-1000"
              style={{ width: `${(countdown / 30) * 100}%` }}
            />
          </div>
          <p className="font-vt text-xl text-[var(--blue)]">{countdown}s</p>
          <p className="font-pixel text-[0.4rem] text-[var(--text-dim)]">AVANT LA VAGUE</p>
          {state.game && (
            <button
              onClick={() => setShowEnemyInfo(true)}
              className="font-pixel text-[0.4rem] text-[var(--gold)] border border-[var(--gold)] px-2 py-1 hover:bg-[var(--gold)] hover:text-black transition-colors"
            >
              👁 VAGUE {state.game.wave + 1}
            </button>
          )}
          <button
            onClick={triggerNextWave}
            className="font-pixel text-[0.4rem] text-[var(--green)] border border-[var(--green)] px-2 py-1 hover:bg-[var(--green)] hover:text-black transition-colors"
          >
            ▶ SKIP
          </button>
        </div>
      )}

      {/* Enemy info popup — prévisualise la prochaine vague pendant le countdown */}
      {showEnemyInfo && state.game && (
        <EnemyInfoModal
          enemies={state.game.enemies}
          preview={countdown !== null ? getPreviewEnemies(state.game.wave + 1, state.enemiesRef) : undefined}
          wave={state.game.wave + (countdown !== null ? 1 : 0)}
          onClose={() => setShowEnemyInfo(false)}
        />
      )}

      {/* Wave result modal */}
      {waveResult && (
        <WaveResultModal
          result={waveResult}
          onContinue={handleContinue}
          onGameOver={handleGameOver}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Popup info ennemis de la vague précédente
// ---------------------------------------------------------------------------

function EnemyInfoModal({
  enemies,
  preview,
  wave,
  onClose,
}: {
  enemies: ActiveEnemy[]
  preview?: EnemyType[]   // types prévus pour la prochaine vague
  wave: number
  onClose: () => void
}) {
  const isPreview = !!preview

  // Mode preview : affiche les types d'ennemis attendus avec stats scalées
  // Mode résultat : affiche les ennemis de la vague passée
  const rows = isPreview
    ? preview!.map(e => ({
        key: e.name,
        tile: getEnemyTile({ is_boss: e.is_boss, enemy_name: e.name }),
        name: e.name,
        hp: Math.round(e.life_points * (1 + wave * 0.03)),
        speed: (e.speed * (1 + wave * 0.01)).toFixed(1),
        armor: e.armor,
        reward: e.reward_or,
        is_boss: e.is_boss,
        killed: null as null | string,
      }))
    : [...new Map(enemies.map(e => [e.enemy_name, e])).values()]
        .sort((a, b) => (a.is_boss ? 1 : 0) - (b.is_boss ? 1 : 0) || a.max_hp - b.max_hp)
        .map(enemy => {
          const total = enemies.filter(e => e.enemy_name === enemy.enemy_name).length
          const killed = enemies.filter(e => e.enemy_name === enemy.enemy_name && !e.alive).length
          return {
            key: enemy.enemy_name,
            tile: getEnemyTile(enemy),
            name: enemy.enemy_name,
            hp: Math.round(enemy.max_hp),
            speed: enemy.speed.toFixed(1),
            armor: enemy.armor,
            reward: enemy.reward_or,
            is_boss: enemy.is_boss,
            killed: `${killed}/${total}`,
          }
        })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-2xl mx-4 bg-[var(--surface)] border-2 border-[var(--gold)]"
        style={{ boxShadow: '0 0 40px rgba(255,215,0,0.25)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-[var(--border)]">
          <div>
            <h2 className="font-pixel text-[0.55rem] text-[var(--gold)]">
              {isPreview ? '⚠ PROCHAINE VAGUE' : 'ENNEMIS VAGUE'} {wave}
            </h2>
            {isPreview && (
              <p className="font-pixel text-[0.32rem] text-[var(--text-dim)] mt-0.5">
                Types d'ennemis prévus — stats estimées
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="font-pixel text-[0.4rem] text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)] px-2 py-1"
          >
            ✕ FERMER
          </button>
        </div>

        {/* Table */}
        <div className="overflow-y-auto max-h-96">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-[var(--surface)]">
              <tr className="border-b border-[var(--border)]">
                {['', 'NOM', 'PV', 'VIT.', 'ARMURE', 'RÉCOMP.', ...(isPreview ? [] : ['TUÉS']), 'TYPE'].map(h => (
                  <th key={h} className="font-pixel text-[0.3rem] text-[var(--text-dim)] text-left px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={row.key}
                  className={`border-b border-[var(--border)] ${row.is_boss ? 'bg-[rgba(255,34,68,0.06)]' : ''}`}
                >
                  <td className="px-3 py-2"><PixelSprite tile={row.tile} size={24} /></td>
                  <td className="px-3 py-2">
                    <span className={`font-pixel text-[0.38rem] ${row.is_boss ? 'text-[var(--red)]' : 'text-[var(--text)]'}`}>
                      {row.name}
                    </span>
                  </td>
                  <td className="px-3 py-2"><span className="font-vt text-base text-[var(--green)]">{row.hp}</span></td>
                  <td className="px-3 py-2"><span className="font-vt text-base text-[var(--blue)]">{row.speed}</span></td>
                  <td className="px-3 py-2"><span className="font-vt text-base text-[var(--text-dim)]">{row.armor}</span></td>
                  <td className="px-3 py-2">
                    <span className="font-vt text-base text-[var(--gold)]">{row.reward}</span>
                    <span className="font-pixel text-[0.3rem] text-[var(--text-dim)]"> 💰</span>
                  </td>
                  {!isPreview && (
                    <td className="px-3 py-2">
                      <span className="font-vt text-base text-[var(--text)]">{row.killed}</span>
                    </td>
                  )}
                  <td className="px-3 py-2">
                    {row.is_boss
                      ? <span className="font-pixel text-[0.3rem] text-[var(--red)] border border-[var(--red)] px-1">BOSS</span>
                      : <span className="font-pixel text-[0.3rem] text-[var(--text-dim)]">normal</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-2 border-t border-[var(--border)]">
          <p className="font-pixel text-[0.3rem] text-[var(--text-dim)]">
            {isPreview
              ? `* PV et vitesse estimés pour la vague ${wave}`
              : `* PV scalés pour la vague ${wave}`}
          </p>
        </div>
      </div>
    </div>
  )
}
