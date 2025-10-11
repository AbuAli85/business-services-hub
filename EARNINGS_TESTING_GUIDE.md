# 🧪 Earnings Dashboard Testing Guide

## Quick Start Testing

### 1. **Access the Dashboard**
```
Navigate to: /dashboard/provider/earnings
```

### 2. **Prerequisites**
- ✅ User must be logged in as a provider
- ✅ Supabase connection established
- ✅ Real-time subscriptions enabled
- ✅ Database tables (payments, invoices) exist

---

## 🔍 Feature Testing Checklist

### **A. Initial Load**
- [ ] Page loads without errors
- [ ] Loading spinner displays during data fetch
- [ ] All metric cards appear with data
- [ ] Charts render correctly
- [ ] No console errors

### **B. Real-Time Features**
- [ ] "Live" badge appears when connected
- [ ] Real-time updates work when new payment added
- [ ] Auto-refresh works every 5 minutes
- [ ] Manual refresh button works
- [ ] Refresh animation plays correctly
- [ ] Last updated timestamp updates

### **C. Data Display**
- [ ] Total earnings show correctly
- [ ] Monthly earnings calculate properly
- [ ] Pending payments display
- [ ] Average per service calculates
- [ ] Today's earnings accurate
- [ ] Weekly earnings show correctly
- [ ] Success rate percentage displays

### **D. Charts & Visualizations**
- [ ] Area chart loads with data
- [ ] Chart shows correct date range
- [ ] Tooltips work on hover
- [ ] Bar chart displays transaction volume
- [ ] Payment status breakdown shows all statuses
- [ ] Colors are consistent across charts

### **E. Filtering & Search**
- [ ] Time range selector works (7, 30, 90, 365 days)
- [ ] Search box filters transactions
- [ ] Status filter works (All, Completed, Pending, Failed)
- [ ] Filters update results instantly
- [ ] Clear filters works correctly

### **F. Transaction List**
- [ ] Recent transactions display (max 10)
- [ ] Transaction details show correctly
- [ ] Status badges display with correct colors
- [ ] Hover effects work
- [ ] Animations play smoothly
- [ ] Empty state shows when no results

### **G. Invoices**
- [ ] Invoice list displays
- [ ] Download button works for invoices with PDFs
- [ ] Disabled state for pending invoices
- [ ] Invoice details show correctly
- [ ] Empty state displays when no invoices

### **H. Export Functionality**
- [ ] Export button generates CSV
- [ ] CSV includes all filtered data
- [ ] CSV has correct headers
- [ ] File downloads with timestamp
- [ ] Data is properly formatted

### **I. Responsive Design**
- [ ] Mobile view (< 768px) works
- [ ] Tablet view (768px - 1024px) works
- [ ] Desktop view (> 1024px) works
- [ ] Charts resize properly
- [ ] Cards stack correctly on mobile
- [ ] Touch interactions work on mobile

### **J. Performance**
- [ ] Page loads in < 3 seconds
- [ ] Real-time updates don't cause lag
- [ ] Charts render smoothly
- [ ] Animations are smooth (60fps)
- [ ] No memory leaks
- [ ] Proper cleanup on unmount

---

## 🎨 Visual Testing

