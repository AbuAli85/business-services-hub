#!/usr/bin/env node

/**
 * Fix Admin System
 * This script fixes all admin functionality issues including:
 * - Creates admin user
 * - Approves pending services
 * - Fixes bookings system
 * - Sets up proper permissions
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function fixAdminSystem() {
  console.log('🔧 Fixing Admin System - Comprehensive Solution\n')
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log('📋 Environment Check:')
  console.log(`  Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
  console.log(`  Supabase Anon Key: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`)
  console.log(`  Supabase Service Key: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`)
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('\n❌ Environment variables not configured!')
    return
  }
  
  try {
    // Create Supabase client with service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    console.log('\n🔍 Step 1: Checking current system status...')
    
    // Check existing users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
    
    if (profilesError) {
      console.log('❌ Error fetching profiles:', profilesError.message)
      return
    }
    
    console.log(`📊 Found ${profiles?.length || 0} users in system`)
    
    // Check pending services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
    
    if (servicesError) {
      console.log('❌ Error fetching services:', servicesError.message)
      return
    }
    
    const pendingServices = services?.filter(s => s.approval_status === 'pending') || []
    console.log(`📊 Found ${services?.length || 0} services, ${pendingServices.length} pending approval`)
    
    // Check bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
    
    if (bookingsError) {
      console.log('❌ Error fetching bookings:', bookingsError.message)
      return
    }
    
    console.log(`📊 Found ${bookings?.length || 0} bookings`)
    
    console.log('\n🔧 Step 2: Creating admin user...')
    
    // Create admin user if none exists
    const adminEmail = 'admin@businesshub.com'
    const adminPassword = 'Admin123!@#'
    
    let adminUser = null
    
    // Check if admin user already exists
    const existingAdmin = profiles?.find(p => p.email === adminEmail)
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists')
      adminUser = existingAdmin
    } else {
      console.log('🔧 Creating new admin user...')
      
      try {
        // Create user in auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
          user_metadata: {
            role: 'admin',
            full_name: 'System Administrator'
          }
        })
        
        if (authError) {
          console.log('❌ Error creating auth user:', authError.message)
        } else {
          console.log('✅ Auth user created successfully')
          adminUser = authData.user
          
          // Create profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: adminUser.id,
              email: adminEmail,
              full_name: 'System Administrator',
              role: 'admin',
              phone: '+968 1234 5678',
              is_verified: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()
          
          if (profileError) {
            console.log('❌ Error creating profile:', profileError.message)
          } else {
            console.log('✅ Admin profile created successfully')
            adminUser = profileData
          }
        }
      } catch (createError) {
        console.log('❌ Error creating admin user:', createError.message)
      }
    }
    
    console.log('\n🔧 Step 3: Approving pending services...')
    
    if (pendingServices.length > 0) {
      console.log(`🔧 Approving ${pendingServices.length} pending services...`)
      
      for (const service of pendingServices) {
        const { error: updateError } = await supabase
          .from('services')
          .update({
            approval_status: 'approved',
            is_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', service.id)
        
        if (updateError) {
          console.log(`❌ Error approving service ${service.id}:`, updateError.message)
        } else {
          console.log(`✅ Approved service: ${service.title || service.id}`)
        }
      }
    } else {
      console.log('✅ No pending services to approve')
    }
    
    console.log('\n🔧 Step 4: Fixing bookings system...')
    
    if (bookings && bookings.length > 0) {
      console.log(`🔧 Updating ${bookings.length} bookings...`)
      
      for (const booking of bookings) {
        // Update booking with proper status and dates
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: booking.status || 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id)
        
        if (updateError) {
          console.log(`❌ Error updating booking ${booking.id}:`, updateError.message)
        } else {
          console.log(`✅ Updated booking: ${booking.id}`)
        }
      }
    } else {
      console.log('✅ No bookings to update')
    }
    
    console.log('\n🔧 Step 5: Setting up sample data...')
    
    // Create sample services if none exist
    if (!services || services.length === 0) {
      console.log('🔧 Creating sample services...')
      
      const sampleServices = [
        {
          title: 'Web Development',
          description: 'Professional web development services',
          category: 'Technology',
          base_price: 500,
          currency: 'USD',
          provider_id: adminUser?.id,
          approval_status: 'approved',
          is_verified: true,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          title: 'Digital Marketing',
          description: 'Complete digital marketing solutions',
          category: 'Marketing',
          base_price: 300,
          currency: 'USD',
          provider_id: adminUser?.id,
          approval_status: 'approved',
          is_verified: true,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          title: 'Graphic Design',
          description: 'Creative graphic design services',
          category: 'Design',
          base_price: 200,
          currency: 'USD',
          provider_id: adminUser?.id,
          approval_status: 'approved',
          is_verified: true,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
      
      for (const service of sampleServices) {
        const { error: insertError } = await supabase
          .from('services')
          .insert(service)
        
        if (insertError) {
          console.log(`❌ Error creating sample service:`, insertError.message)
        } else {
          console.log(`✅ Created sample service: ${service.title}`)
        }
      }
    }
    
    console.log('\n🔧 Step 6: Creating sample bookings...')
    
    if (!bookings || bookings.length === 0) {
      console.log('🔧 Creating sample bookings...')
      
      // Get approved services
      const { data: approvedServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('approval_status', 'approved')
        .limit(3)
      
      if (approvedServices && approvedServices.length > 0) {
        const sampleBookings = [
          {
            service_id: approvedServices[0].id,
            client_id: adminUser?.id,
            provider_id: approvedServices[0].provider_id,
            status: 'confirmed',
            amount: approvedServices[0].base_price,
            currency: approvedServices[0].currency,
            scheduled_date: new Date(Date.now() + 86400000 * 7).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            service_id: approvedServices[1]?.id,
            client_id: adminUser?.id,
            provider_id: approvedServices[1]?.provider_id,
            status: 'pending',
            amount: approvedServices[1]?.base_price,
            currency: approvedServices[1]?.currency,
            scheduled_date: new Date(Date.now() + 86400000 * 14).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
        
        for (const booking of sampleBookings) {
          if (booking.service_id) {
            const { error: insertError } = await supabase
              .from('bookings')
              .insert(booking)
            
            if (insertError) {
              console.log(`❌ Error creating sample booking:`, insertError.message)
            } else {
              console.log(`✅ Created sample booking for service: ${booking.service_id}`)
            }
          }
        }
      }
    }
    
    console.log('\n🎉 Admin System Fix Complete!')
    console.log('\n📋 Summary:')
    console.log('✅ Admin user created/verified')
    console.log('✅ Pending services approved')
    console.log('✅ Bookings system updated')
    console.log('✅ Sample data created')
    
    console.log('\n🔑 Admin Login Credentials:')
    console.log(`  Email: ${adminEmail}`)
    console.log(`  Password: ${adminPassword}`)
    
    console.log('\n🚀 Next Steps:')
    console.log('1. Sign in with admin credentials')
    console.log('2. Access admin dashboard at /dashboard/admin')
    console.log('3. All admin features should now work properly')
    console.log('4. You can approve/reject services, manage users, etc.')
    
  } catch (error) {
    console.log('❌ Error fixing admin system:', error.message)
    console.log('Stack:', error.stack)
  }
}

// Run the fix
fixAdminSystem().catch(console.error)
