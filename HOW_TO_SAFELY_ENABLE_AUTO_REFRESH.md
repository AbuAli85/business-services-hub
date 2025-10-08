# How to Safely Re-Enable Auto-Refresh (Future)

## ⚠️ WARNING: DO NOT DO THIS NOW

**Current Status**: Auto-Refresh is FORCE DISABLED for stability  
**Reason**: It caused constant reloading issues (see `LIVE_MODE_AUTO_REFRESH_FIX.md`)  
**Timeline**: Wait at least 1 week of stable operation before considering re-enabling

---

## Why It's Disabled

The Auto-Refresh "Live Mode" feature caused the dashboard to reload every 30 seconds because:
1. It persisted in `localStorage` 
2. Users couldn't easily disable it
3. It triggered refresh callbacks that caused component remounts
4. Combined with other issues, it made the dashboard unusable

**Solution**: Force disabled until properly tested with safeguards

---

## Requirements Before Re-Enabling

### 1. Stability Period
- [ ] Dashboard has been stable for at least 7 days
- [ ] No reports of reloading issues
- [ ] All other fixes have been verified working
- [ ] User feedback is positive

### 2. Feature Safeguards
- [ ] Feature flag implemented
- [ ] User consent modal on first enable
- [ ] Clear UI indicator when active
- [ ] Easy disable button (not just toggle)
- [ ] Maximum refresh limit per session
- [ ] Inactivity detection (auto-disable)
- [ ] Pause on user interaction

### 3. Testing Requirements
- [ ] Tested in development for 3+ days
- [ ] Tested with multiple browser tabs open
- [ ] Tested with slow network connections
- [ ] Tested with form interactions
- [ ] Memory leak testing (Chrome DevTools)
- [ ] Multiple user testing
- [ ] Load testing with real data

---

## Implementation Plan

### Step 1: Add Feature Flag

```typescript
// .env.local
NEXT_PUBLIC_ENABLE_AUTO_REFRESH=false  # Start disabled

// contexts/AutoRefreshContext.tsx
const FEATURE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_AUTO_REFRESH === 'true'

const [isLiveMode, setIsLiveMode] = useState(() => {
  if (!FEATURE_ENABLED) return false  // Feature flag check
  
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('dashboard-live-mode')
    return saved === 'true'
  }
  return false
})
```

### Step 2: Add User Consent

```typescript
// components/AutoRefreshConsentModal.tsx
export function AutoRefreshConsentModal({ onAccept, onDecline }: Props) {
  return (
    <Modal>
      <h2>Enable Auto-Refresh?</h2>
      <p>
        This will automatically refresh your dashboard data every 30 seconds.
        You can disable it anytime from the settings.
      </p>
      <ul>
        <li>✅ Always see the latest data</li>
        <li>⚠️ May interrupt form filling</li>
        <li>⚠️ Uses more bandwidth</li>
      </ul>
      <Checkbox>
        Don't show this again
      </Checkbox>
      <Button onClick={onAccept}>Enable</Button>
      <Button onClick={onDecline}>No Thanks</Button>
    </Modal>
  )
}
```

### Step 3: Add Safety Limits

```typescript
// contexts/AutoRefreshContext.tsx
const MAX_AUTO_REFRESHES = 10
const INACTIVITY_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const INTERACTION_PAUSE = 30000 // 30 seconds

export function AutoRefreshProvider({ children }: Props) {
  const autoRefreshCount = useRef(0)
  const lastInteractionTime = useRef(Date.now())
  const [isPaused, setIsPaused] = useState(false)

  // Reset on user interaction
  useEffect(() => {
    const handleInteraction = () => {
      lastInteractionTime.current = Date.now()
      setIsPaused(true)
      
      // Resume after 30 seconds of inactivity
      setTimeout(() => {
        const timeSince = Date.now() - lastInteractionTime.current
        if (timeSince >= INTERACTION_PAUSE) {
          setIsPaused(false)
        }
      }, INTERACTION_PAUSE)
    }

    window.addEventListener('mousemove', handleInteraction)
    window.addEventListener('keydown', handleInteraction)
    window.addEventListener('click', handleInteraction)
    window.addEventListener('scroll', handleInteraction)

    return () => {
      window.removeEventListener('mousemove', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('scroll', handleInteraction)
    }
  }, [])

  // Check inactivity
  useEffect(() => {
    if (!isLiveMode) return

    const interval = setInterval(() => {
      const timeSinceInteraction = Date.now() - lastInteractionTime.current
      if (timeSinceInteraction > INACTIVITY_TIMEOUT) {
        console.log('🛑 Auto-disabling due to inactivity')
        setIsLiveMode(false)
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [isLiveMode])

  // Modified triggerRefresh with limits
  const triggerRefresh = useCallback(async () => {
    if (isRefreshing || isPaused) return
    
    // Check refresh limit
    if (autoRefreshCount.current >= MAX_AUTO_REFRESHES) {
      console.warn('⚠️ Max auto-refresh limit reached, disabling')
      setIsLiveMode(false)
      return
    }

    autoRefreshCount.current++
    console.log(`🔄 Auto-refresh ${autoRefreshCount.current}/${MAX_AUTO_REFRESHES}`)
    
    // ... rest of refresh logic
  }, [isRefreshing, isPaused])

  // Reset counter when manually disabled
  useEffect(() => {
    if (!isLiveMode) {
      autoRefreshCount.current = 0
    }
  }, [isLiveMode])
}
```

