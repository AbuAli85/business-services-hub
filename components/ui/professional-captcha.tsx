"use client"

import { useEffect, useRef, useState } from 'react'
import { Shield, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'
import { Button } from './button'

type ProfessionalCaptchaProps = {
  siteKey?: string
  onVerify?: (token: string) => void
  onError?: (error?: any) => void
  theme?: 'light' | 'dark'
  size?: 'compact' | 'normal'
  className?: string
}

declare global {
  interface Window {
    hcaptcha?: any
  }
}

export function ProfessionalCaptcha({ 
  siteKey, 
  onVerify, 
  onError, 
  theme = 'light',
  size = 'normal',
  className = ''
}: ProfessionalCaptchaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<number | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const key = siteKey || process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
    if (!key) return

    function render() {
      if (!window.hcaptcha || !containerRef.current) return
      if (widgetIdRef.current !== null) return
      
      setIsLoading(true)
      
      try {
        widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
          sitekey: key,
          theme,
          size,
          callback: (token: string) => {
            setIsVerified(true)
            setIsLoading(false)
            setError(null)
            onVerify?.(token)
          },
          'error-callback': () => {
            setError('Verification failed. Please try again.')
            setIsLoading(false)
            onError?.()
          },
          'expired-callback': () => {
            setIsVerified(false)
            setError('Verification expired. Please verify again.')
            onError?.('expired')
          }
        })
      } catch (e) {
        setError('Failed to load verification. Please refresh the page.')
        setIsLoading(false)
        onError?.(e)
      }
    }

    if (window.hcaptcha) {
      render()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://js.hcaptcha.com/1/api.js?onload=hCaptchaOnLoad&render=explicit'
    script.async = true
    script.onload = () => setIsLoading(false)
    ;(window as any).hCaptchaOnLoad = render
    document.head.appendChild(script)

    return () => {
      try {
        if (script && script.parentNode) script.parentNode.removeChild(script)
      } catch {}
    }
  }, [siteKey, onVerify, onError, theme, size])

  const resetCaptcha = () => {
    if (widgetIdRef.current !== null && window.hcaptcha) {
      try {
        window.hcaptcha.reset(widgetIdRef.current)
        setIsVerified(false)
        setError(null)
      } catch (e) {
        console.error('Failed to reset captcha:', e)
      }
    }
  }

  return (
    <div className={`professional-captcha ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Security Verification</span>
          </div>
          {isVerified && (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs">{error}</span>
            </div>
          </div>
        )}

        {isVerified && (
          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-3 w-3" />
              <span className="text-xs">Verification completed successfully</span>
            </div>
          </div>
        )}

        {/* Captcha Widget Container */}
        <div className="flex justify-center">
          <div 
            ref={containerRef} 
            className="captcha-widget-container"
            style={{
              borderRadius: '6px',
              overflow: 'hidden',
              minHeight: size === 'compact' ? '78px' : '100px'
            }}
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center mt-3">
            <div className="flex items-center gap-2 text-gray-500">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span className="text-xs">Loading verification...</span>
            </div>
          </div>
        )}

        {/* Reset Button */}
        {!isLoading && (
          <div className="flex justify-center mt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetCaptcha}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reset verification
            </Button>
          </div>
        )}
      </div>

      <style jsx>{`
        .professional-captcha {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .captcha-widget-container iframe {
          border-radius: 6px !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
        }
        
        .captcha-widget-container :global(.h-captcha) {
          border-radius: 6px !important;
          overflow: hidden !important;
        }
        
        .captcha-widget-container :global(.h-captcha) iframe {
          border-radius: 6px !important;
        }
      `}</style>
    </div>
  )
}
