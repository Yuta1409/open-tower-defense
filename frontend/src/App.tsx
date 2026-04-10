import { useApp } from '@/store/AppContext'
import AuthView from '@/components/auth/AuthView'
import MenuView from '@/components/menu/MenuView'
import GameView from '@/components/game/GameView'
import LeaderboardView from '@/components/leaderboard/LeaderboardView'
import WikiView from '@/components/wiki/WikiView'

export default function App() {
  const { state } = useApp()

  // Auto-login is handled in AppContext.tsx — no duplicate getMe() here

  switch (state.view) {
    case 'auth':
      return <AuthView />
    case 'menu':
      return <MenuView />
    case 'game':
      return <GameView />
    case 'leaderboard':
      return <LeaderboardView />
    case 'wiki':
      return <WikiView />
    default:
      return <AuthView />
  }
}
