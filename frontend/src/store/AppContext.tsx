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
import { setTokenGetter, setUnauthorizedHandler } from '../api/client'

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    const token = localStorage.getItem('token')
    const refreshToken = localStorage.getItem('refreshToken')
    if (token && refreshToken) {
      return {
        ...init,
        token,
        refreshToken,
        view: 'menu' as const,
      }
    }
    return init
  })

  const getToken = useCallback(() => state.token, [state.token])

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    dispatch({ type: 'LOGOUT' })
  }, [])

  useEffect(() => {
    setTokenGetter(getToken)
  }, [getToken])

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized)
  }, [handleUnauthorized])

  useEffect(() => {
    if (state.token) {
      localStorage.setItem('token', state.token)
    } else {
      localStorage.removeItem('token')
    }
    if (state.refreshToken) {
      localStorage.setItem('refreshToken', state.refreshToken)
    } else {
      localStorage.removeItem('refreshToken')
    }
  }, [state.token, state.refreshToken])

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
