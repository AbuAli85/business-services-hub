"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import "./tooltip-styles.css"

interface TooltipProps {
  children: React.ReactNode
  content?: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  className?: string
}

type TooltipRootContext = {
  isOpen: boolean
  open: () => void
  close: () => void
  triggerRef: React.RefObject<HTMLDivElement>
  contentRef: React.RefObject<HTMLDivElement>
  side: "top" | "bottom" | "left" | "right"
  className?: string
  position: { top: number; left: number }
  updatePosition: () => void
}

type TooltipProviderValue = {
  delayDuration: number
  skipDelayDuration: number
  defaultSide: "top" | "bottom" | "left" | "right"
  defaultClassName?: string
}

const ProviderCtx = React.createContext<TooltipProviderValue>({
  delayDuration: 200,
  skipDelayDuration: 500,
  defaultSide: "top",
  defaultClassName: undefined
})

const RootCtx = React.createContext<TooltipRootContext | null>(null)

type TooltipProviderProps = {
  children: React.ReactNode
  delayDuration?: number
  skipDelayDuration?: number
  defaultSide?: "top" | "bottom" | "left" | "right"
  defaultClassName?: string
}

const TooltipProvider = ({ children, delayDuration = 200, skipDelayDuration = 500, defaultSide = "top", defaultClassName }: TooltipProviderProps) => {
  return (
    <ProviderCtx.Provider value={{ delayDuration, skipDelayDuration, defaultSide, defaultClassName }}>
      {children}
    </ProviderCtx.Provider>
  )
}

const useLegacyOpenLogic = (delayDuration: number, skipDelayDuration: number) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [lastOpenAt, setLastOpenAt] = React.useState(0)
  const openTimerRef = React.useRef<number | null>(null)
  const open = () => {
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
  const close = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    setIsOpen(false)
  }
  return { isOpen, open, close }
}

const computePosition = (
  triggerEl: HTMLElement,
  contentEl: HTMLElement,
  side: "top" | "bottom" | "left" | "right"
) => {
  const triggerRect = triggerEl.getBoundingClientRect()
  const contentRect = contentEl.getBoundingClientRect()
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
  return { top, left }
}

const Tooltip = ({ children, content, side, className }: TooltipProps) => {
  const { delayDuration, skipDelayDuration, defaultSide, defaultClassName } = React.useContext(ProviderCtx)
  const usedSide = side ?? defaultSide
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const { isOpen, open, close } = useLegacyOpenLogic(delayDuration, skipDelayDuration)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current || !contentRef.current) return
    setPosition(computePosition(triggerRef.current, contentRef.current, usedSide))
  }, [usedSide])

  React.useEffect(() => {
    if (!isOpen) return
    updatePosition()
    const handleResize = () => updatePosition()
    const handleScroll = () => updatePosition()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [isOpen, updatePosition])

  // Legacy mode: content prop provided -> wrap children and render content directly
  if (content !== undefined) {
    return (
      <div
        ref={triggerRef}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        className="inline-block"
      >
        {children}
        {isOpen && (
          <div
            ref={(node) => {
              if (node) {
                node.style.setProperty('--tooltip-top', `${position.top}px`)
                node.style.setProperty('--tooltip-left', `${position.left}px`)
                if (contentRef) {
                  (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node
                }
              }
            }}
            className={cn(
              "tooltip-content",
              defaultClassName,
              className
            )}
          >
            {content}
          </div>
        )}
      </div>
    )
  }

  // Composition mode: provide context to Trigger and Content
  const ctxValue: TooltipRootContext = {
    isOpen,
    open,
    close,
    triggerRef,
    contentRef,
    side: usedSide,
    className: className ?? defaultClassName,
    position,
    updatePosition
  }

  return (
    <RootCtx.Provider value={ctxValue}>
      {children}
    </RootCtx.Provider>
  )
}

type TriggerProps = React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
const TooltipTrigger = React.forwardRef<HTMLDivElement, TriggerProps>(({ children, asChild, ...props }, ref) => {
  const ctx = React.useContext(RootCtx)
  const Comp: any = asChild ? React.Fragment : 'div'
  const mergedRef = (node: HTMLDivElement | null) => {
    if (typeof ref === 'function') {
      ref(node)
    } else if (ref && typeof ref === 'object') {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
    }
    if (ctx) (ctx.triggerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
  }
  if (!ctx) return <div ref={ref} {...props}>{children}</div>
  const handleEnter = () => ctx.open()
  const handleLeave = () => ctx.close()
  return (
    <Comp {...(asChild ? {} : { ref: mergedRef, onMouseEnter: handleEnter, onMouseLeave: handleLeave, onFocus: handleEnter, onBlur: handleLeave })} {...props}>
      {asChild ? React.cloneElement(children as any, { ref: mergedRef, onMouseEnter: handleEnter, onMouseLeave: handleLeave, onFocus: handleEnter, onBlur: handleLeave }) : children}
    </Comp>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ children, className, ...props }, ref) => {
  const provider = React.useContext(ProviderCtx)
  const ctx = React.useContext(RootCtx)
  if (!ctx || !ctx.isOpen) return null
  React.useEffect(() => {
    ctx.updatePosition()
    const handleResize = () => ctx.updatePosition()
    const handleScroll = () => ctx.updatePosition()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [ctx])
  const mergedRef = (node: HTMLDivElement | null) => {
    if (typeof ref === 'function') {
      ref(node)
    } else if (ref && typeof ref === 'object') {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
    }
    (ctx.contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node
  }
  return (
    <div
      ref={(node) => {
        if (node) {
          node.style.setProperty('--tooltip-top', `${ctx.position.top}px`)
          node.style.setProperty('--tooltip-left', `${ctx.position.left}px`)
        }
        if (mergedRef) {
          if (typeof mergedRef === 'function') {
            mergedRef(node)
          } else {
            (mergedRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          }
        }
      }}
      className={cn(
        "tooltip-content",
        provider.defaultClassName,
        ctx.className,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }