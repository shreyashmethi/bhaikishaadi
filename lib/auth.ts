const KEY = 'shaadi_uid'

export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(KEY)
}
export function setCurrentUserId(id: string) {
  localStorage.setItem(KEY, id)
}
export function clearCurrentUser() {
  localStorage.removeItem(KEY)
}
