import { useState } from 'react'
import { useApp } from '@/store/AppContext'
import { startGame } from '@/api/game'
import { getTowerTypes, getEnemyTypes } from '@/api/reference'
import { getLeaderboard, getMyScores } from '@/api/leaderboard'
import { logout } from '@/api/auth'
import PixelSprite from '@/components/game/PixelSprite'
import { generatePath } from '@/store/reducer'
import { Button } from '@/components/ui/button'

export default function MenuView() {
  const { state, dispatch } = useApp()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleNewGame() {
    setLoading(true)
    setError(null)
    try {
      const [gameResponse, towers, enemies] = await Promise.all([
        startGame(),
        state.towersRef.length === 0 ? getTowerTypes() : Promise.resolve(state.towersRef),
        state.enemiesRef.length === 0 ? getEnemyTypes() : Promise.resolve(state.enemiesRef),
      ])
      const path = generatePath(20, 15)
      dispatch({ type: 'SET_GAME', game: gameResponse.state })
      dispatch({ type: 'SET_PATH', path })
      dispatch({ type: 'SET_TOWERS_REF', towers })
      dispatch({ type: 'SET_ENEMIES_REF', enemies })
      dispatch({ type: 'SET_VIEW', view: 'game' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du démarrage')
    } finally {
      setLoading(false)
    }
  }

  async function handleLeaderboard() {
    setLoading(true)
    setError(null)
    try {
      const [global, my] = await Promise.all([
        getLeaderboard(),
        getMyScores(),
      ])
      dispatch({ type: 'SET_LEADERBOARD', leaderboard: global.leaderboard })
      dispatch({ type: 'SET_MY_SCORES', myScores: my.leaderboard })
      dispatch({ type: 'SET_VIEW', view: 'leaderboard' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await logout().catch(() => {})
    dispatch({ type: 'LOGOUT' })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] p-4">
      {/* Big title with scanlines effect */}
      <div className="mb-16 text-center relative">
        <div
          className="inline-block"
          style={{
            filter: 'drop-shadow(0 0 20px rgba(255,34,68,0.9)) drop-shadow(0 0 40px rgba(255,34,68,0.5))',
          }}
        >
          <h1 className="font-pixel text-4xl text-[var(--red)] tracking-widest">
            FILE
          </h1>
          <h1 className="font-pixel text-4xl text-[var(--red)] tracking-widest">
            ROUGE
          </h1>
        </div>
        <p className="font-pixel text-[0.55rem] text-[var(--text-dim)] mt-6 tracking-widest">
          ★ TOWER DEFENSE ★
        </p>
      </div>

      {/* User greeting */}
      {state.user && (
        <div className="mb-8 text-center">
          <p className="font-pixel text-[0.5rem] text-[var(--text-dim)]">BIENVENUE,</p>
          <p
            className="font-pixel text-sm text-[var(--green)] mt-1"
            style={{ textShadow: '0 0 10px rgba(0,255,65,0.5)' }}
          >
            {state.user.pseudo.toUpperCase()}
          </p>
        </div>
      )}

      {/* Menu options */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button
          variant="green"
          size="xl"
          className="w-full animate-pulse-glow"
          onClick={handleNewGame}
          disabled={loading}
        >
          {loading ? '▶ CHARGEMENT...' : '▶ NOUVELLE PARTIE'}
        </Button>

        <Button
          variant="gold"
          size="xl"
          className="w-full"
          onClick={handleLeaderboard}
          disabled={loading}
        >
          ★ CLASSEMENT
        </Button>

        <Button
          variant="default"
          size="xl"
          className="w-full"
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'wiki' })}
        >
          📖 ENCYCLOPÉDIE
        </Button>

        <Button
          variant="red"
          size="xl"
          className="w-full"
          onClick={handleLogout}
        >
          ✕ DÉCONNEXION
        </Button>
      </div>

      {error && (
        <div className="mt-6 border-2 border-[var(--red)] bg-[rgba(255,34,68,0.1)] p-3 max-w-xs w-full">
          <p className="font-pixel text-[0.45rem] text-[var(--red)] text-center">
            !! {error}
          </p>
        </div>
      )}

      {/* Decoration */}
      <div className="mt-16 flex gap-6 opacity-30">
        <PixelSprite tile={87} size={32} />
        <PixelSprite tile={108} size={32} />
        <PixelSprite tile={84} size={32} />
        <PixelSprite tile={110} size={32} />
        <PixelSprite tile={96} size={32} />
      </div>
    </div>
  )
}
