import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'

/**
 * Safely format a date string or Date object
 * Returns a fallback string if the date is invalid
 */
export function safeFormatDate(date: string | Date | null | undefined, formatString: string = 'MMM dd, yyyy'): string {
  if (!date) return 'No date'
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    // Check if the date is valid
    if (!isValid(dateObj)) {
      console.warn('Invalid date provided to safeFormatDate:', date)
      return 'Invalid date'
    }
    
    return format(dateObj, formatString)
  } catch (error) {
    console.warn('Error formatting date:', error, 'Date:', date)
    return 'Invalid date'
  }
}

/**
 * Safely format a date for distance display (e.g., "2 hours ago")
 * Returns a fallback string if the date is invalid
 */
export function safeFormatDistanceToNow(date: string | Date | null | undefined, options?: { addSuffix?: boolean }): string {
  if (!date) return 'Unknown time'
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    // Check if the date is valid
    if (!isValid(dateObj)) {
      console.warn('Invalid date provided to safeFormatDistanceToNow:', date)
      return 'Invalid date'
    }
    
    return formatDistanceToNow(dateObj, options)
  } catch (error) {
    console.warn('Error formatting date distance:', error, 'Date:', date)
    return 'Invalid date'
  }
}

/**
 * Safely parse an ISO date string
 * Returns null if the date is invalid
 */
export function safeParseISO(dateString: string | null | undefined): Date | null {
  if (!dateString) return null
  
  try {
    const date = parseISO(dateString)
    return isValid(date) ? date : null
  } catch (error) {
    console.warn('Error parsing ISO date:', error, 'Date string:', dateString)
    return null
  }
}

/**
 * Check if a date string is valid
 */
export function isValidDateString(dateString: string | null | undefined): boolean {
  if (!dateString) return false
  
  try {
    const date = new Date(dateString)
    return isValid(date)
  } catch {
    return false
  }
}