### **Color Consistency**
| Status | Color | Usage |
|--------|-------|-------|
| Completed | Green (#10b981) | Success states |
| Pending | Yellow (#f59e0b) | Warning states |
| Failed | Red (#ef4444) | Error states |
| Primary | Blue (#3b82f6) | Information |
| Analytics | Purple (#8b5cf6) | Special metrics |

### **Animation Checks**
- ✅ Smooth card entrance animations
- ✅ Staggered list item animations
- ✅ Hover scale effects
- ✅ Loading spinner rotation
- ✅ Button click feedback

### **Typography**
- ✅ Headers are readable (24px - 32px)
- ✅ Body text is legible (14px - 16px)
- ✅ Small text is still readable (12px)
- ✅ Font weights are appropriate
- ✅ Line heights provide good readability

---

## 🔧 Technical Testing

### **A. Database Queries**
```sql
-- Test payment data
SELECT * FROM payments 
WHERE provider_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC;

-- Test invoice data
SELECT * FROM invoices 
WHERE provider_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC;
```

### **B. Real-Time Subscriptions**
```typescript
// Check if subscriptions are active
console.log('Checking subscriptions...')

// Should see in console:
// ✅ Subscribed to real-time payments
// 💰 Real-time payment update: {...}
// 📄 Real-time invoice update: {...}
```

### **C. State Management**
```typescript
// Test state updates
- Initial: loading = true
- After fetch: loading = false, data populated
- On refresh: refreshing = true, then false
- On filter: filtered data updates
- On search: search results update
```

### **D. Error Handling**
Test scenarios:
1. **No user logged in**
   - Should redirect or show message
   
2. **Network error**
   - Should show error state
   - Should allow retry
   
3. **No data available**
   - Should show empty state
   - Should provide guidance

4. **Real-time connection fails**
   - Should fall back to polling
   - Should show connection status

---

## 📊 Data Scenarios

### **Scenario 1: New Provider (No Data)**
Expected:
- ✅ Empty states show
- ✅ Helpful messages display
- ✅ All metrics show 0.00
- ✅ Charts show empty or zero values
- ✅ Guidance on next steps

### **Scenario 2: Active Provider (With Data)**
Expected:
- ✅ All metrics populated
- ✅ Charts show trends
- ✅ Transactions list filled
- ✅ Growth rates calculated
- ✅ Success rates accurate

### **Scenario 3: High Volume (100+ Transactions)**
Expected:
- ✅ Pagination works (showing 10)
- ✅ Performance remains good
- ✅ Charts aggregate properly
- ✅ Search/filter still fast
- ✅ Export includes all data

### **Scenario 4: Mixed Status Transactions**
Expected:
- ✅ All statuses display correctly
- ✅ Color coding consistent
- ✅ Filters work for each status
- ✅ Stats calculate correctly
- ✅ Charts show breakdown

---

## 🚀 Performance Benchmarks

### **Load Times**
| Metric | Target | Acceptable |
|--------|--------|------------|
| Initial Load | < 2s | < 3s |
| Data Fetch | < 1s | < 2s |
| Chart Render | < 500ms | < 1s |
| Filter/Search | < 100ms | < 300ms |
| Real-time Update | < 500ms | < 1s |

### **Memory Usage**
- Initial: ~30-50 MB
- After 5 minutes: < 100 MB
- No memory leaks on unmount

### **Network**
- Initial load: ~500KB
- Subsequent updates: ~50KB
- Real-time: WebSocket (minimal)

---

## 🐛 Known Issues & Solutions

### **Issue 1: Charts Not Rendering**
**Symptom**: Charts show blank or error
**Solution**:
1. Check if data is present: `console.log(chartData)`
2. Verify Recharts is imported
3. Check ResponsiveContainer has height
4. Ensure data format is correct

### **Issue 2: Real-Time Not Working**
**Symptom**: No live updates
**Solution**:
1. Check WebSocket connection in DevTools
2. Verify user is authenticated
3. Check Supabase real-time is enabled
4. Verify channel subscriptions created

### **Issue 3: Filters Not Working**
**Symptom**: Search/filter shows no results
**Solution**:
1. Check filter logic in `filteredEarnings`
2. Verify search query state updates
3. Check status filter value
4. Console log filtered results

### **Issue 4: Slow Performance**
**Symptom**: Laggy animations or slow updates
**Solution**:
1. Check for console errors
2. Verify data isn't too large
3. Check for infinite re-renders
4. Optimize state updates

---

## 🧩 Integration Testing

### **A. With Payments System**
1. Create a test payment
2. Verify it appears in earnings
3. Check real-time update triggers
4. Verify calculations update
5. Check chart updates

### **B. With Invoice System**
1. Generate test invoice
2. Check it appears in list
3. Verify download link works
4. Check status updates
5. Verify PDF generation

### **C. With User System**
1. Test with different user roles
2. Verify provider-only access
3. Check data isolation
4. Test authentication states

---

## 📱 Device Testing

### **Mobile Devices**
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] Responsive layouts
- [ ] Touch gestures
- [ ] Portrait/landscape

### **Tablets**
- [ ] iPad (Safari)
- [ ] Android tablet
- [ ] Grid layouts
- [ ] Touch interactions

### **Desktop**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Full features

---

## 🔍 Accessibility Testing

### **Keyboard Navigation**
- [ ] Tab order is logical
- [ ] All buttons accessible
- [ ] Dropdowns work with keyboard
- [ ] Focus indicators visible
- [ ] Escape key closes modals

### **Screen Readers**
- [ ] ARIA labels present
- [ ] Alt text on images/icons
- [ ] Semantic HTML used
- [ ] Announcements work
- [ ] Status updates announced

### **Visual**
- [ ] Contrast ratios meet WCAG AA
- [ ] Text is readable
- [ ] Icons are clear
- [ ] Colors aren't only indicator
- [ ] Focus is visible

---

## 📝 Test Data Setup

### **Sample Payment Data**
```sql
INSERT INTO payments (
  provider_id, 
  client_id, 
  booking_id, 
  amount, 
  currency, 
  status, 
  created_at
) VALUES 
  ('provider-uuid', 'client-uuid', 'booking-uuid', 100.00, 'OMR', 'succeeded', NOW()),
  ('provider-uuid', 'client-uuid', 'booking-uuid', 150.00, 'OMR', 'processing', NOW() - INTERVAL '1 day'),
  ('provider-uuid', 'client-uuid', 'booking-uuid', 200.00, 'OMR', 'succeeded', NOW() - INTERVAL '2 days');
```

### **Sample Invoice Data**
```sql
INSERT INTO invoices (
  provider_id, 
  client_id, 
  booking_id, 
  amount, 
  currency, 
  status, 
  created_at
) VALUES 
  ('provider-uuid', 'client-uuid', 'booking-uuid', 100.00, 'OMR', 'paid', NOW()),
  ('provider-uuid', 'client-uuid', 'booking-uuid', 150.00, 'OMR', 'issued', NOW() - INTERVAL '1 day');
```

---

## 🎯 User Acceptance Testing

### **User Stories**
1. **As a provider, I want to see my total earnings**
   - [ ] Can view total earnings
   - [ ] Number is accurate
   - [ ] Updates in real-time

2. **As a provider, I want to track pending payments**
   - [ ] Can see pending amount
   - [ ] Can see pending count
   - [ ] Status is clear

3. **As a provider, I want to analyze trends**
   - [ ] Charts show trends
   - [ ] Can change time range
   - [ ] Data is accurate

4. **As a provider, I want to export data**
   - [ ] Can export to CSV
   - [ ] Data is complete
   - [ ] Format is usable

5. **As a provider, I want real-time updates**
   - [ ] Updates automatically
   - [ ] Can see live indicator
   - [ ] Can manually refresh

---

## ✅ Final Checklist

Before deployment:
- [ ] All tests passing
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Responsive on all devices
- [ ] Accessibility compliant
- [ ] Real-time working
- [ ] Export working
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Database indexes optimized

---

## 🚨 Critical Tests

These MUST pass before production:
1. ✅ User authentication and authorization
2. ✅ Data isolation (providers only see their data)
3. ✅ Real-time subscriptions don't cause memory leaks
4. ✅ Large datasets don't crash browser
5. ✅ Export doesn't expose sensitive data
6. ✅ No XSS vulnerabilities
7. ✅ HTTPS enforced
8. ✅ Error handling prevents crashes

---

## 📊 Testing Tools

### **Manual Testing**
- Browser DevTools (Chrome/Firefox)
- React DevTools
- Network tab monitoring
- Console logging

### **Automated Testing** (Optional)
```typescript
// Example test structure
describe('Earnings Dashboard', () => {
  it('should load without errors', () => {})
  it('should display metrics correctly', () => {})
  it('should filter transactions', () => {})
  it('should export CSV', () => {})
  it('should handle real-time updates', () => {})
})
```

### **Performance Tools**
- Lighthouse
- WebPageTest
- Chrome Performance tab
- React Profiler

---

## 🎓 Testing Best Practices

1. **Test in isolation**: Test each feature independently
2. **Test integration**: Test features working together
3. **Test edge cases**: Empty states, large datasets, errors
4. **Test real scenarios**: Use actual user workflows
5. **Test performance**: Measure and optimize
6. **Test accessibility**: Ensure everyone can use it
7. **Test cross-browser**: Works everywhere
8. **Test mobile**: Touch and small screens
9. **Document issues**: Track and fix bugs
10. **Regression test**: Ensure fixes don't break other things

---

## 📞 Support

If you encounter issues:
1. Check console for errors
2. Review network requests
3. Verify database connections
4. Check real-time subscriptions
5. Review this guide
6. Check main documentation

---

**Happy Testing! 🎉**

Remember: Quality testing ensures a quality product!

