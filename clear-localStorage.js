
// Clear localStorage fallback data
console.log('🧹 Clearing localStorage fallback data...')

// Clear all milestone-related localStorage
const keysToRemove = []
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i)
  if (key && key.includes('milestones-')) {
    keysToRemove.push(key)
  }
}

keysToRemove.forEach(key => {
  console.log('Removing:', key)
  localStorage.removeItem(key)
})

console.log('✅ localStorage cleared. Refresh the page to see real database data.')
