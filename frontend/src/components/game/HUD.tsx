import { useApp } from '@/store/AppContext'
import { nextWave, endGame } from '@/api/game'
import { Button } from '@/components/ui/button'

interface HUDProps {
  onWaveResult: (result: import('@/types').WaveResultResponse) => void
  onGameOver: () => void
}

export default function HUD({ onWaveResult, onGameOver }: HUDProps) {
  const { state, dispatch } = useApp()
  const game = state.game

  if (!game) return null

  async function handleNextWave() {
    dispatch({ type: 'SET_LOADING', loading: true })
    dispatch({ type: 'SET_ERROR', error: null })
    try {
      const result = await nextWave()
      dispatch({ type: 'SET_GAME', game: result.state })
      onWaveResult(result)
      if (result.is_game_over) {
        try {
          await endGame()
        } catch {
          // ignore end game error
        }
      }
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : 'Erreur de vague',
      })
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }

  async function handleEndGame() {
    dispatch({ type: 'SET_LOADING', loading: true })
    try {
      await endGame()
    } catch {
      // ignore
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
    onGameOver()
  }

  const livesColor =
    game.lives > 5 ? 'var(--green)' : game.lives > 2 ? 'var(--gold)' : 'var(--red)'

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 bg-[var(--surface)] border-b-2 border-[var(--border)] flex-wrap"
      style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
    >
      {/* Wave */}
      <div className="flex items-center gap-1">
        <span className="font-pixel text-[0.45rem] text-[var(--text-dim)]">VAGUE</span>
        <span
          className="font-vt text-2xl text-[var(--blue)]"
          style={{ textShadow: '0 0 10px rgba(68,136,255,0.7)' }}
        >
          {game.wave}
        </span>
      </div>

      <div className="w-px h-6 bg-[var(--border)]" />

      {/* Lives */}
      <div className="flex items-center gap-1">
        <span className="text-sm">❤️</span>
        <span
          className="font-vt text-2xl"
          style={{ color: livesColor, textShadow: `0 0 10px ${livesColor}80` }}
        >
          {game.lives}
        </span>
      </div>

      <div className="w-px h-6 bg-[var(--border)]" />

      {/* Gold */}
      <div className="flex items-center gap-1">
        <span className="text-sm">💰</span>
        <span
          className="font-vt text-2xl text-[var(--gold)]"
          style={{ textShadow: '0 0 10px rgba(255,215,0,0.7)' }}
        >
          {game.gold}
        </span>
      </div>

      <div className="w-px h-6 bg-[var(--border)]" />

      {/* Score */}
      <div className="flex items-center gap-1">
        <span className="text-sm">⭐</span>
        <span
          className="font-vt text-2xl text-[var(--purple)]"
          style={{ textShadow: '0 0 10px rgba(170,68,255,0.7)' }}
        >
          {game.score}
        </span>
      </div>

      <div className="w-px h-6 bg-[var(--border)]" />

      {/* Towers placed */}
      <div className="flex items-center gap-1">
        <span className="text-sm">🗼</span>
        <span className="font-vt text-2xl text-[var(--text-dim)]">
          {game.towers.length}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Error display */}
      {state.error && (
        <p className="font-pixel text-[0.4rem] text-[var(--red)]">!! {state.error}</p>
      )}

      {/* Buttons */}
      <Button
        variant="green"
        size="sm"
        onClick={handleNextWave}
        disabled={state.loading || game.is_over}
        className="animate-pulse-glow"
      >
        ▶ VAGUE SUIVANTE
      </Button>

      <Button
        variant="red"
        size="sm"
        onClick={handleEndGame}
        disabled={state.loading}
      >
        ✕ ABANDONNER
      </Button>
    </div>
  )
}
