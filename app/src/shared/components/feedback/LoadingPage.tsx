import { Loader2 } from 'lucide-react'

function LoadingPage() {
  return (
    <div className="flex h-full min-h-[400px] w-full items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  )
}
LoadingPage.displayName = 'LoadingPage'

export { LoadingPage }
export default LoadingPage
