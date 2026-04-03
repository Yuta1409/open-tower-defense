import { useApp } from '@/store/AppContext'
import { endGame } from '@/api/game'
import { Button } from '@/components/ui/button'
import PixelSprite, { getEnemyTile } from './PixelSprite'

interface HUDProps {
  countdown: number | null
  onSkipCountdown: () => void
  onGameOver: () => void
  onShowEnemyInfo?: () => void
}

export default function HUD({ countdown, onSkipCountdown, onGameOver, onShowEnemyInfo }: HUDProps) {
  const { state, dispatch } = useApp()
  const game = state.game

  if (!game) return null

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

  // Types d'ennemis uniques de la vague en cours (dédupliqués par nom)
  const enemyTypes = game.enemies.length > 0
    ? [...new Map(game.enemies.map(e => [e.enemy_name, e])).values()]
    : []

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
        <PixelSprite tile={87} size={18} />
        <span className="font-vt text-2xl text-[var(--text-dim)]">
          {game.towers.length}
        </span>
      </div>

      {/* Types d'ennemis de la vague */}
      {enemyTypes.length > 0 && (
        <>
          <div className="w-px h-6 bg-[var(--border)]" />
          <button
            onClick={onShowEnemyInfo}
            disabled={!onShowEnemyInfo}
            className="flex items-center gap-1 border border-transparent hover:border-[var(--gold)] hover:bg-[rgba(255,215,0,0.07)] px-2 py-1 transition-colors disabled:cursor-default"
            title="Voir les ennemis de la vague"
          >
            <span className="font-pixel text-[0.4rem] text-[var(--text-dim)]">VAGUE:</span>
            <div className="flex items-center gap-0.5">
              {enemyTypes.map(e => (
                <div key={e.enemy_name}>
                  <PixelSprite tile={getEnemyTile(e)} size={16} />
                </div>
              ))}
            </div>
          </button>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Error display */}
      {state.error && (
        <p className="font-pixel text-[0.4rem] text-[var(--red)]">!! {state.error}</p>
      )}

      {/* Countdown indicator in HUD */}
      {countdown !== null && (
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[0.4rem] text-[var(--blue)]">
            VAGUE DANS
          </span>
          <span
            className="font-vt text-xl text-[var(--blue)]"
            style={{ textShadow: '0 0 8px rgba(68,136,255,0.8)' }}
          >
            {countdown}s
          </span>
          <button
            onClick={onSkipCountdown}
            disabled={state.loading}
            className="font-pixel text-[0.4rem] text-[var(--green)] border border-[var(--green)] px-2 py-1 hover:bg-[var(--green)] hover:text-black transition-colors disabled:opacity-40"
          >
            ▶ SKIP
          </button>
        </div>
      )}

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
