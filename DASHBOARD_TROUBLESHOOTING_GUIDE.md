# Dashboard Stability Troubleshooting Guide

## 🚨 Emergency Quick Fixes

### If Dashboard is Completely Broken:
```typescript
// 1. Disable auto-refresh temporarily
// useRefreshCallback(refresh, [refresh])

// 2. Use simple loading state
const [loading, setLoading] = useState(false)

// 3. Add kill switch
const DASHBOARD_ENABLED = process.env.NEXT_PUBLIC_DASHBOARD_ENABLED !== 'false'
if (!DASHBOARD_ENABLED) return <SimpleFallback />
```

## 🔍 Diagnostic Tools Available

### 1. **Debug Panel** (Development Only)
- **Location**: Bottom-right corner of dashboard
- **Shows**: Render count, active requests, memory usage
- **Warns**: High render counts, slow requests
- **Actions**: Clear request log, expand details

### 2. **Console Logging**
```javascript
// Render tracking
[MainDashboard] Render #3 (1247ms since mount)

// Request tracking  
→ [GET] /api/dashboard/stats
✅ [GET] /api/dashboard/stats - 200 (234ms)

// Dependency changes
[MyEffect] Dependencies changed: [
  { index: 0, name: "function", previous: f1, current: f2, changed: true }
]
```

### 3. **React DevTools Profiler**
- Install React DevTools extension
- Go to Profiler tab → Record → Interact → Stop
- Look for excessive renders and long render times

## 🐛 Common Issues & Solutions

### Issue: Infinite Render Loop
**Symptoms**: Render count keeps increasing, page freezes

**Debug Steps**:
1. Check Debug Panel render count
2. Look for console warnings: `⚠️ MainDashboard rendered 15 times!`
3. Check console trace for call stack

**Common Causes**:
```typescript
// ❌ BAD - Missing dependency
useEffect(() => {
  setData(fetchData())
}, []) // Missing fetchData dependency

// ❌ BAD - State update in render
function Component() {
  const [count, setCount] = useState(0)
  setCount(count + 1) // Causes infinite loop!
  return <div>{count}</div>
}

// ❌ BAD - Unstable object reference
useEffect(() => {
  doSomething({ userId, filters }) // filters object recreated every render
}, [userId, filters])
```

**Solutions**:
```typescript
// ✅ GOOD - Proper dependencies
useEffect(() => {
  setData(fetchData())
}, [fetchData]) // Include all dependencies

// ✅ GOOD - State update in effect
function Component() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    setCount(prev => prev + 1)
  }, [])
  return <div>{count}</div>
}

// ✅ GOOD - Stable references
const stableFilters = useMemo(() => ({ userId, filters }), [userId, filters])
useEffect(() => {
  doSomething(stableFilters)
}, [stableFilters])
```

### Issue: Duplicate API Requests
**Symptoms**: Network tab shows same request multiple times

**Debug Steps**:
1. Check Debug Panel request count
2. Look for console warnings: `⚠️ Potential duplicate request`
3. Check Network tab for rapid-fire requests

**Common Causes**:
```typescript
// ❌ BAD - Multiple effects fetching same data
useEffect(() => {
  fetchUserData()
}, [userId])

useEffect(() => {
  fetchUserData() // Duplicate!
}, [userId, someOtherDep])
```

**Solutions**:
```typescript
// ✅ GOOD - Single data fetching hook
const { data, loading, error } = useUserData(userId)

// ✅ GOOD - Request deduplication
const fetchData = useCallback(async () => {
  return cachedRequest(`user-${userId}`, () => fetchUserData(userId))
}, [userId])
```

### Issue: Auth Check Runs Multiple Times
**Symptoms**: Multiple "Loading..." screens, redirect loops

**Debug Steps**:
1. Check console for multiple auth logs
2. Look for sessionStorage conflicts
3. Check for competing auth checks

**Solutions**:
```typescript
// ✅ GOOD - Single auth check with ref guard
const authChecked = useRef(false)
useEffect(() => {
  if (authChecked.current) return
  authChecked.current = true
  checkAuth()
}, [])
```

