import { toast } from 'sonner'

export function setLogoutHandler(fn: () => void) {
  logoutHandler = fn
}

let logoutHandler: (() => void) | null = null

export function handleLogout(): void {
  logoutHandler?.()
}

export function handle403Response(): void {
  toast.error('Você não tem permissão para realizar esta ação')
}

export function handle429Response(error: Response): void {
  const retryAfter = error.headers.get('Retry-After') || '30'
  toast.error(`Limite de requisições excedido. Tente novamente em ${retryAfter} segundos.`)
}

export function handleNetworkError(): void {
  toast.error('Erro de conexão. Verifique sua internet.')
}
