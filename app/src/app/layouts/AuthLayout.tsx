import { motion } from 'motion/react'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-primary">Task</span>
            <span className="text-foreground">Y</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Time tracking and project management
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
          {children}
        </div>
      </motion.div>
    </div>
  )
}
