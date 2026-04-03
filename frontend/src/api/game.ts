import { apiFetch } from './client'
import type { GameStateResponse, WaveResultResponse } from '../types'

export interface GameStartResponse {
  state?: GameStateResponse
  wave?: number
  gold?: number
  score?: number
  lives?: number
  towers?: GameStateResponse['towers']
  enemies?: GameStateResponse['enemies']
  is_over?: boolean
}

export interface PlaceTowerRequest {
  tower_type_id: string
  x: number
  y: number
}

export interface GameEndResponse {
  message: string
  final_score: number
  wave_reached: number
}

export function startGame(): Promise<GameStateResponse> {
  return apiFetch<GameStateResponse>('/game/start', { method: 'POST' })
}

export function placeTower(data: PlaceTowerRequest): Promise<GameStateResponse> {
  return apiFetch<GameStateResponse>('/game/place-tower', {
    method: 'POST',
    body: data,
  })
}

export function nextWave(): Promise<WaveResultResponse> {
  return apiFetch<WaveResultResponse>('/game/next-wave', { method: 'POST' })
}

export function endGame(): Promise<GameEndResponse> {
  return apiFetch<GameEndResponse>('/game/end', { method: 'POST' })
}

export function getGameState(): Promise<GameStateResponse> {
  return apiFetch<GameStateResponse>('/game/state')
}
