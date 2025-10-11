# Deployment & Debugging Guide

## 🔍 Current Status (Based on Live Site Review)

### ✅ Working (Deployed Successfully)
1. **Top Services on Dashboard** - Shows bookings & revenue ✅
2. **Bookings Page First Load** - Shows correct metrics immediately ✅

### ❌ Not Working (Need Investigation)
3. **My Services Page** - Still shows 0 bookings and OMR 0 ❌
4. **Company Page** - Still shows 0 services ❌
5. **Earnings Dashboard** - Still shows OMR 0.00 ❌
6. **Messages Sync** - Still not syncing ❌
7. **Notifications Count** - Still shows 0 unread ❌

---

## 🐛 Root Cause Analysis

### Why Some Fixes Work and Others Don't

**Working Fixes (Top Services, Bookings):**
- These likely use different data sources or components
- May have been deployed in an earlier build
- Could be using cached data that happens to be correct

**Not Working Fixes:**
- **Option 1**: Files not deployed yet (most likely)
- **Option 2**: Browser/CDN cache showing old version
- **Option 3**: Additional logic needed beyond what we coded

---

## 🔧 Additional Fixes Implemented

### Critical Issue Found & Fixed

**File:** `lib/dashboard-data.ts`

**Problem:** The `calculateServiceBookingCounts()` method was **overwriting** the booking counts and revenue that came from the API!

**Fix Applied:**
- Modified method to **preserve** API data if it exists
- Only calculate locally if API didn't provide data
- Added comprehensive logging to debug which source is used

**Code Change:**
```typescript
// Before: Always overwrote API data
private calculateServiceBookingCounts() {
  this.services = this.services.map(service => {
    const serviceBookings = this.bookings.filter(...)
    return {
      ...service,
      bookingCount: serviceBookings.length,  // Overwrote API value!
      booking_count: serviceBookings.length
    }
  })
}

// After: Preserves API data
private calculateServiceBookingCounts() {
  this.services = this.services.map(service => {
    const apiBookingCount = service.booking_count || service.bookingCount
    const apiRevenue = service.total_revenue
    
    if (apiBookingCount !== undefined && apiRevenue !== undefined) {
      return service // Keep API data!
    }
    
    // Only calculate if missing
    const serviceBookings = this.bookings.filter(...)
    return {
      ...service,
      bookingCount: serviceBookings.length,
      booking_count: serviceBookings.length,
      total_revenue: calculatedRevenue
    }
  })
}
```

---

## 📊 Enhanced Debugging Added

### Console Logs to Monitor

After deployment, check console for these logs:

#### Services API
```javascript
✅ Services API: Calculated booking counts for X services with bookings
📊 Services API: Booking counts map: {service-id-1: 3, service-id-2: 5...}
✅ Services API: Calculated revenue for X services
📊 Services API: Revenue map: {service-id-1: 240, service-id-2: 1500...}
📊 Sample service being returned: {
  id: '...',
  title: 'Translation Services',
  booking_count: 3,
  total_revenue: 240,
  base_price: 80
}
```

#### Services Page
```javascript
📊 Services Page: Data loaded - 9 services
📊 Services Page: First service: {booking_count: 3, total_revenue: 240...}
🔍 Service Card Data: {
  id: '...',
  title: 'Translation Services',
  booking_count: 3,
  total_revenue: 240
}
📊 Services Stats Calculation: {
  totalBookingsFromServices: 20,
  totalRevenueFromServices: 6400,
  ...
}
```

#### Dashboard Data Manager
```javascript
📊 Dashboard Data: Calculating/preserving service booking counts
📊 Service Translation Services - Using API data: bookings = 3, revenue = 240
```

---

## 🚀 Deployment Steps

### 1. Verify All Changes Are Committed
```bash
git status
# Should show no uncommitted changes
```

### 2. Push to Repository
```bash
git add .
git commit -m "fix: Add missing revenue mapping and preserve API data in services"
git push origin main
```

### 3. Wait for Auto-Deploy
- Vercel will auto-deploy from main branch
- Monitor deployment at Vercel dashboard
- Wait for deployment to complete (~2-3 minutes)

### 4. Clear Cache
After deployment completes:
```
1. Open browser DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
OR
4. Press Ctrl+Shift+R (hard refresh)
```

### 5. Test with Console Open
1. Open DevTools Console (F12)
2. Navigate to My Services page
3. Look for the debug logs listed above
4. Verify booking_count and total_revenue values

---

## 🧪 Diagnostic Checklist

### If My Services Still Shows 0:

**Check 1: API Response**
1. Open Network tab in DevTools
2. Navigate to My Services
3. Find `/api/services?provider_id=...` request
4. Check Response tab
5. Verify each service has:
   ```json
   {
     "booking_count": 3,
     "total_revenue": 240
   }
   ```

**Check 2: Console Logs**
Look for:
- `📊 Sample service being returned:` - Should show booking_count
- `📊 Service Card Data:` - Should show booking_count
- `📊 Services Stats Calculation:` - Should show totalRevenueFromServices

