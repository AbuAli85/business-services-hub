#!/usr/bin/env node

/**
 * Test script to check API endpoints and identify RLS policy issues
 * Run this after applying the RLS policy fixes
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEndpoints() {
  console.log('🧪 Testing API endpoints...\n');

  // Test 1: Check profiles table access
  console.log('1. Testing profiles table access...');
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, role, verification_status')
      .limit(1);
    
    if (error) {
      console.error('   ❌ Profiles error:', error.message);
    } else {
      console.log('   ✅ Profiles access successful');
    }
  } catch (err) {
    console.error('   ❌ Profiles exception:', err.message);
  }

  // Test 2: Check notifications table access
  console.log('\n2. Testing notifications table access...');
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, type, title')
      .limit(1);
    
    if (error) {
      console.error('   ❌ Notifications error:', error.message);
    } else {
      console.log('   ✅ Notifications access successful');
    }
  } catch (err) {
    console.error('   ❌ Notifications exception:', err.message);
  }

  // Test 3: Check companies table access
  console.log('\n3. Testing companies table access...');
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, owner_id')
      .limit(1);
    
    if (error) {
      console.error('   ❌ Companies error:', error.message);
    } else {
      console.log('   ✅ Companies access successful');
    }
  } catch (err) {
    console.error('   ❌ Companies exception:', err.message);
  }

  // Test 4: Check bookings table access
  console.log('\n4. Testing bookings table access...');
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id, status')
      .limit(1);
    
    if (error) {
      console.error('   ❌ Bookings error:', error.message);
    } else {
      console.log('   ✅ Bookings access successful');
    }
  } catch (err) {
    console.error('   ❌ Bookings exception:', err.message);
  }

  console.log('\n🏁 Testing complete!');
}

// Run the tests
testEndpoints().catch(console.error);
