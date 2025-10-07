// Emergency script to fix stuck login state
// Run this in the browser console if login is stuck

console.log('🔧 Fixing stuck login state...')

// Clear any stuck loading states
if (typeof document !== 'undefined') {
  // Find and reset any loading buttons
  const loadingButtons = document.querySelectorAll('button[disabled], .loading, [data-loading="true"]')
  loadingButtons.forEach(button => {
    button.disabled = false
    button.classList.remove('loading', 'opacity-50')
    button.setAttribute('data-loading', 'false')
    console.log('✅ Reset loading button:', button)
  })

  // Clear any stuck form states
  const forms = document.querySelectorAll('form')
  forms.forEach(form => {
    const inputs = form.querySelectorAll('input, button')
    inputs.forEach(input => {
      input.disabled = false
      input.classList.remove('opacity-50', 'pointer-events-none')
    })
    console.log('✅ Reset form:', form)
  })

  // Clear session storage that might be causing issues
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('login-attempts')
    sessionStorage.removeItem('login-loading')
    sessionStorage.removeItem('sign-in-loading')
    console.log('✅ Cleared session storage')
  }

  // Clear any stuck hCaptcha states
  const captchaElements = document.querySelectorAll('[data-hcaptcha-widget-id]')
  captchaElements.forEach(element => {
    element.style.opacity = '1'
    element.style.pointerEvents = 'auto'
    console.log('✅ Reset captcha element:', element)
  })
}

console.log('✅ Login state reset complete!')
console.log('💡 Try clicking the sign-in button again')
