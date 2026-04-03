const BASE_URL = 'http://localhost:8000'

let tokenGetter: (() => string | null) | null = null
let onUnauthorized: (() => void) | null = null

export function setTokenGetter(getter: () => string | null) {
  tokenGetter = getter
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (!noAuth && tokenGetter) {
    const token = tokenGetter()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401) {
    if (onUnauthorized) {
      onUnauthorized()
    }
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const data = await response.json()
      message = data.detail || data.message || message
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  const text = await response.text()
  if (!text) return undefined as unknown as T
  return JSON.parse(text) as T
}
