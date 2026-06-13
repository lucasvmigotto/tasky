import { useState, type ImgHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

function Avatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
        className,
      )}
      {...props}
    />
  )
}
Avatar.displayName = 'Avatar'

function AvatarImage({ className, alt, src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) return null

  return (
    <img
      className={cn('aspect-square h-full w-full object-cover', className)}
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      {...props}
    />
  )
}
AvatarImage.displayName = 'AvatarImage'

const AVATAR_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-violet-500 to-purple-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-indigo-500 to-blue-600',
  'from-teal-500 to-emerald-600',
  'from-rose-500 to-pink-600',
]

function getAvatarGradient(name = ''): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

function AvatarFallback({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const gradient = getAvatarGradient(String(children))
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white',
        gradient,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
AvatarFallback.displayName = 'AvatarFallback'

export { Avatar, AvatarImage, AvatarFallback }
