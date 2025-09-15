/**
 * Production-safe logging utility
 * In development: logs everything
 * In production: only logs errors and warnings
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogConfig {
  level: LogLevel
  enableConsole: boolean
  enableProductionLogs: boolean
}

const config: LogConfig = {
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  enableConsole: true,
  enableProductionLogs: process.env.NODE_ENV === 'production'
}

const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    return logLevels[level] >= logLevels[config.level]
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    return `${prefix} ${message}`
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug') && config.enableConsole) {
      console.log(this.formatMessage('debug', message), ...args)
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info') && config.enableConsole) {
      console.info(this.formatMessage('info', message), ...args)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn') && config.enableConsole) {
      console.warn(this.formatMessage('warn', message), ...args)
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error') && config.enableConsole) {
      console.error(this.formatMessage('error', message), ...args)
    }
  }

  // Special method for API responses (only in development)
  apiResponse(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${message}`, data)
    }
  }

  // Special method for user actions (only in development)
  userAction(action: string, details?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[USER ACTION] ${action}`, details)
    }
  }

  // Special method for performance metrics (only in development)
  performance(operation: string, duration: number, details?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERFORMANCE] ${operation} took ${duration}ms`, details)
    }
  }
}

export const logger = new Logger()

// Export individual methods for convenience
export const { debug, info, warn, error, apiResponse, userAction, performance } = logger
