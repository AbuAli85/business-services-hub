/**
 * Safe DOM manipulation utilities to prevent InvalidNodeTypeError
 */

export function safeRemoveChild(parent: Node | null, child: Node | null): boolean {
  try {
    if (parent && child && parent.contains(child)) {
      parent.removeChild(child)
      return true
    }
    return false
  } catch (error) {
    console.warn('Safe DOM removal failed:', error)
    return false
  }
}

export function safeAppendChild(parent: Node | null, child: Node | null): boolean {
  try {
    if (parent && child) {
      parent.appendChild(child)
      return true
    }
    return false
  } catch (error) {
    console.warn('Safe DOM append failed:', error)
    return false
  }
}

export function safeQuerySelector(selector: string, context: Document | Element = document): Element | null {
  try {
    return context.querySelector(selector)
  } catch (error) {
    console.warn('Safe querySelector failed:', error)
    return null
  }
}

export function safeAddEventListener(
  element: EventTarget | null,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions
): boolean {
  try {
    if (element) {
      element.addEventListener(event, handler, options)
      return true
    }
    return false
  } catch (error) {
    console.warn('Safe addEventListener failed:', error)
    return false
  }
}

export function safeRemoveEventListener(
  element: EventTarget | null,
  event: string,
  handler: EventListener,
  options?: EventListenerOptions
): boolean {
  try {
    if (element) {
      element.removeEventListener(event, handler, options)
      return true
    }
    return false
  } catch (error) {
    console.warn('Safe removeEventListener failed:', error)
    return false
  }
}

/**
 * Safe range selection utility
 */
export function safeSelectNode(node: Node | null): boolean {
  try {
    if (!node || !node.parentNode) {
      return false
    }
    
    const range = document.createRange()
    range.selectNode(node)
    const selection = window.getSelection()
    
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(range)
      return true
    }
    
    return false
  } catch (error) {
    console.warn('Safe node selection failed:', error)
    return false
  }
}

/**
 * Debounced function to prevent rapid DOM operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}
