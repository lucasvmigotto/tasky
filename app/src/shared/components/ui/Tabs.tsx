import {
  createContext,
  useCallback,
  useContext,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const ctx = useContext(TabsContext)
  if (!ctx) {
    throw new Error('Tabs components must be used within <Tabs>')
  }
  return ctx
}

interface TabsProps {
  defaultValue: string
  value?: string
  onValueChange?: (value: string) => void
  children: ReactNode
}

function Tabs({ defaultValue, value: controlledValue, onValueChange, children }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const value = controlledValue ?? internalValue

  const handleValueChange = useCallback(
    (next: string) => {
      onValueChange?.(next)
      if (controlledValue === undefined) {
        setInternalValue(next)
      }
    },
    [controlledValue, onValueChange],
  )

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      {children}
    </TabsContext.Provider>
  )
}
Tabs.displayName = 'Tabs'

function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}
TabsList.displayName = 'TabsList'

interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string
}

function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabsContext()
  const isActive = selectedValue === value

  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isActive && 'text-foreground',
        className,
      )}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {isActive && (
        <motion.div
          layoutId="tabs-indicator"
          className="absolute inset-0 rounded-sm bg-background shadow-sm"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative z-10">{props.children}</span>
    </button>
  )
}
TabsTrigger.displayName = 'TabsTrigger'

interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string
}

function TabsContent({ className, value, ...props }: TabsContentProps) {
  const { value: selectedValue } = useTabsContext()

  if (selectedValue !== value) return null

  return (
    <div
      className={cn(
        'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
      {...props}
    />
  )
}
TabsContent.displayName = 'TabsContent'

export { Tabs, TabsList, TabsTrigger, TabsContent }
