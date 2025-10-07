# hCaptcha Usage Examples

Real-world examples of using hCaptcha in your forms.

## Example 1: Simple Contact Form

```tsx
'use client'

import { useState } from 'react'
import { HCaptcha } from '@/components/ui/hcaptcha'
import { useHCaptcha } from '@/hooks/use-hcaptcha'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function ContactForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { 
    captchaToken, 
    captchaKey, 
    handleCaptchaVerify, 
    resetCaptcha,
    isReadyToSubmit 
  } = useHCaptcha()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if captcha is required and completed
    if (!isReadyToSubmit()) {
      toast.error('Please complete the security verification')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          message,
          captchaToken // Include token if captcha is configured
        })
      })

      if (!response.ok) throw new Error('Failed to send message')

      toast.success('Message sent successfully!')
      setEmail('')
      setMessage('')
      resetCaptcha() // Reset captcha for next submission
    } catch (error) {
      toast.error('Failed to send message. Please try again.')
      resetCaptcha() // Reset captcha on error
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      
      <textarea
        placeholder="Your message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        className="w-full p-2 border rounded"
        rows={4}
      />

      <HCaptcha 
        key={captchaKey}
        onVerify={handleCaptchaVerify}
        onExpire={resetCaptcha}
      />

      <Button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  )
}
```

## Example 2: Newsletter Signup

```tsx
'use client'

import { useState } from 'react'
import { HCaptcha } from '@/components/ui/hcaptcha'
import { useHCaptcha } from '@/hooks/use-hcaptcha'

export default function NewsletterForm() {
  const [email, setEmail] = useState('')
  const { captchaToken, captchaKey, handleCaptchaVerify, resetCaptcha } = useHCaptcha()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Your submission logic
    await subscribeToNewsletter(email, captchaToken)
    
    // Reset for next use
    setEmail('')
    resetCaptcha()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />

      {/* Compact size for sidebars/footers */}
      <HCaptcha 
        key={captchaKey}
        onVerify={handleCaptchaVerify}
        onExpire={resetCaptcha}
        size="compact"
        showLabel={false}
      />

      <button type="submit">Subscribe</button>
    </form>
  )
}
```

## Example 3: Custom Error Handling

```tsx
'use client'

import { useState } from 'react'
import { HCaptcha } from '@/components/ui/hcaptcha'
import { useHCaptcha } from '@/hooks/use-hcaptcha'
import { toast } from 'sonner'

export default function AdvancedForm() {
  const { captchaToken, captchaKey, handleCaptchaVerify, resetCaptcha } = useHCaptcha()
  const [captchaError, setCaptchaError] = useState<string>('')

  const handleCaptchaError = (error: any) => {
    console.error('Captcha error:', error)
    setCaptchaError('Security verification failed. Please try again.')
    toast.error('Verification failed. Please try again.')
  }

  const handleCaptchaExpire = () => {
    setCaptchaError('Verification expired. Please verify again.')
    resetCaptcha()
  }

  const handleVerify = (token: string) => {
    setCaptchaError('') // Clear any errors
    handleCaptchaVerify(token)
    toast.success('Security verification complete!')
  }

  return (
    <form>
      {/* Your form fields */}

      <HCaptcha 
        key={captchaKey}
        onVerify={handleVerify}
        onExpire={handleCaptchaExpire}
        onError={handleCaptchaError}
      />

      {captchaError && (
        <div className="text-red-600 text-sm mt-2">
          {captchaError}
        </div>
      )}

      <button type="submit">Submit</button>
    </form>
  )
}
```

## Example 4: Dark Theme Form

```tsx
'use client'

import { HCaptcha } from '@/components/ui/hcaptcha'
import { useHCaptcha } from '@/hooks/use-hcaptcha'

export default function DarkThemedForm() {
  const { captchaToken, captchaKey, handleCaptchaVerify, resetCaptcha } = useHCaptcha()

  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      <form className="space-y-4">
        {/* Your dark-themed form fields */}

        <HCaptcha 
          key={captchaKey}
          onVerify={handleCaptchaVerify}
          onExpire={resetCaptcha}
          theme="dark"  // Use dark theme to match your design
        />

        <button type="submit">Submit</button>
      </form>
    </div>
  )
}
```

## Example 5: Multi-Step Form

