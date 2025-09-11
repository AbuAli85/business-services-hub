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
          'expired-callback': () => onError && onError('expired')
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
    <div>
      <div ref={containerRef} />
    </div>
  )
}


