/**
 * Identidad anónima por dispositivo (persistida en localStorage).
 * Sirve para marcar el creador de una sala (host) y la presencia en el WebSocket.
 * Cuando exista login real, esto se reemplaza por el id de usuario autenticado.
 */
function ensureUserId(): string {
  let id = localStorage.getItem('user_id')
  if (!id) {
    id = 'u_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('user_id', id)
  }
  return id
}

export const userId = ensureUserId()
