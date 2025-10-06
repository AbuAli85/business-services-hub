# hCaptcha Integration Guide

Complete guide to using hCaptcha in the Business Services Hub application.

## Overview

hCaptcha is **completely optional** in this application. It will only appear if you configure it. Without configuration, forms work normally without any captcha verification.

## Quick Start

### 1. **No Configuration Required** ✅

By default, hCaptcha is **disabled**. Your app works perfectly without it!

### 2. **Enable hCaptcha (Optional)**

If you want to add bot protection:

1. Get a free hCaptcha account at [hCaptcha.com](https://www.hcaptcha.com/)
2. Get your site key from the dashboard
3. Add it to your `.env.local` file:

```env
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_site_key_here
```

That's it! hCaptcha will automatically appear on sign-in and sign-up forms.

## Features

### ✨ Easy to Use

- **Zero config by default** - works without hCaptcha
- **Auto-shows when configured** - no code changes needed
- **Auto-hides when not configured** - seamless UX
- **Auto-reset on expiration** - users never get stuck
- **Visual feedback** - loading states, success indicators, error messages
- **One-click retry** - easy recovery from errors

### 🎨 User-Friendly UI

- **Clear labels** - "Security Verification" with shield icon
- **Loading states** - spinner while captcha loads
- **Success indicator** - green checkmark when verified
- **Error handling** - helpful error messages with retry button
- **Responsive design** - works on all screen sizes

### 🔧 Developer-Friendly

- **Custom hook** - `useHCaptcha()` for easy integration
- **TypeScript support** - full type definitions
- **Flexible props** - customize theme, size, labels
- **Automatic cleanup** - no memory leaks

## Usage Examples

### Basic Usage (Recommended)

The simplest way to use hCaptcha:

```tsx
import { HCaptcha } from '@/components/ui/hcaptcha'
import { useHCaptcha } from '@/hooks/use-hcaptcha'

function MyForm() {
  const { captchaToken, captchaKey, handleCaptchaVerify, resetCaptcha } = useHCaptcha()
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}
      
      <HCaptcha 
        key={captchaKey}
        onVerify={handleCaptchaVerify}
        onExpire={resetCaptcha}
      />
      
      <button type="submit">Submit</button>
    </form>
  )
}
```

### Advanced Usage

With custom options:

```tsx
<HCaptcha 
  key={captchaKey}
  onVerify={handleCaptchaVerify}
  onExpire={resetCaptcha}
  onError={(error) => console.error('Captcha error:', error)}
  theme="dark"              // 'light' or 'dark'
  size="compact"            // 'normal' or 'compact'
  showLabel={false}         // Hide the label
/>
```

### Using the Custom Hook

The `useHCaptcha` hook provides everything you need:

```tsx
const {
  captchaToken,        // Current captcha token
  captchaKey,          // Key for React (use in HCaptcha component)
  isVerified,          // Boolean: is captcha verified?
  handleCaptchaVerify, // Callback for onVerify
  resetCaptcha,        // Function to reset captcha
  isCaptchaRequired,   // Function: is captcha configured?
  isReadyToSubmit      // Function: can form be submitted?
} = useHCaptcha()

// Check if form is ready to submit
if (!isReadyToSubmit()) {
  toast.error('Please complete the security verification')
  return
}
```

## Component Props

### HCaptcha Component

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onVerify` | `(token: string) => void` | **Required** | Called when captcha is verified |
| `onExpire` | `() => void` | Optional | Called when captcha expires |
| `onError` | `(error?: any) => void` | Optional | Called on error |
| `siteKey` | `string` | From env | Override site key |
| `theme` | `'light' \| 'dark'` | `'light'` | Visual theme |
| `size` | `'normal' \| 'compact'` | `'normal'` | Size variant |
| `showLabel` | `boolean` | `true` | Show label and help text |

## How It Works

### 1. **Automatic Detection**

The component automatically checks for `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`:

- **Not configured** → Component returns `null` (doesn't render)
- **Configured** → Component renders with captcha

### 2. **Smart Validation**

The validation system automatically adapts:

```typescript
// In lib/signup-validation.ts
if (hasCaptchaKey && !captchaToken) {
  errors.captcha = 'Please complete the security verification'
}
```

### 3. **Auto-Reset on Expiration**

When captcha expires, it automatically resets after 1 second:

```typescript
// In components/ui/hcaptcha.tsx
const handleExpire = () => {
  setStatus('expired')
  setTimeout(() => {
    window.hcaptcha.reset(widgetIdRef.current)
    setStatus('ready')
  }, 1000)
}
```

## Styling

The component uses Tailwind CSS and adapts to your theme:

```tsx
// Light theme (default)
<HCaptcha theme="light" />

// Dark theme
<HCaptcha theme="dark" />

// Compact size for tight spaces
<HCaptcha size="compact" />

// No label (minimal)
<HCaptcha showLabel={false} />
```

## Error Handling

The component handles errors gracefully:

- **Load errors** - Shows loading message
- **Verification errors** - Shows error with retry button
- **Expiration** - Auto-resets and shows message
- **Network errors** - Provides clear feedback

### Example Error Handling

```tsx
<HCaptcha 
  onVerify={handleCaptchaVerify}
  onError={(error) => {
    console.error('Captcha error:', error)
    toast.error('Verification failed. Please try again.')
  }}
  onExpire={() => {
    setCaptchaToken('')
    toast.warning('Verification expired. Please verify again.')
  }}
/>
```

## Testing

### Development (No Captcha)

For development, simply don't set the env variable:

```env
# .env.local - Development
# NEXT_PUBLIC_HCAPTCHA_SITE_KEY=    <- Leave commented out
```

Forms work normally without captcha!

### Production (With Captcha)

For production, add your site key:

```env
# .env.production
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_production_site_key
```

### Testing Captcha Locally

To test with captcha locally, use hCaptcha's test keys:

```env
# Test keys that always pass
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001
```

## Troubleshooting

### Captcha Not Showing

**Problem:** Captcha doesn't appear on forms

**Solutions:**
1. Check if `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` is set
2. Restart your dev server after adding env variable
3. Clear browser cache

### Captcha Always Failing

**Problem:** Verification always fails

**Solutions:**
1. Check if site key is correct
2. Verify domain is allowed in hCaptcha dashboard
3. Check browser console for errors

### "Already Seen Response" Error

**Problem:** Error when reusing captcha token

**Solution:** This is expected behavior. The component automatically resets the captcha when needed. Make sure you're using the `key={captchaKey}` prop to force re-render.

### Captcha Expired

**Problem:** "Verification expired" message

**Solution:** The component auto-resets after 1 second. User just needs to complete it again. No action needed.

## Best Practices

### ✅ Do's

- Use the `useHCaptcha` hook for consistency
- Always provide `onExpire` callback to handle expiration
- Reset captcha after form submission errors
- Show clear error messages to users
- Use `key={captchaKey}` prop for proper re-renders

### ❌ Don'ts

- Don't hardcode site keys in code
- Don't reuse captcha tokens
- Don't disable captcha without testing
- Don't forget to handle errors
- Don't show captcha if not configured

## Migration Guide

### From Old Implementation

If you're updating from the old implementation:

**Before:**
```tsx
const [captchaToken, setCaptchaToken] = useState<string>('')
const [captchaKey, setCaptchaKey] = useState<number>(0)

<HCaptcha key={captchaKey} onVerify={setCaptchaToken} />
```

**After:**
```tsx
const { captchaToken, captchaKey, handleCaptchaVerify, resetCaptcha } = useHCaptcha()

<HCaptcha 
  key={captchaKey}
  onVerify={handleCaptchaVerify}
  onExpire={resetCaptcha}
/>
```

## Performance

- **Lazy Loading**: Script loads only when needed
- **Single Instance**: One script tag for entire app
- **Auto Cleanup**: Proper cleanup on unmount
- **No Memory Leaks**: Refs properly managed

## Security Notes

1. **Site Key is Public**: The `NEXT_PUBLIC_*` prefix means it's exposed to browser
2. **Validate Server-Side**: Always validate captcha tokens on your backend
3. **Use HTTPS**: hCaptcha requires HTTPS in production
4. **Rotate Keys**: Change keys if compromised

## FAQ

**Q: Do I need hCaptcha?**
A: No! It's completely optional. Works great without it.

**Q: How much does hCaptcha cost?**
A: Free for most use cases. See [pricing](https://www.hcaptcha.com/pricing).

**Q: Can I use reCAPTCHA instead?**
A: The component is designed for hCaptcha, but you could adapt it.

**Q: Does it work with SSR?**
A: Yes! The component is client-side only (`"use client"`) and handles SSR properly.

**Q: Can I customize the appearance?**
A: Yes! Use `theme` and `size` props. For more customization, modify the component.

**Q: What happens if hCaptcha service is down?**
A: The component shows an error with retry button. Consider having a fallback plan for critical forms.

## Support

Need help?

1. Check this guide
2. Review the component code: `components/ui/hcaptcha.tsx`
3. Check the hook: `hooks/use-hcaptcha.ts`
4. See example usage in: `app/auth/sign-in/page.tsx`

## Summary

hCaptcha in this app is:

✅ **Optional** - works without configuration
✅ **Automatic** - shows when configured
✅ **User-Friendly** - clear UI and feedback
✅ **Developer-Friendly** - custom hook and TypeScript support
✅ **Production-Ready** - proper error handling and cleanup

**No configuration needed to get started!** 🚀

