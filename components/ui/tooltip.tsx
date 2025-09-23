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

type TooltipContextValue = {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  delayDuration: number
  skipDelayDuration: number
  lastOpenAt: number
  setLastOpenAt: (t: number) => void
  defaultSide: "top" | "bottom" | "left" | "right"
  defaultClassName?: string
}

const TooltipContext = React.createContext<TooltipContextValue>({
  isOpen: false,
  setIsOpen: () => {},
  delayDuration: 200,
  skipDelayDuration: 500,
  lastOpenAt: 0,
  setLastOpenAt: () => {},
  defaultSide: "top",
  defaultClassName: undefined
})

type TooltipProviderProps = {
  children: React.ReactNode
  delayDuration?: number
  skipDelayDuration?: number
  defaultSide?: "top" | "bottom" | "left" | "right"
  defaultClassName?: string
}

const TooltipProvider = ({ children, delayDuration = 200, skipDelayDuration = 500, defaultSide = "top", defaultClassName }: TooltipProviderProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [lastOpenAt, setLastOpenAt] = React.useState(0)
  
  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen, delayDuration, skipDelayDuration, lastOpenAt, setLastOpenAt, defaultSide, defaultClassName }}>
      {children}
    </TooltipContext.Provider>
  )
}

const Tooltip = ({ children, content, side, className }: TooltipProps) => {
  const { isOpen, setIsOpen, delayDuration, skipDelayDuration, lastOpenAt, setLastOpenAt, defaultSide, defaultClassName } = React.useContext(TooltipContext)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const openTimerRef = React.useRef<number | null>(null)

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current || !contentRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const contentRect = contentRef.current.getBoundingClientRect()
    const scrollY = window.scrollY
    const scrollX = window.scrollX

    let top = 0
    let left = 0

  switch (side ?? defaultSide) {
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
  }, [side ?? defaultSide])

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

  const handleOpen = () => {
    const now = Date.now()
    const sinceLastOpen = now - lastOpenAt
    const openNow = sinceLastOpen <= skipDelayDuration
    if (openNow) {
      setIsOpen(true)
      setLastOpenAt(now)
    } else {
      if (openTimerRef.current) window.clearTimeout(openTimerRef.current)
      openTimerRef.current = window.setTimeout(() => {
        setIsOpen(true)
        setLastOpenAt(Date.now())
      }, delayDuration) as unknown as number
    }
  }

  const handleClose = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    setIsOpen(false)
  }

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onFocus={handleOpen}
      onBlur={handleClose}
      className="inline-block"
    >
      {children}
      {isOpen && (
        <div
          ref={contentRef}
          className={cn(
            "fixed z-50 overflow-hidden rounded-md bg-slate-900 px-3 py-1.5 text-xs text-slate-50 shadow-lg animate-in fade-in-0 zoom-in-95",
            defaultClassName,
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