# HCaptcha Component

> Easy-to-use hCaptcha component with automatic configuration detection

## Location
`components/ui/hcaptcha.tsx`

## Quick Start

```tsx
import { HCaptcha } from '@/components/ui/hcaptcha'
import { useHCaptcha } from '@/hooks/use-hcaptcha'

function MyForm() {
  const { captchaToken, captchaKey, handleCaptchaVerify, resetCaptcha } = useHCaptcha()

  return (
    <HCaptcha 
      key={captchaKey}
      onVerify={handleCaptchaVerify}
      onExpire={resetCaptcha}
    />
  )
}
```

## Features

- ✅ **Auto-detection** - Only renders if `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` is set
- ✅ **Loading states** - Shows spinner while loading
- ✅ **Success indicator** - Green checkmark when verified
- ✅ **Error handling** - Clear error messages with retry
- ✅ **Auto-reset** - Automatically resets on expiration
- ✅ **TypeScript** - Full type definitions
- ✅ **Accessible** - Proper labels and ARIA attributes

## Props

```typescript
type HCaptchaProps = {
  onVerify: (token: string) => void  // Required: Called when verified
  onExpire?: () => void               // Optional: Called when expired
  onError?: (error?: any) => void     // Optional: Called on error
  siteKey?: string                    // Optional: Override env site key
  theme?: 'light' | 'dark'            // Optional: Visual theme (default: 'light')
  size?: 'normal' | 'compact'         // Optional: Size variant (default: 'normal')
  showLabel?: boolean                 // Optional: Show label (default: true)
}
```

## States

The component has 6 internal states:

1. **idle** - Initial state
2. **loading** - Loading hCaptcha script
3. **ready** - Ready for user interaction
4. **verified** - Successfully verified ✅
5. **error** - Error occurred ⚠️
6. **expired** - Verification expired ⏰

## Examples

### Basic
```tsx
<HCaptcha onVerify={(token) => setToken(token)} />
```

### With Expiration Handler
```tsx
<HCaptcha 
  onVerify={handleVerify}
  onExpire={handleExpire}
/>
```

### Dark Theme
```tsx
<HCaptcha theme="dark" onVerify={handleVerify} />
```

### Compact Size
```tsx
<HCaptcha size="compact" showLabel={false} onVerify={handleVerify} />
```

### Custom Error Handling
```tsx
<HCaptcha 
  onVerify={handleVerify}
  onError={(error) => console.error('Captcha error:', error)}
/>
```

## Best Practices

### ✅ Do

- Use with `useHCaptcha()` hook for consistency
- Always provide `key` prop for proper re-renders
- Reset captcha after form submission errors
- Handle `onExpire` callback

### ❌ Don't

- Don't reuse captcha tokens
- Don't hardcode site keys
- Don't forget error handling

## Configuration

### Environment Variable

```env
# .env.local
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_site_key_here
```

### Get Site Key

1. Sign up at [hCaptcha.com](https://www.hcaptcha.com/)
2. Create a site
3. Copy the site key

### Testing Key

```env
# Test key that always passes
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001
```

## Related Files

- **Hook**: `hooks/use-hcaptcha.ts` - Custom hook for easy state management
- **Validation**: `lib/signup-validation.ts` - Form validation with captcha
- **Examples**: `docs/hcaptcha-examples.md` - Real-world usage examples

## Documentation

- 📖 **Full Guide**: `docs/hcaptcha-guide.md`
- 💡 **Examples**: `docs/hcaptcha-examples.md`
- ⚡ **Cheatsheet**: `docs/hcaptcha-cheatsheet.md`
- 📊 **Improvements**: `docs/HCAPTCHA_IMPROVEMENTS.md`

## Support

Need help? Check the documentation or review the source code!

