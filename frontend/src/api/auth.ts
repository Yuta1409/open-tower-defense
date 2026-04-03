import { apiFetch } from './client'
import type { User } from '../types'

export interface RegisterRequest {
  pseudo: string
  password: string
}

export interface LoginRequest {
  pseudo: string
  password: string
}

export function register(data: RegisterRequest): Promise<User> {
  return apiFetch<User>('/auth/register', { method: 'POST', body: data, noAuth: true })
}

export function login(data: LoginRequest): Promise<User> {
  return apiFetch<User>('/auth/login', { method: 'POST', body: data, noAuth: true })
}

export function getMe(): Promise<User> {
  return apiFetch<User>('/auth/me')
}

export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' })
}
