"use client"

import { useEffect, useRef } from 'react'

type HCaptchaProps = {
  siteKey?: string
  onVerify: (token: string) => void
  onError?: (error?: any) => void
  theme?: 'light' | 'dark'
}

declare global {
  interface Window {
    hcaptcha?: any
  }
}

export function HCaptcha({ siteKey, onVerify, onError, theme = 'light' }: HCaptchaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<number | null>(null)

  useEffect(() => {
    const key = siteKey || process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
    if (!key) return

    function render() {
      if (!window.hcaptcha || !containerRef.current) return
      if (widgetIdRef.current !== null) return
      try {
        widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
          sitekey: key,
          theme,
          callback: (token: string) => onVerify(token),
          'error-callback': () => onError && onError(),
          'expired-callback': () => onError && onError('expired'),
          // Professional styling options
          size: 'normal',
          tabindex: 0
        })
      } catch (e) {
        onError && onError(e)
      }
    }

    if (window.hcaptcha) {
      render()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://js.hcaptcha.com/1/api.js?onload=hCaptchaOnLoad&render=explicit'
    script.async = true
    ;(window as any).hCaptchaOnLoad = render
    document.head.appendChild(script)

    return () => {
      try {
        if (script && script.parentNode) script.parentNode.removeChild(script)
      } catch {}
    }
  }, [siteKey, onVerify, onError, theme])

  return (
    <div className="captcha-container">
      <div 
        ref={containerRef} 
        className="hcaptcha-widget"
        style={{
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          backgroundColor: '#ffffff'
        }}
      />
      <style jsx>{`
        .captcha-container {
          display: flex;
          justify-content: center;
          margin: 16px 0;
        }
        .hcaptcha-widget iframe {
          border-radius: 8px !important;
        }
        .hcaptcha-widget :global(.h-captcha) {
          border-radius: 8px !important;
          overflow: hidden !important;
        }
      `}</style>
    </div>
  )
}


