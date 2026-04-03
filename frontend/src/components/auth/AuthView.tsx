import { useState, type FormEvent } from 'react'
import { useApp } from '@/store/AppContext'
import { login, register } from '@/api/auth'
import { Button } from '@/components/ui/button'
import PixelSprite from '@/components/game/PixelSprite'

export default function AuthView() {
  const { dispatch } = useApp()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [pseudo, setPseudo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'register') {
        await register({ pseudo, password })
      }
      const user = await login({ pseudo, password })
      dispatch({ type: 'SET_USER', user })
      dispatch({ type: 'SET_VIEW', view: 'menu' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] p-4">
      {/* Title */}
      <div className="mb-12 text-center">
        <h1
          className="font-pixel text-3xl text-[var(--red)] mb-2"
          style={{ textShadow: '0 0 20px rgba(255,34,68,0.8), 0 0 40px rgba(255,34,68,0.4)' }}
        >
          OPEN TOWER DEFENSE
        </h1>
        <p className="font-pixel text-xs text-[var(--text-dim)] mt-4">
          TOWER DEFENSE // 8-BIT EDITION
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <PixelSprite tile={85} size={24} />
          <PixelSprite tile={84} size={24} />
          <PixelSprite tile={108} size={24} />
          <PixelSprite tile={110} size={24} />
        </div>
      </div>

      {/* Auth Card */}
      <div
        className="w-full max-w-sm bg-[var(--surface)] border-2 border-[var(--border)] p-6"
        style={{ boxShadow: '0 0 30px rgba(0,0,0,0.8)' }}
      >
        {/* Tab switcher */}
        <div className="flex mb-6 border-b-2 border-[var(--border)]">
          <button
            className={`flex-1 py-2 font-pixel text-[0.55rem] border-b-2 -mb-[2px] transition-colors ${
              mode === 'login'
                ? 'border-[var(--green)] text-[var(--green)]'
                : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
            onClick={() => { setMode('login'); setError(null) }}
          >
            CONNEXION
          </button>
          <button
            className={`flex-1 py-2 font-pixel text-[0.55rem] border-b-2 -mb-[2px] transition-colors ${
              mode === 'register'
                ? 'border-[var(--green)] text-[var(--green)]'
                : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
            onClick={() => { setMode('register'); setError(null) }}
          >
            INSCRIPTION
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-pixel text-[0.5rem] text-[var(--text-dim)] mb-1">
              PSEUDO
            </label>
            <input
              type="text"
              value={pseudo}
              onChange={e => setPseudo(e.target.value)}
              required
              minLength={2}
              maxLength={24}
              placeholder="VotreNom"
              className="w-full bg-[var(--surface2)] border-2 border-[var(--border)] text-[var(--text)] px-3 py-2 font-pixel text-[0.55rem] outline-none focus:border-[var(--green)] transition-colors"
            />
          </div>

          <div>
            <label className="block font-pixel text-[0.5rem] text-[var(--text-dim)] mb-1">
              MOT DE PASSE
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full bg-[var(--surface2)] border-2 border-[var(--border)] text-[var(--text)] px-3 py-2 font-pixel text-[0.55rem] outline-none focus:border-[var(--green)] transition-colors"
            />
          </div>

          {error && (
            <div className="border-2 border-[var(--red)] bg-[rgba(255,34,68,0.1)] p-2">
              <p className="font-pixel text-[0.45rem] text-[var(--red)]">
                !! {error}
              </p>
            </div>
          )}

          <Button
            type="submit"
            variant="green"
            size="lg"
            className="w-full mt-2"
            disabled={loading}
          >
            {loading ? '...' : mode === 'login' ? 'JOUER' : "S'INSCRIRE"}
          </Button>
        </form>
      </div>

      <p className="mt-6 font-pixel text-[0.4rem] text-[var(--text-dim)]">
        © 2024 OPEN TOWER DEFENSE // ALL RIGHTS RESERVED
      </p>
    </div>
  )
}
