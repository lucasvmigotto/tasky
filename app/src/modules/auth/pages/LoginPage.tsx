import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Clock, ArrowRight, LogIn } from 'lucide-react'
import { useAuthStore } from '@/core/auth/authStore'
import { getConfig } from '@/core/config/runtimeConfig'
import { ROUTES } from '@/core/config/routes'

const isDemoMode = getConfig().demoMode === 'true'

export default function LoginPage() {
  const navigate = useNavigate()
  const loginWithDemo = useAuthStore((s) => s.loginWithDemo)

  async function handleDemoLogin() {
    await loginWithDemo()
    navigate(ROUTES.DASHBOARD, { replace: true })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 p-4">
      {/* Grid de fundo */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] bg-repeat" />

      {/* Gradientes de luz */}
      <div className="absolute inset-0">
        <div className="absolute -left-1/4 -top-1/4 size-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 size-1/2 rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute left-1/3 top-1/2 size-1/3 rounded-full bg-emerald-500/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo animado */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5, type: 'spring', stiffness: 200 }}
          className="mb-10 text-center"
        >
          <motion.div
            animate={{ rotate: [0, -8, 8, -4, 0] }}
            transition={{ delay: 0.8, duration: 1.5, ease: 'easeInOut' }}
            className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 shadow-2xl shadow-primary/30 ring-2 ring-primary/20"
          >
            <Clock className="size-8 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-4xl font-bold tracking-tight"
          >
            <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">Task</span>
            <span className="text-zinc-100">Y</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mt-2 text-sm text-zinc-500"
          >
            Controle de horas e gestão de projetos
          </motion.p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl"
        >
          {/* Linha decorativa no topo do card */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="flex flex-col gap-5">
            {isDemoMode ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <LogIn className="size-5 text-primary" />
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Modo demonstração ativo.
                    <br />
                    <span className="text-zinc-500">Nenhuma autenticação necessária.</span>
                  </p>
                </div>

                <button
                  onClick={handleDemoLogin}
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
                  <Clock className="size-4" />
                  Entrar no TaskY
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-zinc-900/70 px-3 text-zinc-600">ou continue com</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/50 px-5 py-3 text-sm font-medium text-zinc-300 shadow-sm transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.98]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Entrar com Google
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="flex flex-col gap-5"
              >
                <div className="text-center">
                  <p className="text-sm text-zinc-400">Faça login para continuar</p>
                </div>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/50 px-5 py-3 text-sm font-medium text-zinc-300 shadow-sm transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Entrar com Google
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="mt-8 text-center text-xs text-zinc-700"
        >
          © {new Date().getFullYear()} TaskY
        </motion.p>
      </motion.div>
    </div>
  )
}
