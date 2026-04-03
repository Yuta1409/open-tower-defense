import { useState, useEffect } from 'react'
import { useApp } from '@/store/AppContext'
import { getTowerTypes, getEnemyTypes } from '@/api/reference'
import PixelSprite, { getEnemyTile, getTowerTile } from '@/components/game/PixelSprite'
import type { TowerType, EnemyType } from '@/types'

type Tab = 'towers' | 'enemies'

export default function WikiView() {
  const { state, dispatch } = useApp()
  const [tab, setTab] = useState<Tab>('towers')
  const [towers, setTowers] = useState<TowerType[]>(state.towersRef)
  const [enemies, setEnemies] = useState<EnemyType[]>(state.enemiesRef)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (towers.length && enemies.length) return
    setLoading(true)
    Promise.all([
      towers.length ? Promise.resolve(towers) : getTowerTypes(),
      enemies.length ? Promise.resolve(enemies) : getEnemyTypes(),
    ]).then(([t, e]) => {
      setTowers(t)
      setEnemies(e)
      if (!state.towersRef.length) dispatch({ type: 'SET_TOWERS_REF', towers: t })
      if (!state.enemiesRef.length) dispatch({ type: 'SET_ENEMIES_REF', enemies: e })
    }).finally(() => setLoading(false))
  }, [])

  const sortedTowers = [...towers].sort((a, b) => a.base_cost - b.base_cost)
  const sortedEnemies = [...enemies].sort((a, b) => {
    if (a.is_boss !== b.is_boss) return a.is_boss ? 1 : -1
    return a.life_points - b.life_points
  })

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 py-4 bg-[var(--surface)] border-b-2 border-[var(--border)]"
        style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
      >
        <button
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'menu' })}
          className="font-pixel text-[0.5rem] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors border border-[var(--border)] px-3 py-1"
        >
          ← RETOUR
        </button>
        <h1 className="font-pixel text-sm text-[var(--gold)]" style={{ textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>
          ★ ENCYCLOPÉDIE
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => setTab('towers')}
            className={`font-pixel text-[0.45rem] px-3 py-1.5 border transition-colors ${
              tab === 'towers'
                ? 'border-[var(--blue)] text-[var(--blue)] bg-[rgba(68,136,255,0.1)]'
                : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-dim)]'
            }`}
          >
            🗼 TOURS
          </button>
          <button
            onClick={() => setTab('enemies')}
            className={`font-pixel text-[0.45rem] px-3 py-1.5 border transition-colors ${
              tab === 'enemies'
                ? 'border-[var(--red)] text-[var(--red)] bg-[rgba(255,34,68,0.1)]'
                : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-dim)]'
            }`}
          >
            💀 ENNEMIS
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <p className="font-pixel text-[0.5rem] text-[var(--text-dim)] text-center mt-10">CHARGEMENT...</p>
        )}

        {/* TOWERS TABLE */}
        {tab === 'towers' && !loading && (
          <div className="max-w-4xl mx-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--border)]">
                  {['', 'NOM', 'COÛT', 'DÉGÂTS', 'PORTÉE', 'VITESSE', 'NIV MAX', 'DESCRIPTION'].map(h => (
                    <th key={h} className="font-pixel text-[0.35rem] text-[var(--text-dim)] text-left px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedTowers.map((tower, i) => (
                  <tr
                    key={tower.id}
                    className="border-b border-[var(--border)] hover:bg-[rgba(68,136,255,0.05)] transition-colors"
                  >
                    <td className="px-3 py-2">
                      <PixelSprite tile={getTowerTile(tower.id, sortedTowers)} size={28} />
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-pixel text-[0.4rem] text-[var(--text)]">{tower.name}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-vt text-base text-[var(--gold)]">{tower.base_cost}</span>
                      <span className="font-pixel text-[0.3rem] text-[var(--text-dim)]"> 💰</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-vt text-base text-[var(--red)]">{tower.base_damage}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-vt text-base text-[var(--blue)]">{tower.basic_scope}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-vt text-base text-[var(--green)]">{tower.basic_attack_speed}/s</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-vt text-base text-[var(--purple)]">{tower.max_level}</span>
                    </td>
                    <td className="px-3 py-2 max-w-xs">
                      <span className="font-pixel text-[0.35rem] text-[var(--text-dim)] leading-relaxed">
                        {tower.description}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ENEMIES TABLE */}
        {tab === 'enemies' && !loading && (
          <div className="max-w-4xl mx-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--border)]">
                  {['', 'NOM', 'PV BASE', 'VITESSE', 'ARMURE', 'RÉCOMPENSE', 'TYPE', 'DESCRIPTION'].map(h => (
                    <th key={h} className="font-pixel text-[0.35rem] text-[var(--text-dim)] text-left px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedEnemies.map(enemy => (
                  <tr
                    key={enemy.id}
                    className={`border-b border-[var(--border)] transition-colors ${
                      enemy.is_boss
                        ? 'bg-[rgba(255,34,68,0.05)] hover:bg-[rgba(255,34,68,0.1)]'
                        : 'hover:bg-[rgba(255,34,68,0.03)]'
                    }`}
                  >
                    <td className="px-3 py-2">
                      <PixelSprite
                        tile={getEnemyTile({ is_boss: enemy.is_boss, enemy_name: enemy.name })}
                        size={28}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className={`font-pixel text-[0.4rem] ${enemy.is_boss ? 'text-[var(--red)]' : 'text-[var(--text)]'}`}>
                        {enemy.name}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-vt text-base text-[var(--green)]">{enemy.life_points}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-vt text-base text-[var(--blue)]">{enemy.speed}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-vt text-base text-[var(--text-dim)]">{enemy.armor}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-vt text-base text-[var(--gold)]">{enemy.reward_or}</span>
                      <span className="font-pixel text-[0.3rem] text-[var(--text-dim)]"> 💰</span>
                    </td>
                    <td className="px-3 py-2">
                      {enemy.is_boss
                        ? <span className="font-pixel text-[0.35rem] text-[var(--red)] border border-[var(--red)] px-1">BOSS</span>
                        : <span className="font-pixel text-[0.35rem] text-[var(--text-dim)]">NORMAL</span>
                      }
                    </td>
                    <td className="px-3 py-2 max-w-xs">
                      <span className="font-pixel text-[0.35rem] text-[var(--text-dim)] leading-relaxed">
                        {enemy.description}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="font-pixel text-[0.35rem] text-[var(--text-dim)] mt-4 text-center">
              * Les PV et la vitesse augmentent de 20% et 8% par vague
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
