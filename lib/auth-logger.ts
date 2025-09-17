import { logger } from './logger'

export interface AuthEvent {
  event: string
  userId?: string
  email?: string
  role?: string
  success: boolean
  error?: string
  metadata?: Record<string, any>
  timestamp: string
  sessionId?: string
}

export interface ProfileCreationEvent extends AuthEvent {
  event: 'profile_creation'
  profileId?: string
  companyId?: string
  source: 'webhook' | 'onboarding' | 'fallback'
}

export interface LoginEvent extends AuthEvent {
  event: 'login_attempt' | 'login_success' | 'login_failure'
  attemptCount?: number
  rateLimited?: boolean
  method: 'password' | 'oauth' | 'callback'
}

export interface OnboardingEvent extends AuthEvent {
  event: 'onboarding_start' | 'onboarding_step' | 'onboarding_complete' | 'onboarding_abandoned'
  step?: number
  totalSteps?: number
  completionPercentage?: number
}

class AuthLogger {
  private logEvent(event: AuthEvent) {
    const logData = {
      ...event,
      environment: process.env.NODE_ENV,
      service: 'auth-workflow'
    }

    if (event.success) {
      logger.info(`Auth Event: ${event.event}`, logData)
    } else {
      logger.error(`Auth Event: ${event.event}`, logData)
    }

    // Send to monitoring service (Sentry, Datadog, etc.)
    this.sendToMonitoring(event)
  }

  private sendToMonitoring(event: AuthEvent) {
    // Integration point for monitoring services
    if (typeof window !== 'undefined') {
      // Client-side monitoring
      if (window.gtag) {
        window.gtag('event', event.event, {
          event_category: 'auth',
          event_label: event.success ? 'success' : 'failure',
          value: event.success ? 1 : 0,
          custom_parameters: event.metadata
        })
      }
    }

    // Server-side monitoring
    if (process.env.SENTRY_DSN) {
      // Sentry integration
      console.log('Sentry event:', event)
    }
  }

  // Profile Creation Events
  logProfileCreation(event: Omit<ProfileCreationEvent, 'event' | 'timestamp'>) {
    this.logEvent({
      ...event,
      event: 'profile_creation',
      timestamp: new Date().toISOString()
    })
  }

  // Login Events
  logLoginAttempt(event: Omit<LoginEvent, 'event' | 'timestamp'>) {
    this.logEvent({
      ...event,
      event: 'login_attempt',
      timestamp: new Date().toISOString()
    })
  }

  logLoginSuccess(event: Omit<LoginEvent, 'event' | 'timestamp'>) {
    this.logEvent({
      ...event,
      event: 'login_success',
      timestamp: new Date().toISOString()
    })
  }

  logLoginFailure(event: Omit<LoginEvent, 'event' | 'timestamp'>) {
    this.logEvent({
      ...event,
      event: 'login_failure',
      timestamp: new Date().toISOString()
    })
  }

  // Onboarding Events
  logOnboardingStart(event: Omit<OnboardingEvent, 'event' | 'timestamp'>) {
    this.logEvent({
      ...event,
      event: 'onboarding_start',
      timestamp: new Date().toISOString()
    })
  }

  logOnboardingStep(event: Omit<OnboardingEvent, 'event' | 'timestamp'>) {
    this.logEvent({
      ...event,
      event: 'onboarding_step',
      timestamp: new Date().toISOString()
    })
  }

  logOnboardingComplete(event: Omit<OnboardingEvent, 'event' | 'timestamp'>) {
    this.logEvent({
      ...event,
      event: 'onboarding_complete',
      timestamp: new Date().toISOString()
    })
  }

  // Rate Limiting Events
  logRateLimit(event: {
    userId?: string
    email?: string
    ip: string
    endpoint: string
    attempts: number
    blocked: boolean
  }) {
    this.logEvent({
      event: 'rate_limit',
      userId: event.userId,
      email: event.email,
      success: !event.blocked,
      metadata: {
        ip: event.ip,
        endpoint: event.endpoint,
        attempts: event.attempts,
        blocked: event.blocked
      },
      timestamp: new Date().toISOString()
    })
  }

  // Auth Callback Events
  logAuthCallback(event: {
    success: boolean
    method: 'oauth' | 'email_verification'
    provider?: string
    userId?: string
    error?: string
    redirectTo?: string
  }) {
    this.logEvent({
      event: 'auth_callback',
      userId: event.userId,
      success: event.success,
      error: event.error,
      metadata: {
        method: event.method,
        provider: event.provider,
        redirectTo: event.redirectTo
      },
      timestamp: new Date().toISOString()
    })
  }
}

export const authLogger = new AuthLogger()

// Type declarations for global objects
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}
