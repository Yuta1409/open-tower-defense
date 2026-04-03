import { apiFetch } from './client'
import type { ScoreResponse } from '../types'

export interface LeaderboardResponse {
  leaderboard: ScoreResponse[]
}

export function getLeaderboard(): Promise<LeaderboardResponse> {
  return apiFetch<LeaderboardResponse>('/leaderboard', { noAuth: true })
}

export function getMyScores(): Promise<LeaderboardResponse> {
  return apiFetch<LeaderboardResponse>('/leaderboard/me')
}
