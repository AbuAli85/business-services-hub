# Force UI Cache Refresh Solutions

## Current Issue
The database shows correct data but the UI is still displaying cached data:
- Database: Progress = 100%, Payment = "issued"
- UI: Progress = 0%, Payment = "pending"

## Solution 1: Hard Browser Refresh
```
Windows: Ctrl + F5
Mac: Cmd + Shift + R
```

## Solution 2: Clear Browser Cache via DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Refresh the page

## Solution 3: Incognito/Private Window
- Open the booking page in a private/incognito window
- This bypasses all cache

## Solution 4: Force API Cache Refresh
The booking details page fetches from `v_booking_status` view. We can force refresh by updating the booking again.

## Solution 5: Check Network Requests
Look at the Network tab in DevTools to see if the API is returning updated data.
