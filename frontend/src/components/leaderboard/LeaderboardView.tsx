import { useApp } from '@/store/AppContext'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ScoreResponse } from '@/types'

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function getRankBadge(rank: number) {
  if (rank === 1) return { emoji: '🥇', color: 'var(--gold)' }
  if (rank === 2) return { emoji: '🥈', color: '#c0c0c0' }
  if (rank === 3) return { emoji: '🥉', color: '#cd7f32' }
  return { emoji: `#${rank}`, color: 'var(--text-dim)' }
}

function ScoreRow({ score, rank }: { score: ScoreResponse; rank: number }) {
  const badge = getRankBadge(rank)

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border)] hover:bg-[var(--surface2)] transition-colors"
    >
      {/* Rank */}
      <div className="w-8 text-center">
        <span
          className="font-vt text-xl"
          style={{ color: badge.color }}
        >
          {badge.emoji}
        </span>
      </div>

      {/* Pseudo */}
      <div className="flex-1">
        <span className="font-pixel text-[0.5rem] text-[var(--text)]">
          {score.pseudo}
        </span>
      </div>

      {/* Score */}
      <div className="text-right">
        <span
          className="font-vt text-2xl text-[var(--gold)]"
          style={{ textShadow: '0 0 8px rgba(255,215,0,0.5)' }}
        >
          {score.score.toLocaleString()}
        </span>
      </div>

      {/* Wave */}
      <div>
        <Badge variant="blue" className="font-vt text-sm py-0">
          V{score.wave_reached}
        </Badge>
      </div>

      {/* Date */}
      <div className="text-right w-16">
        <span className="font-pixel text-[0.35rem] text-[var(--text-dim)]">
          {formatDate(score.played_at)}
        </span>
      </div>
    </div>
  )
}

export default function LeaderboardView() {
  const { state, dispatch } = useApp()
  const { leaderboard, myScores, user } = state

  function handleBack() {
    dispatch({ type: 'SET_VIEW', view: 'menu' })
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          ← RETOUR
        </Button>

        <div className="text-center">
          <h1
            className="font-pixel text-lg text-[var(--gold)]"
            style={{ textShadow: '0 0 15px rgba(255,215,0,0.5)' }}
          >
            ★ CLASSEMENT ★
          </h1>
          <p className="font-pixel text-[0.4rem] text-[var(--text-dim)] mt-1">
            OPEN TOWER DEFENSE HALL OF FAME
          </p>
        </div>

        <div className="w-24" />
      </div>

      {/* Tabs */}
      <div
        className="flex-1 max-w-2xl w-full mx-auto bg-[var(--surface)] border-2 border-[var(--border)]"
        style={{ boxShadow: '0 0 30px rgba(0,0,0,0.5)' }}
      >
        <Tabs defaultValue="global">
          <div className="px-4 pt-4">
            <TabsList>
              <TabsTrigger value="global">CLASSEMENT GLOBAL</TabsTrigger>
              {user && <TabsTrigger value="personal">MES SCORES</TabsTrigger>}
            </TabsList>
          </div>

          <TabsContent value="global">
            {leaderboard.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <span className="text-4xl mb-4">🏆</span>
                <p className="font-pixel text-[0.5rem] text-[var(--text-dim)]">
                  Aucun score enregistré
                </p>
                <p className="font-pixel text-[0.4rem] text-[var(--text-dim)] mt-2">
                  Soyez le premier à jouer !
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[60vh]">
                {leaderboard.map((score, i) => (
                  <ScoreRow key={i} score={score} rank={i + 1} />
                ))}
              </div>
            )}
          </TabsContent>

          {user && (
            <TabsContent value="personal">
              <div className="px-4 py-2 mb-2">
                <p className="font-pixel text-[0.45rem] text-[var(--green)]">
                  Scores de {user.pseudo}
                </p>
              </div>
              {myScores.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <span className="text-4xl mb-4">🎮</span>
                  <p className="font-pixel text-[0.5rem] text-[var(--text-dim)]">
                    Pas encore de parties jouées
                  </p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[55vh]">
                  {myScores.map((score, i) => (
                    <ScoreRow key={i} score={score} rank={i + 1} />
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Back to game */}
      <div className="flex justify-center mt-6">
        <Button variant="green" size="lg" onClick={handleBack}>
          ▶ NOUVELLE PARTIE
        </Button>
      </div>
    </div>
  )
}
