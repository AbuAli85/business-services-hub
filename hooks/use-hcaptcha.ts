import { useState, useCallback } from 'react'

/**
 * Custom hook to simplify hCaptcha integration
 * 
 * @example
 * const { captchaToken, captchaKey, resetCaptcha, handleCaptchaVerify } = useHCaptcha()
 * 
 * <HCaptcha 
 *   key={captchaKey}
 *   onVerify={handleCaptchaVerify}
 *   onExpire={resetCaptcha}
 * />
 */
export function useHCaptcha() {
  const [captchaToken, setCaptchaToken] = useState<string>('')
  const [captchaKey, setCaptchaKey] = useState<number>(0)
  const [isVerified, setIsVerified] = useState<boolean>(false)

  /**
   * Handle captcha verification
   */
  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token)
    setIsVerified(true)
  }, [])

  /**
   * Reset captcha (useful for retrying after errors or expiration)
   */
  const resetCaptcha = useCallback(() => {
    setCaptchaToken('')
    setIsVerified(false)
    setCaptchaKey(prev => prev + 1)
  }, [])

  /**
   * Check if captcha is required and verified
   */
  const isCaptchaRequired = useCallback(() => {
    return !!process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
  }, [])

  /**
   * Check if form is ready to submit (considering captcha)
   */
  const isReadyToSubmit = useCallback(() => {
    if (!isCaptchaRequired()) {
      return true // No captcha required, always ready
    }
    return isVerified // Captcha required, check if verified
  }, [isVerified, isCaptchaRequired])

  return {
    captchaToken,
    captchaKey,
    isVerified,
    handleCaptchaVerify,
    resetCaptcha,
    isCaptchaRequired,
    isReadyToSubmit,
  }
}

/**
 * Type for the return value of useHCaptcha hook
 */
export type UseHCaptchaReturn = ReturnType<typeof useHCaptcha>

