import { apiFetch } from './client'
import type { User } from '../types'

export interface RegisterRequest {
  pseudo: string
  password: string
}

export interface RegisterResponse {
  id: string
  pseudo: string
}

export interface LoginRequest {
  pseudo: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
}

export interface RefreshResponse {
  access_token: string
  refresh_token: string
}

export function register(data: RegisterRequest): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: data,
    noAuth: true,
  })
}

export function login(data: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: data,
    noAuth: true,
  })
}

export function refresh(refreshToken: string): Promise<RefreshResponse> {
  return apiFetch<RefreshResponse>('/auth/refresh', {
    method: 'POST',
    body: { refresh_token: refreshToken },
    noAuth: true,
  })
}

export function getMe(): Promise<User> {
  return apiFetch<User>('/auth/me')
}
