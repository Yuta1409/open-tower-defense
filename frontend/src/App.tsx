import { useEffect } from 'react'
import { useApp } from '@/store/AppContext'
import { getMe } from '@/api/auth'
import AuthView from '@/components/auth/AuthView'
import MenuView from '@/components/menu/MenuView'
import GameView from '@/components/game/GameView'
import LeaderboardView from '@/components/leaderboard/LeaderboardView'
import WikiView from '@/components/wiki/WikiView'

export default function App() {
  const { state, dispatch } = useApp()

  // On mount: if token exists in state (restored from localStorage), fetch user info
  useEffect(() => {
    if (state.token && !state.user) {
      getMe()
        .then(user => {
          dispatch({ type: 'SET_USER', user })
        })
        .catch(() => {
          // Token invalid - logout
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          dispatch({ type: 'LOGOUT' })
        })
    }
  }, []) // only on mount

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