### Issue: URL Parameters Cause Freeze
**Symptoms**: Typing in search is laggy, page hangs

**Debug Steps**:
1. Check for URL update loops in console
2. Look for rapid router.replace calls
3. Check filter dependency arrays

**Solutions**:
```typescript
// ✅ GOOD - Debounced URL updates
const debouncedQuery = useDebouncedValue(query, 300)
useEffect(() => {
  if (!filtersInitialized.current) return
  router.replace(`?q=${debouncedQuery}`)
}, [debouncedQuery])
```

## 🛠️ Debugging Commands

### Console Commands
```javascript
// Check current render counts
console.log('Render counts:', {
  main: window.__mainDashboardRenders,
  provider: window.__providerDashboardRenders
})

// Clear request cache
window.clearRequestCache?.()

// Force error boundary test
throw new Error('Test error boundary')

// Check active requests
console.log('Active requests:', requestLogger.getActiveRequests())
```

### Performance Monitoring
```javascript
// Check memory usage
console.log('Memory:', performance.memory)

// Measure render time
performance.mark('render-start')
// ... component render
performance.mark('render-end')
performance.measure('render', 'render-start', 'render-end')
console.log(performance.getEntriesByType('measure'))
```

## 📊 Performance Targets

| Metric | Target | How to Check |
|--------|--------|--------------|
| **Render Count** | < 10 per interaction | Debug Panel |
| **API Requests** | < 3 on mount | Debug Panel |
| **Memory Growth** | < 10MB/hour | Chrome DevTools |
| **Load Time** | < 2s | Lighthouse |
| **Time to Interactive** | < 3s | Lighthouse |

## 🚨 Warning Thresholds

### Debug Panel Warnings:
- **Render Count > 10**: Component may have infinite loop
- **Active Requests > 5**: May have duplicate requests
- **Memory > 100MB**: Potential memory leak

### Console Warnings:
- `⚠️ [Component] rendered X times!` - Infinite render loop
- `⚠️ Potential duplicate request` - Duplicate API calls
- `⚠️ Slow request: X took Yms` - Performance issue

## 🔧 Prevention Checklist

Before deploying, verify:

- [ ] Debug Panel shows stable render counts
- [ ] No console warnings in development
- [ ] Network tab shows expected API calls only
- [ ] Memory usage stays stable over time
- [ ] All useEffect hooks have proper cleanup
- [ ] No state updates in render body
- [ ] URL updates are debounced (>300ms)
- [ ] Auth checks run exactly once
- [ ] Request deduplication is working

## 🆘 Getting Help

When reporting issues, include:

1. **Debug Panel Screenshot** - Shows render count and request status
2. **Console Logs** - Full error messages and warnings
3. **Network Tab** - Screenshot showing duplicate requests
4. **React DevTools** - Profiler showing render performance
5. **Code Snippet** - Minimal reproducible example
6. **Environment Info** - Browser, OS, Node version

## 🔄 Recovery Procedures

### If Dashboard Crashes:
1. **Check Error Boundary** - Should show fallback UI
2. **Check Console** - Look for uncaught errors
3. **Refresh Page** - Often fixes temporary issues
4. **Clear Cache** - Remove corrupted data

### If Performance Degrades:
1. **Check Debug Panel** - Look for high render counts
2. **Monitor Memory** - Check for memory leaks
3. **Profile Components** - Use React DevTools
4. **Disable Features** - Temporarily turn off auto-refresh

### If Auth Breaks:
1. **Clear Session Storage** - Remove corrupted auth data
2. **Check Middleware** - Verify auth middleware is working
3. **Test in Incognito** - Isolate browser extension issues
4. **Rollback Changes** - Revert recent auth modifications

---

**Remember**: Most issues are caused by:
1. Missing cleanup in useEffect
2. Circular dependencies in custom hooks  
3. State updates triggering more state updates
4. Unstable references (objects/functions recreated every render)

The debugging tools will help you identify and fix these issues quickly!
