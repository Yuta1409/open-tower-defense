const BASE_URL = 'http://localhost:8000'

let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

// Évite plusieurs refreshs simultanés
let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then(r => r.ok)
    .catch(() => false)
    .finally(() => { refreshPromise = null })
  return refreshPromise
}

interface RequestOptions {
  method?: string
  body?: unknown
  noAuth?: boolean
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, noAuth = false } = options

  const fetchOptions: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }

  const response = await fetch(`${BASE_URL}${path}`, fetchOptions)

  if (response.status === 401 && !noAuth) {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      const retry = await fetch(`${BASE_URL}${path}`, fetchOptions)
      if (retry.status === 401) {
        if (onUnauthorized) onUnauthorized()
        throw new Error('Session expirée')
      }
      if (!retry.ok) {
        const data = await retry.json().catch(() => ({})) as Record<string, string>
        throw new Error(data.detail || data.message || `HTTP ${retry.status}`)
      }
      const text = await retry.text()
      if (!text) return undefined as unknown as T
      return JSON.parse(text) as T
    } else {
      if (onUnauthorized) onUnauthorized()
      throw new Error('Session expirée')
    }
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const data = await response.json() as Record<string, string>
      message = data.detail || data.message || message
    } catch { /* ignore */ }
    throw new Error(message)
  }

  const text = await response.text()
  if (!text) return undefined as unknown as T
  return JSON.parse(text) as T
}
