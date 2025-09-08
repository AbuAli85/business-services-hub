// Clean up duplicate milestones in the database
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
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupDuplicateMilestones() {
  try {
    console.log('🧹 Cleaning up duplicate milestones...')
    
    const testBookingId = 'cdd1a685-561c-4f95-a2e2-c3a1deb0b3c7'
    
    // Get all milestones for this booking
    console.log(`\n📋 Getting all milestones for booking ${testBookingId}...`)
    const { data: allMilestones, error: fetchError } = await supabase
      .from('milestones')
      .select('id, title, description, status, created_at, due_date')
      .eq('booking_id', testBookingId)
      .order('created_at', { ascending: true })
    
    if (fetchError) {
      console.error('❌ Error fetching milestones:', fetchError.message)
      return
    }
    
    console.log(`✅ Found ${allMilestones.length} total milestones`)
    
    // Group by title to find duplicates
    const groupedByTitle = {}
    allMilestones.forEach(milestone => {
      if (!groupedByTitle[milestone.title]) {
        groupedByTitle[milestone.title] = []
      }
      groupedByTitle[milestone.title].push(milestone)
    })
    
    console.log('\n📊 Duplicate analysis:')
    Object.keys(groupedByTitle).forEach(title => {
      const count = groupedByTitle[title].length
      if (count > 1) {
        console.log(`   - "${title}": ${count} duplicates`)
      }
    })
    
    // Keep only the first occurrence of each title
    const milestonesToKeep = []
    const milestonesToDelete = []
    
    Object.keys(groupedByTitle).forEach(title => {
      const milestones = groupedByTitle[title]
      if (milestones.length > 1) {
        // Keep the first one (oldest created_at)
        milestonesToKeep.push(milestones[0])
        // Mark the rest for deletion
        milestonesToDelete.push(...milestones.slice(1))
      } else {
        milestonesToKeep.push(milestones[0])
      }
    })
    
    console.log(`\n📋 Summary:`)
    console.log(`   - Keeping: ${milestonesToKeep.length} milestones`)
    console.log(`   - Deleting: ${milestonesToDelete.length} duplicates`)
    
    if (milestonesToDelete.length === 0) {
      console.log('✅ No duplicates found!')
      return
    }
    
    // Delete duplicate milestones
    console.log('\n🗑️  Deleting duplicate milestones...')
    for (const milestone of milestonesToDelete) {
      const { error: deleteError } = await supabase
        .from('milestones')
        .delete()
        .eq('id', milestone.id)
      
      if (deleteError) {
        console.error(`❌ Error deleting milestone ${milestone.id}:`, deleteError.message)
      } else {
        console.log(`✅ Deleted duplicate: "${milestone.title}" (${milestone.id})`)
      }
    }
    
    // Verify the cleanup
    console.log('\n✅ Verifying cleanup...')
    const { data: remainingMilestones, error: verifyError } = await supabase
      .from('milestones')
      .select('id, title, status')
      .eq('booking_id', testBookingId)
      .order('created_at', { ascending: true })
    
    if (verifyError) {
      console.error('❌ Error verifying cleanup:', verifyError.message)
    } else {
      console.log(`✅ Cleanup complete! Now have ${remainingMilestones.length} unique milestones:`)
      remainingMilestones.forEach(m => {
        console.log(`   - ${m.title} (${m.status})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

cleanupDuplicateMilestones()
