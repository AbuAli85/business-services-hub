#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkProductionDB() {
  console.log('🔍 Checking Production Database...\n');

  try {
    // Check all profiles
    console.log('1. Checking all profiles in production database...');
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, verification_status, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ Profiles query error:', profilesError.message);
      return;
    }

    console.log(`✅ Total profiles in production database: ${profiles.length}`);

    // Check for the specific recent users
    const recentUserIds = [
      '1bc3ba27-0de9-49d3-9253-7fc9f8b4602a', // NAwaz mohammad
      '5c62abad-c017-498d-be4e-c10658cf1075'  // Techx oman
    ];

    console.log('\n2. Checking for recent users...');
    recentUserIds.forEach((id, index) => {
      const profile = profiles.find(p => p.id === id);
      if (profile) {
        console.log(`✅ ${index + 1}. ${id} - FOUND: ${profile.full_name} (${profile.email})`);
        console.log(`   - Verification Status: ${profile.verification_status}`);
        console.log(`   - Created: ${profile.created_at}`);
      } else {
        console.log(`❌ ${index + 1}. ${id} - NOT FOUND in production database`);
      }
    });

    // Show recent profiles
    console.log('\n3. Recent profiles (last 5):');
    profiles.slice(0, 5).forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.full_name} (${profile.email})`);
      console.log(`   - ID: ${profile.id}`);
      console.log(`   - Created: ${profile.created_at}`);
      console.log(`   - Verification Status: ${profile.verification_status}`);
    });

    // Check if there are any pending users
    const pendingUsers = profiles.filter(p => p.verification_status === 'pending');
    console.log(`\n4. Pending users: ${pendingUsers.length}`);
    pendingUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name} (${user.email}) - ${user.id}`);
    });

    // Test the exact query that the API uses
    console.log('\n5. Testing API query...');
    const { data: apiProfiles, error: apiError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, phone, company_name, created_at, verification_status, profile_completed, email')
      .order('created_at', { ascending: false })
      .limit(500);

    if (apiError) {
      console.error('❌ API query error:', apiError.message);
    } else {
      console.log(`✅ API query returned ${apiProfiles.length} profiles`);
      
      // Check if recent users are in API query results
      const recentInAPI = apiProfiles.filter(p => recentUserIds.includes(p.id));
      console.log(`📊 Recent users in API query: ${recentInAPI.length}`);
      recentInAPI.forEach((user, index) => {
        console.log(`${index + 1}. ${user.full_name} (${user.email}) - ${user.verification_status}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkProductionDB().catch(console.error);
