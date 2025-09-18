# Authentication Troubleshooting Guide

## Issues Fixed

### 1. Invalid Refresh Token Errors
**Problem**: `AuthApiError: Invalid Refresh Token: Refresh Token Not Found`

**Root Cause**: 
- Stale or expired refresh tokens in localStorage
- Session state mismatch between client and server
- Improper session cleanup on logout

**Solution**:
- Added proper refresh token error detection
- Implemented automatic session cleanup on invalid tokens
- Enhanced error handling in session timeout hook
- Added session validation utilities

### 2. Missing Favicon
**Problem**: `Failed to load resource: the server responded with a status of 404 ()` for `/favicon.svg`

**Solution**: Created a proper favicon.svg file in the public directory

## Key Improvements

### Session Management
- **Enhanced Error Handling**: Added specific detection for refresh token errors
- **Automatic Cleanup**: Invalid sessions are automatically cleared
- **Better Validation**: Sessions are validated before use
- **Graceful Degradation**: App continues to work even when auth fails

### Session Timeout Hook
- **Improved Error Recovery**: Handles refresh token errors gracefully
- **Better Session Validation**: Uses utility functions for consistent validation
- **Enhanced Cleanup**: Clears all auth-related data on logout
- **Safer Refresh**: Better error handling during session refresh

### Supabase Client Configuration
- **Explicit Storage**: Added specific storage key for auth tokens
- **Debug Mode**: Added debug logging in development
- **Better State Management**: Enhanced auth state change handling
- **Proactive Refresh**: Improved token refresh logic

## Usage

### Session Timeout Hook
```typescript
import { useSessionTimeout } from '@/hooks/use-session-timeout'

function MyComponent() {
  const {
    isWarning,
    timeRemaining,
    isInactive,
    isExpired,
    refreshSession,
    resetActivity,
    formatTime
  } = useSessionTimeout({
    warningTime: 300, // 5 minutes
    inactivityTimeout: 1800, // 30 minutes
    checkInterval: 30 // 30 seconds
  })

  // Handle session warnings
  if (isWarning) {
    // Show warning UI
  }

  // Handle session expiry
  if (isExpired) {
    // Redirect to login
  }
}
```

### Session Utilities
```typescript
import { 
  clearAuthData, 
  isRefreshTokenError, 
  safeSignOut, 
  isSessionValid 
} from '@/lib/session-utils'

// Clear all auth data
clearAuthData({ clearLocalStorage: true })

// Check if error is refresh token related
if (isRefreshTokenError(error)) {
  // Handle refresh token error
}

// Safely sign out user
await safeSignOut(supabase, { clearLocalStorage: true })

// Validate session
if (isSessionValid(session)) {
  // Session is valid
}
```

## Prevention

### Best Practices
1. **Always handle auth errors gracefully**
2. **Clear auth data on logout**
3. **Validate sessions before use**
4. **Implement proper error boundaries**
5. **Monitor auth state changes**

### Monitoring
- Check browser console for auth-related logs
- Monitor network requests to Supabase
- Watch for localStorage/sessionStorage usage
- Track user session patterns

## Testing

To test the authentication flow:

1. **Sign in** with valid credentials
2. **Wait for session warning** (5 minutes before expiry)
3. **Test session refresh** by clicking refresh button
4. **Test inactivity timeout** (30 minutes of inactivity)
5. **Test invalid token handling** by manually clearing localStorage
6. **Test logout** and verify cleanup

## Troubleshooting

### Common Issues

1. **Still getting refresh token errors?**
   - Clear browser storage completely
   - Check if environment variables are correct
   - Verify Supabase project settings

2. **Session not persisting?**
   - Check localStorage permissions
   - Verify storage key configuration
   - Check for conflicting auth libraries

3. **Infinite refresh loops?**
   - Check cooldown mechanisms
   - Verify error handling
   - Monitor console logs

### Debug Mode

Enable debug mode by setting `NODE_ENV=development` to see detailed auth logs in the console.

## Environment Variables

Ensure these are properly set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Support

If you continue to experience issues:

1. Check the browser console for detailed error messages
2. Verify your Supabase project configuration
3. Test with a fresh browser session
4. Check network connectivity to Supabase
5. Review Supabase dashboard for any service issues
