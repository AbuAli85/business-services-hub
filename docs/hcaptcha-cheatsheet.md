# hCaptcha Quick Reference

> One-page cheat sheet for hCaptcha integration

## 🚀 Quick Setup (2 Steps)

```bash
# 1. Add to .env.local (optional - leave blank to disable)
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_site_key_here

# 2. Restart dev server
npm run dev
```

**That's it!** Captcha automatically appears when configured.

---

## 💻 Basic Usage

```tsx
import { HCaptcha } from '@/components/ui/hcaptcha'
import { useHCaptcha } from '@/hooks/use-hcaptcha'

function MyForm() {
  const { captchaToken, captchaKey, handleCaptchaVerify, resetCaptcha } = useHCaptcha()

  return (
    <form onSubmit={handleSubmit}>
      {/* Your fields here */}
      
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

---

## 🎛️ Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onVerify` | `function` | **required** | `(token) => void` |
| `onExpire` | `function` | optional | `() => void` |
| `onError` | `function` | optional | `(error) => void` |
| `theme` | `string` | `'light'` | `'light' \| 'dark'` |
| `size` | `string` | `'normal'` | `'normal' \| 'compact'` |
| `showLabel` | `boolean` | `true` | Show label |

---

## 🪝 Hook API

```tsx
const {
  captchaToken,        // Current token (string)
  captchaKey,          // For React key (number)
  isVerified,          // Is verified? (boolean)
  handleCaptchaVerify, // Verify callback (function)
  resetCaptcha,        // Reset function (function)
  isCaptchaRequired,   // Is configured? (function)
  isReadyToSubmit,     // Ready to submit? (function)
} = useHCaptcha()
```

---

## ✅ Common Patterns

### Submit Handler
```tsx
const handleSubmit = async (e) => {
  e.preventDefault()
  
  if (!isReadyToSubmit()) {
    toast.error('Please complete verification')
    return
  }
  
  try {
    await submitForm({ ...data, captchaToken })
    resetCaptcha() // Reset for next use
  } catch (error) {
    resetCaptcha() // Reset on error
  }
}
```

### Conditional Token
```tsx
body: JSON.stringify({
  email,
  message,
  ...(captchaToken && { captchaToken }) // Only if exists
})
```

### Dark Theme
```tsx
<HCaptcha theme="dark" />
```

### Compact Size
```tsx
<HCaptcha size="compact" showLabel={false} />
```

### Custom Errors
```tsx
<HCaptcha 
  onError={(err) => toast.error('Verification failed')}
  onExpire={() => toast.warning('Verification expired')}
/>
```

---

## 🧪 Testing

### No Captcha (Development)
```env
# Leave blank or commented
# NEXT_PUBLIC_HCAPTCHA_SITE_KEY=
```

### Test Key (Always Passes)
```env
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001
```

### Production
```env
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_real_key
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Not showing | Check env var, restart server |
| Always failing | Verify site key, check console |
| Already seen | Use `resetCaptcha()` |
| Expired | Auto-resets after 1 second |

---

## 📚 Documentation

- **Full Guide**: `docs/hcaptcha-guide.md`
- **Examples**: `docs/hcaptcha-examples.md`
- **Improvements**: `docs/HCAPTCHA_IMPROVEMENTS.md`

---

## 🎯 Key Points

1. ✅ **Optional** - works without config
2. ✅ **Auto-shows** - when configured
3. ✅ **Auto-hides** - when not configured
4. ✅ **Auto-resets** - on expiration
5. ✅ **Easy to use** - custom hook included

---

## 💡 Remember

- Always use `key={captchaKey}` prop
- Reset captcha after errors
- Handle expiration with `onExpire`
- Include token conditionally in API calls
- Validate on server-side too

---

**Need more help?** Check the full documentation! 📖