### Step 4: Add Clear UI Indicators

```typescript
// components/AutoRefreshStatus.tsx
export function AutoRefreshStatus() {
  const { 
    isLiveMode, 
    isRefreshing, 
    lastRefreshTime,
    toggleLiveMode 
  } = useAutoRefresh()

  if (!isLiveMode) return null

  return (
    <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
      <div className="flex items-center gap-2">
        {isRefreshing ? (
          <Spinner className="animate-spin" />
        ) : (
          <Radio className="animate-pulse" />
        )}
        <span>Live Mode Active</span>
        <button 
          onClick={toggleLiveMode}
          className="ml-2 underline hover:no-underline"
        >
          Disable
        </button>
      </div>
      {lastRefreshTime && (
        <p className="text-xs mt-1 opacity-80">
          Last updated: {formatDistanceToNow(lastRefreshTime)} ago
        </p>
      )}
    </div>
  )
}
```

### Step 5: Add Form Protection

```typescript
// hooks/useFormProtection.ts
export function useFormProtection() {
  const { isLiveMode, setLiveMode } = useAutoRefresh()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    if (hasUnsavedChanges && isLiveMode) {
      // Pause auto-refresh while editing
      console.log('⏸️ Pausing auto-refresh due to unsaved changes')
      setLiveMode(false)
      
      toast.info('Auto-refresh paused while editing', {
        action: {
          label: 'Resume',
          onClick: () => setLiveMode(true)
        }
      })
    }
  }, [hasUnsavedChanges, isLiveMode])

  return { setHasUnsavedChanges }
}

// Usage in form:
function MyForm() {
  const { setHasUnsavedChanges } = useFormProtection()
  
  return (
    <form onChange={() => setHasUnsavedChanges(true)}>
      {/* form fields */}
    </form>
  )
}
```

---

## Testing Checklist

### Development Testing
- [ ] Enable feature flag in development
- [ ] Test enable/disable toggle multiple times
- [ ] Verify localStorage persistence
- [ ] Check console logs for proper intervals
- [ ] Monitor memory usage over 30 minutes
- [ ] Test with network throttling
- [ ] Verify pause on interaction works
- [ ] Test max refresh limit
- [ ] Test inactivity auto-disable
- [ ] Test with forms (should pause)

### User Acceptance Testing
- [ ] Test with 3+ real users
- [ ] Gather feedback on UX
- [ ] Check for any complaints about interruptions
- [ ] Verify users can easily disable it
- [ ] Monitor error rates
- [ ] Check support tickets

### Production Deployment
- [ ] Deploy with feature flag OFF
- [ ] Enable for internal users first (10%)
- [ ] Monitor for 24 hours
- [ ] Gradually increase to 50%
- [ ] Monitor for another 24 hours
- [ ] Enable for 100% if no issues
- [ ] Keep monitoring for a week

---

## Rollback Plan

If issues occur after enabling:

### Immediate Actions
1. Set `NEXT_PUBLIC_ENABLE_AUTO_REFRESH=false`
2. Deploy immediately
3. Clear localStorage for all users:
   ```javascript
   // Add to app on mount:
   localStorage.removeItem('dashboard-live-mode')
   ```

### Communication
1. Notify users via toast/banner
2. Apologize for interruption
3. Explain what happened
4. Provide timeline for fix

### Investigation
1. Check error logs
2. Review user reports
3. Identify root cause
4. Document findings
5. Update this guide

---

## Monitoring After Enabling

### Metrics to Track
- Auto-refresh enable rate
- Average session duration
- Disable rate
- Error rate during refresh
- Memory usage patterns
- User complaints/support tickets
- Page load times

### Alerts to Set Up
- Alert if refresh error rate > 5%
- Alert if disable rate > 50%
- Alert if memory usage > 200MB
- Alert if page load time > 5s

---

## Alternative Solutions

Instead of auto-refresh, consider:

### 1. **Manual Refresh Button**
- Always available
- User-controlled
- No interruption
- ✅ Currently implemented and working

### 2. **Real-Time Subscriptions** (Recommended)
- Only update when data actually changes
- No polling overhead
- More efficient
- ✅ Currently implemented for bookings/services/milestones

### 3. **Visible Staleness Indicator**
```typescript
// Show "Data is X minutes old" badge
// Prompt user to refresh if > 5 minutes
<Badge>
  Data is {timeSinceLoad} old
  <Button size="sm">Refresh Now</Button>
</Badge>
```

### 4. **Smart Refresh**
- Only refresh when tab becomes visible
- Only refresh after inactivity period
- Skip refresh if user is interacting

---

## Conclusion

**Current Recommendation**: 
- ❌ **DO NOT re-enable auto-refresh yet**
- ✅ **Keep using manual refresh button**
- ✅ **Keep using real-time subscriptions**
- ✅ **Wait for stable operation period**

**Future Recommendation**:
- When ready, follow this guide step-by-step
- Don't skip any safeguards
- Test thoroughly before production
- Have rollback plan ready

---

*Last Updated: October 8, 2025*  
*Status: Auto-Refresh DISABLED for stability*  
*Next Review: October 15, 2025 (earliest)*