```tsx
'use client'

import { useState } from 'react'
import { HCaptcha } from '@/components/ui/hcaptcha'
import { useHCaptcha } from '@/hooks/use-hcaptcha'

export default function MultiStepForm() {
  const [step, setStep] = useState(1)
  const { captchaToken, captchaKey, handleCaptchaVerify, resetCaptcha, isVerified } = useHCaptcha()

  const goToNextStep = () => {
    if (step === 2 && !isVerified) {
      alert('Please complete the security verification')
      return
    }
    setStep(step + 1)
  }

  return (
    <div>
      {step === 1 && (
        <div>
          {/* Step 1: Basic Info */}
          <input placeholder="Name" />
          <input placeholder="Email" />
          <button onClick={goToNextStep}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div>
          {/* Step 2: Security Verification */}
          <h3>Security Check</h3>
          
          <HCaptcha 
            key={captchaKey}
            onVerify={handleCaptchaVerify}
            onExpire={resetCaptcha}
          />

          <button onClick={goToNextStep} disabled={!isVerified}>
            Next
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          {/* Step 3: Confirmation */}
          <button>Submit</button>
        </div>
      )}
    </div>
  )
}
```

## Example 6: Password Reset Form

```tsx
'use client'

import { useState } from 'react'
import { HCaptcha } from '@/components/ui/hcaptcha'
import { useHCaptcha } from '@/hooks/use-hcaptcha'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export default function PasswordResetForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { captchaToken, captchaKey, handleCaptchaVerify, resetCaptcha } = useHCaptcha()

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)
    
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
        ...(captchaToken && { captchaToken }) // Only include if captcha is configured
      })

      if (error) throw error

      toast.success('Password reset email sent! Check your inbox.')
      setEmail('')
      resetCaptcha()
    } catch (error) {
      toast.error('Failed to send reset email. Please try again.')
      resetCaptcha() // Reset on error to allow retry
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handlePasswordReset} className="space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />

      <HCaptcha 
        key={captchaKey}
        onVerify={handleCaptchaVerify}
        onExpire={resetCaptcha}
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Reset Password'}
      </button>
    </form>
  )
}
```

## Example 7: API Route with Captcha Verification

```tsx
// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, message, captchaToken } = await request.json()

  // Only verify captcha if it's configured and provided
  if (process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY && captchaToken) {
    const isValid = await verifyCaptcha(captchaToken)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid captcha' },
        { status: 400 }
      )
    }
  }

  // Process the form submission
  // ... your logic here

  return NextResponse.json({ success: true })
}

async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY
  
  if (!secret) {
    console.warn('HCAPTCHA_SECRET_KEY not configured')
    return true // Allow submission if captcha not configured on server
  }

  try {
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}`
    })

    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error('Captcha verification error:', error)
    return false
  }
}
```

## Tips

### 1. Always Reset on Errors
```tsx
catch (error) {
  resetCaptcha() // ← Important!
  toast.error('Please try again')
}
```

### 2. Conditionally Include Token
```tsx
body: JSON.stringify({
  ...formData,
  ...(captchaToken && { captchaToken }) // Only include if exists
})
```

### 3. Use isReadyToSubmit Helper
```tsx
if (!isReadyToSubmit()) {
  toast.error('Please complete verification')
  return
}
```

### 4. Handle Both Client and Server
```tsx
// Client side
<HCaptcha onVerify={handleCaptchaVerify} />

// Server side
if (captchaToken) {
  await verifyCaptcha(captchaToken)
}
```

## Common Patterns

### Pattern 1: Form with Validation
```tsx
const validate = () => {
  if (!email) return 'Email required'
  if (!isReadyToSubmit()) return 'Complete verification'
  return null
}
```

### Pattern 2: Retry Logic
```tsx
const retry = () => {
  resetCaptcha()
  setCaptchaToken('')
  // Try submission again
}
```

### Pattern 3: Loading States
```tsx
const [captchaLoading, setCaptchaLoading] = useState(true)

<HCaptcha 
  onVerify={(token) => {
    handleCaptchaVerify(token)
    setCaptchaLoading(false)
  }}
/>
```

## Summary

Key points for all examples:

1. ✅ Use `useHCaptcha()` hook
2. ✅ Always provide `key={captchaKey}`
3. ✅ Reset captcha after errors
4. ✅ Handle expiration with `onExpire`
5. ✅ Conditionally include token in requests
6. ✅ Validate on both client and server

**That's it!** Your forms are now protected with hCaptcha (when configured). 🎉

