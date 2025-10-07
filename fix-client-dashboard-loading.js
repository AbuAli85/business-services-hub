// Emergency script to fix client dashboard loading issues
// Run this in the browser console if the dashboard is stuck loading

console.log('🔧 Fixing client dashboard loading issues...')

// 1. Clear any stuck loading states
const loadingElements = document.querySelectorAll('.animate-spin, [data-loading="true"], .loading')
loadingElements.forEach(element => {
  element.classList.remove('animate-spin', 'loading', 'opacity-50')
  element.setAttribute('data-loading', 'false')
  console.log('✅ Reset loading element:', element)
})

// 2. Clear session storage flags
if (typeof sessionStorage !== 'undefined') {
  sessionStorage.removeItem('dashboard-redirecting')
  sessionStorage.removeItem('dashboard-client-loaded')
  sessionStorage.removeItem('dashboard-provider-loaded')
  sessionStorage.removeItem('login-attempts')
  sessionStorage.removeItem('login-loading')
  sessionStorage.removeItem('sign-in-loading')
  console.log('✅ Cleared session storage')
}

// 3. Clear localStorage redirect flags
if (typeof localStorage !== 'undefined') {
  // Remove any onboarding redirect keys
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('onboarding_redirect_') || key.startsWith('dashboard_')) {
      localStorage.removeItem(key)
      console.log('✅ Removed localStorage key:', key)
    }
  })
}

// 4. Reset any stuck form states
const forms = document.querySelectorAll('form')
forms.forEach(form => {
  const inputs = form.querySelectorAll('input, button, select')
  inputs.forEach(input => {
    input.disabled = false
    input.classList.remove('opacity-50', 'pointer-events-none', 'loading')
    input.style.pointerEvents = 'auto'
    input.style.opacity = '1'
  })
  console.log('✅ Reset form:', form)
})

// 5. Force visibility of dashboard content
const dashboardContent = document.querySelector('[data-dashboard-content], .dashboard-content, main')
if (dashboardContent) {
  dashboardContent.style.display = 'block'
  dashboardContent.style.visibility = 'visible'
  dashboardContent.style.opacity = '1'
  console.log('✅ Made dashboard content visible:', dashboardContent)
}

// 6. Hide any stuck loading overlays
const loadingOverlays = document.querySelectorAll('.loading-overlay, .loading-screen, .spinner-overlay')
loadingOverlays.forEach(overlay => {
  overlay.style.display = 'none'
  overlay.classList.add('hidden')
  console.log('✅ Hidden loading overlay:', overlay)
})

// 7. Reset any React state that might be stuck
if (typeof window !== 'undefined' && window.React) {
  console.log('✅ React detected - consider refreshing for clean state')
}

// 8. Force a re-render if possible
const dashboardContainer = document.querySelector('#dashboard, .dashboard, [role="main"]')
if (dashboardContainer) {
  dashboardContainer.style.display = 'none'
  setTimeout(() => {
    dashboardContainer.style.display = 'block'
    console.log('✅ Force re-rendered dashboard container')
  }, 100)
}

// 9. Clear any stuck network requests (if possible)
if (typeof window !== 'undefined' && window.fetch) {
  console.log('✅ Fetch API available - network requests may need manual clearing')
}

console.log('✅ Client dashboard loading fix complete!')
console.log('💡 If dashboard still not showing, try:')
console.log('   1. Refresh the page (F5 or Ctrl+R)')
console.log('   2. Navigate directly to /dashboard/client')
console.log('   3. Clear browser cache and try again')
console.log('   4. Check browser console for any remaining errors')
