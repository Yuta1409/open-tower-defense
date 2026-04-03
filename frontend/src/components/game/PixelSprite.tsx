import tileMap from '@/kenney/kenney_tiny-dungeon/Tilemap/tilemap_packed.png'

const TILE_SIZE = 16
const SHEET_COLS = 12
const SCALE = 2

interface Props {
  tile: number
  size?: number
  style?: React.CSSProperties
  className?: string
  grayscale?: boolean
}

export default function PixelSprite({ tile, size = TILE_SIZE * SCALE, style, className, grayscale }: Props) {
  const col = tile % SHEET_COLS
  const row = Math.floor(tile / SHEET_COLS)
  const scaledSheet = TILE_SIZE * SCALE * SHEET_COLS // 384
  const scaledSheetH = TILE_SIZE * SCALE * 11       // 352

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
        backgroundImage: `url(${tileMap})`,
        backgroundSize: `${scaledSheet}px ${scaledSheetH}px`,
        backgroundPosition: `-${col * TILE_SIZE * SCALE}px -${row * TILE_SIZE * SCALE}px`,
        backgroundRepeat: 'no-repeat',
        filter: grayscale ? 'grayscale(1) opacity(0.5)' : undefined,
        flexShrink: 0,
        ...style,
      }}
    />
  )
}

// Tile indices for enemies
export function getEnemyTile(enemy: { is_boss: boolean; enemy_name: string }): number {
  if (enemy.is_boss) return 122 // Dragon/Boss - red fearsome
  const name = enemy.enemy_name.toLowerCase()
  if (name.includes('gobelin') || name.includes('goblin')) return 108  // green goblin
  if (name.includes('squelette') || name.includes('skeleton')) return 121 // dark skeleton
  if (name.includes('orc')) return 110          // red monster
  if (name.includes('loup') || name.includes('wolf')) return 123       // beast
  if (name.includes('bandit')) return 109       // brown humanoid
  if (name.includes('elfe') || name.includes('elf')) return 112        // dark elf
  if (name.includes('troll')) return 114        // green large
  if (name.includes('chevalier') || name.includes('knight')) return 117 // armored
  if (name.includes('ogre')) return 111         // large red
  return 108 // fallback: goblin
}

// Tile indices for towers (hero characters: row 7-8, tiles 84-107)
const TOWER_TILES = [84, 85, 86, 87, 88, 89, 90, 91, 96, 97]

export function getTowerTile(towerTypeId: string, towersRef: { id: string; base_cost?: number }[]): number {
  // Trier par coût pour un mapping stable quel que soit l'ordre du tableau
  const sorted = [...towersRef].sort((a, b) => (a.base_cost ?? 0) - (b.base_cost ?? 0))
  const idx = sorted.findIndex(t => t.id === towerTypeId)
  return TOWER_TILES[(idx >= 0 ? idx : 0) % TOWER_TILES.length]
}
