import type { WaveResultResponse } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PixelSprite from './PixelSprite'

interface WaveResultModalProps {
  result: WaveResultResponse
  onContinue: () => void
  onGameOver: () => void
}

export default function WaveResultModal({ result, onContinue, onGameOver }: WaveResultModalProps) {
  const isGameOver = result.is_game_over

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative z-10 w-full max-w-md mx-4 animate-slide-in"
      >
        <div
          className="bg-[var(--surface)] border-2 p-6"
          style={{
            borderColor: isGameOver ? 'var(--red)' : 'var(--green)',
            boxShadow: isGameOver
              ? '0 0 40px rgba(255,34,68,0.3)'
              : '0 0 40px rgba(0,255,65,0.3)',
          }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            {isGameOver ? (
              <>
                <div className="flex justify-center mb-2"><PixelSprite tile={121} size={40} /></div>
                <h2
                  className="font-pixel text-lg text-[var(--red)]"
                  style={{ textShadow: '0 0 15px rgba(255,34,68,0.7)' }}
                >
                  GAME OVER
                </h2>
                <p className="font-pixel text-[0.5rem] text-[var(--text-dim)] mt-2">
                  {result.enemies_passed > 0
                    ? `${result.enemies_passed} ennemi${result.enemies_passed > 1 ? 's ont' : ' a'} atteint la sortie`
                    : 'Vos défenses ont été submergées'}
                </p>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-2"><PixelSprite tile={87} size={40} /></div>
                <h2
                  className="font-pixel text-sm text-[var(--green)]"
                  style={{ textShadow: '0 0 15px rgba(0,255,65,0.7)' }}
                >
                  VAGUE {result.wave_number} TERMINÉE
                </h2>
              </>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatBox
              label="ENNEMIS TUÉS"
              value={result.enemies_killed}
              max={result.enemies_spawned}
              color="var(--green)"
            />
            <StatBox
              label="ENNEMIS PASSÉS"
              value={result.enemies_passed}
              max={result.enemies_spawned}
              color={result.enemies_passed > 0 ? 'var(--red)' : 'var(--text-dim)'}
            />
            <StatBox
              label="OR GAGNÉ"
              value={`+${result.gold_earned}`}
              color="var(--gold)"
              icon="💰"
            />
            <StatBox
              label="SCORE GAGNÉ"
              value={`+${result.score_earned}`}
              color="var(--purple)"
              icon="⭐"
            />
          </div>

          {/* Lives remaining */}
          <div
            className="flex items-center justify-center gap-2 mb-4 p-2 border border-[var(--border)]"
          >
            <span className="text-sm">❤️</span>
            <span className="font-pixel text-[0.45rem] text-[var(--text-dim)]">VIES RESTANTES:</span>
            <span
              className="font-vt text-2xl"
              style={{
                color: result.lives_remaining > 5 ? 'var(--green)' : result.lives_remaining > 2 ? 'var(--gold)' : 'var(--red)',
              }}
            >
              {result.lives_remaining}
            </span>
          </div>

          {/* Kill list */}
          {result.kills && result.kills.length > 0 && (
            <div className="mb-4">
              <p className="font-pixel text-[0.4rem] text-[var(--text-dim)] mb-2">
                ÉLIMINATIONS:
              </p>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {result.kills.slice(0, 15).map((kill, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-2 py-0.5 bg-[var(--surface2)] border border-[var(--border)]"
                  >
                    <span className="font-pixel text-[0.35rem] text-[var(--text)]">
                      {kill.enemy_name}
                    </span>
                    <Badge variant="gold" className="text-[0.35rem]">
                      +{kill.reward_or} 💰
                    </Badge>
                  </div>
                ))}
                {result.kills.length > 15 && (
                  <p className="font-pixel text-[0.35rem] text-[var(--text-dim)] text-center">
                    +{result.kills.length - 15} autres...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Final score for game over */}
          {isGameOver && result.state && (
            <div
              className="text-center mb-4 p-3 border-2 border-[var(--gold)] bg-[rgba(255,215,0,0.05)]"
            >
              <p className="font-pixel text-[0.45rem] text-[var(--text-dim)]">SCORE FINAL</p>
              <p
                className="font-vt text-4xl text-[var(--gold)] mt-1"
                style={{ textShadow: '0 0 20px rgba(255,215,0,0.8)' }}
              >
                {result.state.score}
              </p>
              <p className="font-pixel text-[0.4rem] text-[var(--text-dim)] mt-1">
                Vague atteinte: {result.wave_number}
              </p>
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-center">
            {isGameOver ? (
              <Button variant="red" size="lg" onClick={onGameOver} className="w-full">
                RETOUR AU MENU
              </Button>
            ) : (
              <Button variant="green" size="lg" onClick={onContinue} className="w-full">
                ▶ CONTINUER
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({
  label,
  value,
  max,
  color,
  icon,
}: {
  label: string
  value: number | string
  max?: number
  color: string
  icon?: string
}) {
  return (
    <div className="bg-[var(--surface2)] border border-[var(--border)] p-2 text-center">
      <p className="font-pixel text-[0.35rem] text-[var(--text-dim)] mb-1">{label}</p>
      <div className="flex items-center justify-center gap-1">
        {icon && <span className="text-xs">{icon}</span>}
        <span className="font-vt text-2xl" style={{ color }}>
          {value}
        </span>
        {max !== undefined && (
          <span className="font-pixel text-[0.35rem] text-[var(--text-dim)]">
            /{max}
          </span>
        )}
      </div>
    </div>
  )
}
