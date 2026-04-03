import { apiFetch } from './client'
import type { TowerType, EnemyType } from '../types'

export function getTowerTypes(): Promise<TowerType[]> {
  return apiFetch<TowerType[]>('/reference/towers')
}

export function getEnemyTypes(): Promise<EnemyType[]> {
  return apiFetch<EnemyType[]>('/reference/enemies')
}
