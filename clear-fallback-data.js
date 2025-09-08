// Clear fallback data and force database usage
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Load environment variables from env.example
const envExample = fs.readFileSync('env.example', 'utf8')
const envLines = envExample.split('\n')
const envVars = {}
envLines.forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, value] = line.split('=')
    envVars[key.trim()] = value.trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearFallbackData() {
  try {
    console.log('🧹 Clearing fallback data and checking database...')
    
    // First, let's check what's in the database
    console.log('\n📋 Checking actual database milestones...')
    const { data: dbMilestones, error: dbError } = await supabase
      .from('milestones')
      .select('id, title, booking_id')
      .limit(10)
    
    if (dbError) {
      console.error('❌ Database error:', dbError.message)
      return
    }
    
    console.log(`✅ Found ${dbMilestones.length} milestones in database:`)
    dbMilestones.forEach(m => {
      console.log(`   - ${m.title} (Booking: ${m.booking_id})`)
    })
    
    // Check specific booking
    const testBookingId = 'cdd1a685-561c-4f95-a2e2-c3a1deb0b3c7'
    console.log(`\n📋 Checking milestones for booking ${testBookingId}...`)
    
    const { data: bookingMilestones, error: bookingError } = await supabase
      .from('milestones')
      .select('id, title, status, due_date')
      .eq('booking_id', testBookingId)
    
    if (bookingError) {
      console.error('❌ Booking milestones error:', bookingError.message)
    } else {
      console.log(`✅ Found ${bookingMilestones.length} milestones for this booking:`)
      bookingMilestones.forEach(m => {
        console.log(`   - ${m.title} (${m.status})`)
      })
    }
    
    // Create a simple script to clear localStorage
    console.log('\n🧹 Creating localStorage cleanup script...')
    
    const cleanupScript = `
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
`
    
    fs.writeFileSync('clear-localStorage.js', cleanupScript)
    console.log('✅ Created clear-localStorage.js')
    console.log('\n📋 To clear localStorage fallback data:')
    console.log('1. Open browser developer tools (F12)')
    console.log('2. Go to Console tab')
    console.log('3. Copy and paste the contents of clear-localStorage.js')
    console.log('4. Press Enter to execute')
    console.log('5. Refresh the page')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

clearFallbackData()
