import { useState } from 'react'
import { useApp } from '@/store/AppContext'
import type { WaveResultResponse } from '@/types'
import HUD from './HUD'
import GameGrid from './GameGrid'
import TowerPanel from './TowerPanel'
import WaveResultModal from './WaveResultModal'

export default function GameView() {
  const { state, dispatch } = useApp()
  const [waveResult, setWaveResult] = useState<WaveResultResponse | null>(null)

  function handleWaveResult(result: WaveResultResponse) {
    setWaveResult(result)
    dispatch({ type: 'SET_WAVE_RESULT', result })
  }

  function handleContinue() {
    setWaveResult(null)
    dispatch({ type: 'SET_WAVE_RESULT', result: null })
  }

  function handleGameOver() {
    setWaveResult(null)
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
      <HUD onWaveResult={handleWaveResult} onGameOver={handleGameOver} />

      {/* Game area + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Grid container */}
        <div className="flex-1 flex items-center justify-center bg-[#050508] overflow-hidden p-2">
          <GameGrid />
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
