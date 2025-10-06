"use client"

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Shield, CheckCircle } from 'lucide-react'

type HCaptchaProps = {
  siteKey?: string
  onVerify: (token: string) => void
  onError?: (error?: any) => void
  onExpire?: () => void
  theme?: 'light' | 'dark'
  size?: 'normal' | 'compact'
  showLabel?: boolean
}

declare global {
  interface Window {
    hcaptcha?: any
  }
}

export function HCaptcha({ 
  siteKey, 
  onVerify, 
  onError, 
  onExpire,
  theme = 'light',
  size = 'normal',
  showLabel = true
}: HCaptchaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'verified' | 'error' | 'expired'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const key = siteKey || process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY

  // Don't render if no site key is configured
  if (!key) {
    return null
  }

  const handleVerify = (token: string) => {
    setStatus('verified')
    setErrorMessage('')
    onVerify(token)
  }

  const handleError = (error?: any) => {
    setStatus('error')
    setErrorMessage('Verification failed. Please try again.')
    if (onError) onError(error)
  }

  const handleExpire = () => {
    setStatus('expired')
    setErrorMessage('Verification expired. Please verify again.')
    if (onExpire) onExpire()
    
    // Auto-reset after expiration
    setTimeout(() => {
      if (window.hcaptcha && widgetIdRef.current !== null) {
        try {
          window.hcaptcha.reset(widgetIdRef.current)
          setStatus('ready')
          setErrorMessage('')
        } catch (e) {
          console.error('Failed to reset hCaptcha:', e)
        }
      }
    }, 1000)
  }

  useEffect(() => {
    if (!key) return

    function render() {
      if (!window.hcaptcha || !containerRef.current) return
      if (widgetIdRef.current !== null) return
      
      try {
        setStatus('loading')
        widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
          sitekey: key,
          theme,
          size,
          callback: handleVerify,
          'error-callback': handleError,
          'expired-callback': handleExpire
        })
        setStatus('ready')
      } catch (e) {
        console.error('hCaptcha render error:', e)
        handleError(e)
      }
    }

    if (window.hcaptcha) {
      render()
      return
    }

    // Load hCaptcha script
    setStatus('loading')
    const script = document.createElement('script')
    script.src = 'https://js.hcaptcha.com/1/api.js?onload=hCaptchaOnLoad&render=explicit'
    script.async = true
    ;(window as any).hCaptchaOnLoad = render
    document.head.appendChild(script)

    return () => {
      try {
        if (widgetIdRef.current !== null && window.hcaptcha) {
          window.hcaptcha.remove(widgetIdRef.current)
          widgetIdRef.current = null
        }
        if (script && script.parentNode) {
          script.parentNode.removeChild(script)
        }
      } catch (e) {
        console.error('hCaptcha cleanup error:', e)
      }
    }
  }, [key, theme, size])

  return (
    <div className="space-y-2">
      {/* Optional Label */}
      {showLabel && (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Security Verification</span>
          {status === 'verified' && (
            <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
          )}
        </div>
      )}

      {/* hCaptcha Container */}
      <div className={`relative ${size === 'compact' ? 'h-[78px]' : 'h-[78px]'}`}>
        <div ref={containerRef} className="flex justify-start" />
        
        {/* Loading State */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-xs text-gray-600">Loading verification...</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{errorMessage}</p>
            <button
              onClick={() => {
                if (window.hcaptcha && widgetIdRef.current !== null) {
                  window.hcaptcha.reset(widgetIdRef.current)
                  setStatus('ready')
                  setErrorMessage('')
                }
              }}
              className="text-xs text-red-600 hover:text-red-800 font-medium mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Info Message */}
      {status === 'ready' && !errorMessage && showLabel && (
        <p className="text-xs text-gray-500">
          Please complete the verification to continue
        </p>
      )}
    </div>
  )
}


