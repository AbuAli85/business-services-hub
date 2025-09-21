#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testProfilesQuery() {
  console.log('🧪 Testing profiles query directly...\n');

  try {
    // Test the exact query from the API
    console.log('1. Testing profiles query...');
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, phone, company_name, created_at, verification_status, profile_completed, email')
      .order('created_at', { ascending: false })
      .limit(500);

    if (profilesError) {
      console.error('❌ Profiles query error:', profilesError.message);
      return;
    }

    console.log(`✅ Profiles query returned ${profiles.length} profiles`);

    // Check for the specific missing users
    const missingUserIds = [
      '1bc3ba27-0de9-49d3-9253-7fc9f8b4602a',
      '5c62abad-c017-498d-be4e-c10658cf1075',
      'a25b6661-e378-4d89-af7c-f48b3c4f8f08'
    ];

    console.log('\n2. Checking for missing users...');
    missingUserIds.forEach((id, index) => {
      const profile = profiles.find(p => p.id === id);
      if (profile) {
        console.log(`✅ ${index + 1}. ${id} - FOUND: ${profile.full_name} (${profile.email})`);
        console.log(`   - Role: ${profile.role}`);
        console.log(`   - Verification Status: ${profile.verification_status}`);
        console.log(`   - Created: ${profile.created_at}`);
      } else {
        console.log(`❌ ${index + 1}. ${id} - NOT FOUND in profiles query`);
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

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testProfilesQuery().catch(console.error);
