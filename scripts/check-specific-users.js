#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSpecificUsers() {
  console.log('🔍 Checking specific users that are not showing in admin dashboard...\n');

  const userIds = [
    '1bc3ba27-0de9-49d3-9253-7fc9f8b4602a',
    '5c62abad-c017-498d-be4e-c10658cf1075',
    'a25b6661-e378-4d89-af7c-f48b3c4f8f08'
  ];

  try {
    // Check profiles table
    console.log('1. Checking profiles table...');
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (profilesError) {
      console.error('❌ Profiles query error:', profilesError.message);
      return;
    }

    console.log(`✅ Found ${profiles.length} profiles for these IDs:`);
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.full_name} (${profile.email})`);
      console.log(`   - ID: ${profile.id}`);
      console.log(`   - Role: ${profile.role}`);
      console.log(`   - Verification Status: ${profile.verification_status}`);
      console.log(`   - Created: ${profile.created_at}`);
      console.log(`   - Email: ${profile.email}`);
      console.log('');
    });

    // Check auth users table
    console.log('2. Checking auth users table...');
    try {
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        console.error('❌ Auth users error:', authError.message);
        console.log('This might explain why users are not showing in admin dashboard');
      } else {
        console.log(`✅ Found ${authUsers.users.length} auth users`);
        
        const matchingAuthUsers = authUsers.users.filter(au => userIds.includes(au.id));
        console.log(`\n📅 Matching auth users: ${matchingAuthUsers.length}`);
        matchingAuthUsers.forEach((user, index) => {
          console.log(`${index + 1}. ${user.email} - ID: ${user.id}`);
          console.log(`   - Created: ${user.created_at}`);
          console.log(`   - Email confirmed: ${!!user.email_confirmed_at}`);
          console.log(`   - User metadata:`, user.user_metadata);
        });
      }
    } catch (authErr) {
      console.error('❌ Auth users query failed:', authErr.message);
    }

    // Test API response
    console.log('\n3. Testing API response...');
    try {
      const response = await fetch('https://marketing.thedigitalmorph.com/api/admin/users?test=true');
      const data = await response.json();
      
      console.log(`✅ API returned ${data.users?.length || 0} users`);
      
      const apiUserIds = data.users?.map(u => u.id) || [];
      const missingUsers = userIds.filter(id => !apiUserIds.includes(id));
      
      console.log(`\n❌ Users missing from API: ${missingUsers.length}`);
      missingUsers.forEach((id, index) => {
        const profile = profiles.find(p => p.id === id);
        console.log(`${index + 1}. ${id} - ${profile?.full_name || 'Unknown'} (${profile?.email || 'No email'})`);
      });
      
      if (missingUsers.length === 0) {
        console.log('✅ All users are present in API response');
      }
      
    } catch (apiErr) {
      console.error('❌ API test failed:', apiErr.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSpecificUsers().catch(console.error);
