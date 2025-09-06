"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Simple tooltip implementation without external dependencies
interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  className?: string
}

const TooltipContext = React.createContext<{
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}>({
  isOpen: false,
  setIsOpen: () => {}
})

const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </TooltipContext.Provider>
  )
}

const Tooltip = ({ children, content, side = "top", className }: TooltipProps) => {
  const { isOpen, setIsOpen } = React.useContext(TooltipContext)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current || !contentRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const contentRect = contentRef.current.getBoundingClientRect()
    const scrollY = window.scrollY
    const scrollX = window.scrollX

    let top = 0
    let left = 0

    switch (side) {
      case "top":
        top = triggerRect.top + scrollY - contentRect.height - 8
        left = triggerRect.left + scrollX + (triggerRect.width - contentRect.width) / 2
        break
      case "bottom":
        top = triggerRect.bottom + scrollY + 8
        left = triggerRect.left + scrollX + (triggerRect.width - contentRect.width) / 2
        break
      case "left":
        top = triggerRect.top + scrollY + (triggerRect.height - contentRect.height) / 2
        left = triggerRect.left + scrollX - contentRect.width - 8
        break
      case "right":
        top = triggerRect.top + scrollY + (triggerRect.height - contentRect.height) / 2
        left = triggerRect.right + scrollX + 8
        break
    }

    setPosition({ top, left })
  }, [side])

  React.useEffect(() => {
    if (isOpen) {
      updatePosition()
      const handleResize = () => updatePosition()
      const handleScroll = () => updatePosition()
      
      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll)
      
      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll)
      }
    }
  }, [isOpen, updatePosition])

  return (
    <div
      ref={triggerRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      className="inline-block"
    >
      {children}
      {isOpen && (
        <div
          ref={contentRef}
          className={cn(
            "fixed z-50 overflow-hidden rounded-md bg-slate-900 px-3 py-1.5 text-xs text-slate-50 shadow-lg animate-in fade-in-0 zoom-in-95",
            className
          )}
          style={{
            top: position.top,
            left: position.left,
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}

const TooltipTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, ...props }, ref) => (
  <div ref={ref} {...props}>
    {children}
  </div>
))
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, ...props }, ref) => (
  <div ref={ref} {...props}>
    {children}
  </div>
))
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }