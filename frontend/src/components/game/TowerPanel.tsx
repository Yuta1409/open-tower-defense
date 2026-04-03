import { useApp } from '@/store/AppContext'
import type { TowerType } from '@/types'

const TOWER_EMOJIS = ['🗼', '🏹', '⚡', '🔮', '💣', '🔫', '🪃', '🎯']

export default function TowerPanel() {
  const { state, dispatch } = useApp()
  const { towersRef, selectedTowerTypeId, game } = state

  function selectTower(id: string) {
    if (selectedTowerTypeId === id) {
      dispatch({ type: 'SELECT_TOWER', towerTypeId: null })
    } else {
      dispatch({ type: 'SELECT_TOWER', towerTypeId: id })
    }
  }

  function canAfford(tower: TowerType): boolean {
    return (game?.gold ?? 0) >= tower.base_cost
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] border-l-2 border-[var(--border)] w-48 overflow-y-auto">
      <div className="px-3 py-2 border-b-2 border-[var(--border)]">
        <h2 className="font-pixel text-[0.45rem] text-[var(--green)]">TOURS</h2>
        <p className="font-pixel text-[0.35rem] text-[var(--text-dim)] mt-0.5">
          Cliquer pour sélectionner
        </p>
      </div>

      <div className="flex flex-col gap-2 p-2">
        {towersRef.map((tower, idx) => {
          const isSelected = selectedTowerTypeId === tower.id
          const affordable = canAfford(tower)

          return (
            <button
              key={tower.id}
              onClick={() => affordable && selectTower(tower.id)}
              disabled={!affordable}
              className={`
                text-left p-2 border-2 transition-all duration-150
                ${isSelected
                  ? 'border-[var(--green)] bg-[rgba(0,255,65,0.1)] shadow-[0_0_10px_rgba(0,255,65,0.4)]'
                  : affordable
                    ? 'border-[var(--border)] bg-[var(--surface2)] hover:border-[var(--blue)] hover:bg-[rgba(68,136,255,0.05)]'
                    : 'border-[var(--border)] bg-[var(--surface2)] opacity-40 cursor-not-allowed'
                }
              `}
            >
              {/* Tower emoji + name */}
              <div className="flex items-center gap-1 mb-1">
                <span className="text-lg">{TOWER_EMOJIS[idx % TOWER_EMOJIS.length]}</span>
                <span
                  className={`font-pixel text-[0.4rem] leading-tight ${
                    isSelected ? 'text-[var(--green)]' : 'text-[var(--text)]'
                  }`}
                >
                  {tower.name}
                </span>
              </div>

              {/* Cost */}
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs">💰</span>
                <span
                  className={`font-vt text-base ${
                    affordable ? 'text-[var(--gold)]' : 'text-[var(--red)]'
                  }`}
                >
                  {tower.base_cost}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                <StatLine label="DMG" value={tower.base_damage} color="var(--red)" />
                <StatLine label="RNG" value={tower.basic_scope} color="var(--blue)" />
                <StatLine label="SPD" value={tower.basic_attack_speed} color="var(--green)" />
                <StatLine label="LVL" value={`/${tower.max_level}`} color="var(--text-dim)" />
              </div>

              {!affordable && (
                <p className="font-pixel text-[0.35rem] text-[var(--red)] mt-1">
                  pas assez d'or
                </p>
              )}

              {isSelected && (
                <p className="font-pixel text-[0.35rem] text-[var(--green)] mt-1">
                  ▶ SÉLECTIONNÉE
                </p>
              )}
            </button>
          )
        })}

        {towersRef.length === 0 && (
          <p className="font-pixel text-[0.4rem] text-[var(--text-dim)] text-center py-4">
            Chargement...
          </p>
        )}
      </div>
    </div>
  )
}

function StatLine({
  label,
  value,
  color,
}: {
  label: string
  value: number | string
  color: string
}) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="font-pixel text-[0.3rem] text-[var(--text-dim)]">{label}</span>
      <span className="font-vt text-sm" style={{ color }}>
        {value}
      </span>
    </div>
  )
}
