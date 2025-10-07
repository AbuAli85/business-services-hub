// Emergency script to clear stuck redirect states
// Run this in the browser console if you're stuck in a redirect loop

console.log('🔧 Clearing stuck redirect states...')

// Clear session storage
if (typeof sessionStorage !== 'undefined') {
  sessionStorage.removeItem('dashboard-redirecting')
  sessionStorage.removeItem('dashboard-provider-loaded')
  sessionStorage.removeItem('dashboard-client-loaded')
  console.log('✅ Session storage cleared')
}

// Clear localStorage if needed
if (typeof localStorage !== 'undefined') {
  // Remove any onboarding redirect keys
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('onboarding_redirect_')) {
      localStorage.removeItem(key)
    }
  })
  console.log('✅ Local storage cleared')
}

// Force reload the page
console.log('🔄 Reloading page...')
window.location.reload()
