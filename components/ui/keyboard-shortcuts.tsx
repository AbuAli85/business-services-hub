'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface KeyboardShortcut {
  key: string
  description: string
  action: () => void
  modifier?: 'ctrl' | 'alt' | 'shift' | 'meta'
  disabled?: boolean
}

interface KeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Check if user is typing in an input field
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.closest('[contenteditable="true"]')
    ) {
      // Allow some shortcuts even when typing
      const allowedInInputs = ['Escape']
      if (!allowedInInputs.includes(event.key)) {
        return
      }
    }

    shortcuts.forEach(({ key, action, modifier, disabled }) => {
      if (disabled) return

      let modifierPressed = false
      switch (modifier) {
        case 'ctrl':
          modifierPressed = event.ctrlKey || event.metaKey // Support both Ctrl and Cmd
          break
        case 'alt':
          modifierPressed = event.altKey
          break
        case 'shift':
          modifierPressed = event.shiftKey
          break
        case 'meta':
          modifierPressed = event.metaKey
          break
        default:
          modifierPressed = !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey
      }

      if (event.key.toLowerCase() === key.toLowerCase() && modifierPressed) {
        event.preventDefault()
        action()
      }
    })
  }, [shortcuts, enabled])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])
}

// Predefined shortcut sets for common actions
export const createMilestoneShortcuts = (actions: {
  onCreateMilestone: () => void
  onCreateTask: () => void
  onSearch: () => void
  onRefresh: () => void
  onToggleFilters: () => void
}) => ({
  'n': {
    key: 'n',
    description: 'Create new milestone',
    action: actions.onCreateMilestone,
  },
  't': {
    key: 't',
    description: 'Create new task',
    action: actions.onCreateTask,
  },
  '/': {
    key: '/',
    description: 'Focus search',
    action: actions.onSearch,
  },
  'r': {
    key: 'r',
    description: 'Refresh data',
    action: actions.onRefresh,
    modifier: 'ctrl' as const,
  },
  'f': {
    key: 'f',
    description: 'Toggle filters',
    action: actions.onToggleFilters,
    modifier: 'ctrl' as const,
  },
})

// Keyboard shortcuts help component
export function KeyboardShortcutsHelp({ shortcuts }: { shortcuts: KeyboardShortcut[] }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        const target = event.target as HTMLElement
        if (
          target.tagName !== 'INPUT' &&
          target.tagName !== 'TEXTAREA' &&
          target.contentEditable !== 'true'
        ) {
          event.preventDefault()
          setIsOpen(true)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.modifier && (
                  <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">
                    {shortcut.modifier === 'ctrl' ? 'Ctrl' : 
                     shortcut.modifier === 'alt' ? 'Alt' :
                     shortcut.modifier === 'shift' ? 'Shift' :
                     shortcut.modifier === 'meta' ? 'Cmd' : ''}
                  </kbd>
                )}
                <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">
                  {shortcut.key.toUpperCase()}
                </kbd>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t text-xs text-gray-500">
          Press <kbd className="px-1 py-0.5 text-xs bg-gray-100 rounded">?</kbd> to toggle this help
        </div>
      </div>
    </div>
  )
}

// Hook for showing keyboard shortcuts toast
export function useKeyboardShortcutsToast() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        const target = event.target as HTMLElement
        if (
          target.tagName !== 'INPUT' &&
          target.tagName !== 'TEXTAREA' &&
          target.contentEditable !== 'true'
        ) {
          event.preventDefault()
          toast.info('Press ? to see keyboard shortcuts', {
            duration: 2000,
          })
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}