**Check 3: Service Object in React DevTools**
1. Install React DevTools extension
2. Find ServiceCard component
3. Inspect `service` prop
4. Check if booking_count and total_revenue exist

### If Still Not Working:

**Scenario A: API Returns Data But Frontend Shows 0**
- Issue: Frontend not reading correct field
- Solution: Check field mapping in ServiceCard component
- Look for: `service.booking_count` vs `service.bookingCount`

**Scenario B: API Returns 0 for booking_count**
- Issue: Bookings don't have service_id or query is wrong
- Solution: Check database - `SELECT service_id FROM bookings LIMIT 5`
- Verify service_ids match between services and bookings tables

**Scenario C: Data Not Persisting After Refresh**
- Issue: calculateServiceBookingCounts still overwriting
- Solution: Check if our fix to preserve API data is deployed
- Look for log: "Using API data" vs "Calculating locally"

---

## 🔄 Specific Page Debugging

### My Services Page

**Expected Console Logs:**
```
📊 Dashboard Data: Loaded services from API: 9 services
📊 Dashboard Data: Mapped services: 9 services with provider names
📊 Dashboard Data: Calculating/preserving service booking counts
📊 Service Translation Services - Using API data: bookings = 3, revenue = 240
🔍 Service Card Data: {booking_count: 3, total_revenue: 240}
📊 Services Stats Calculation: {totalRevenueFromServices: 6400}
```

**If Logs Show:**
- "Calculating locally" → API not returning data, check services API
- booking_count: undefined → API query issue
- booking_count: 0 → No bookings linked to service_id

### Company Page

**Expected Console Logs:**
```
📊 Fetching services for owner IDs: ['user-id-123']
✅ Found services: 9
✅ Found bookings: 20
```

**If Shows:**
- "Found services: 0" → Query using wrong owner_id
- "Error fetching services" → Check database query

### Earnings Page

**Expected Console Logs:**
```
⚠️ No payments found, calculating earnings from invoices
✅ Set earnings from bookings: 20 items
📊 Total earnings calculated: 6400 from 20 earnings
```

**If Shows:**
- "0 from 0 earnings" → Invoices and bookings not being used
- No fallback logs → Code not deployed

---

## 🎯 Quick Fixes for Remaining Issues

### If My Services Still Shows 0 After All Above:

**Add this temporary debug to services page** (top of component):
```typescript
useEffect(() => {
  console.log('🔍 SERVICES PAGE DEBUG:', {
    servicesCount: services?.length,
    sampleService: services?.[0],
    bookingsCount: bookings?.length
  })
}, [services, bookings])
```

### If Company Still Shows 0 Services:

**Check if company.owner_id matches user.id:**
```typescript
// In fetchCompanyStats, add:
console.log('🔍 Company owner IDs:', ownerIds)
console.log('🔍 Current user ID:', /* user id */)
```

### If Earnings Still Shows 0:

**Verify invoices exist:**
```typescript
// In fetchEarningsData, add after invoice fetch:
console.log('🔍 Invoices fetched:', enrichedInvoices.length)
console.log('🔍 Sample invoice:', enrichedInvoices[0])
```

---

## 📋 Files Modified in This Round

1. **lib/dashboard-data.ts** - Fixed booking count preservation
2. **app/dashboard/services/page.tsx** - Enhanced stats calculation + debugging
3. **app/api/services/route.ts** - Added sample service logging

### Total Files Modified (All Rounds): 11 files

---

## ✅ Action Items

### Immediate (Required for Live Site)
1. **Deploy all changes** - Push to production
2. **Clear browser cache** - Hard refresh on live site
3. **Test with console open** - Verify logs appear
4. **Check API responses** - Verify booking_count is returned

### If Issues Persist
1. **Check deployment logs** - Verify all files deployed
2. **Review console logs** - Share with development team
3. **Database verification** - Check if bookings have service_id
4. **API testing** - Test `/api/services` endpoint directly

---

## 💡 Pro Tips

### Testing API Directly
```bash
# Test services API
curl 'https://marketing.thedigitalmorph.com/api/services?provider_id=YOUR_ID' \
  -H 'Cookie: YOUR_AUTH_COOKIE'

# Should return:
{
  "services": [{
    "booking_count": 3,
    "total_revenue": 240
  }]
}
```

### Browser Console Quick Test
```javascript
// Run in browser console on My Services page
console.table(
  window.__NEXT_DATA__?.props?.pageProps?.services || 
  'Services not in pageProps'
)
```

---

## 📞 If You Need Help

Share these items:
1. Browser console logs (full output)
2. Network tab screenshot of `/api/services` response
3. User ID and role
4. Steps taken (deployed? cleared cache?)

---

**Status**: Additional fixes applied
**Next**: Deploy and test with console logs
**Expected**: All pages should now show correct data after deployment

