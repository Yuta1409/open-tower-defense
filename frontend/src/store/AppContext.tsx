import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { reducer, initialState, type Action } from './reducer'
import type { AppState } from '../types'
import { setUnauthorizedHandler } from '../api/client'
import { getMe } from '../api/auth'

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Au montage : vérifie si le cookie est encore valide
  useEffect(() => {
    getMe()
      .then(user => {
        dispatch({ type: 'SET_USER', user })
        dispatch({ type: 'SET_VIEW', view: 'menu' })
      })
      .catch(() => {
        // Cookie absent ou expiré → reste sur l'écran d'auth
      })
  }, [])

  const handleUnauthorized = useCallback(() => {
    dispatch({ type: 'LOGOUT' })
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized)
  }, [handleUnauthorized])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider')
  }
  return ctx
}
