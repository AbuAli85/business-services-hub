#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugProductionAPI() {
  console.log('🔍 Debugging Production API Processing...\n');

  try {
    // Test the exact same query as the API
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

    // Test auth users query
    console.log('\n2. Testing auth users query...');
    let authUsers = [];
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) {
        console.error('❌ Auth users error:', authError.message);
        console.log('This explains why some users are missing from the API response');
      } else {
        authUsers = authData.users || [];
        console.log(`✅ Auth users query returned ${authUsers.length} users`);
      }
    } catch (authErr) {
      console.error('❌ Auth users query failed:', authErr.message);
    }

    // Simulate the API processing logic
    console.log('\n3. Simulating API processing logic...');
    const authById = new Map(authUsers.map((au) => [au.id, au]));

    const profileUsers = profiles.map((u) => {
      const au = authById.get(u.id);
      const email = au?.email || u.email || null;
      const fullName = u.full_name || (au?.user_metadata?.full_name) || (email ? email.split('@')[0] : 'User');
      const role = u.role || (au?.user_metadata?.role) || 'client';
      const metaStatus = (au?.user_metadata)?.status;
      const verificationStatus = u.verification_status;

      // Status determination logic
      let status;
      if (role === 'admin') {
        status = 'active';
      } else if (verificationStatus) {
        status = verificationStatus === 'approved' ? 'active' : 'pending';
      } else if (metaStatus) {
        status = metaStatus;
      } else {
        status = 'pending';
      }

      return {
        id: u.id,
        email,
        full_name: fullName,
        role,
        phone: u.phone || null,
        company_name: u.company_name || null,
        created_at: u.created_at,
        last_sign_in: au?.last_sign_in_at ? String(au.last_sign_in_at) : null,
        status,
        verification_status: u.verification_status || 'pending',
        is_verified: au ? !!au.email_confirmed_at : (email ? true : false),
        two_factor_enabled: au ? (Array.isArray(au.factors) && au.factors.length > 0) : false
      };
    });

    console.log(`✅ Processed ${profileUsers.length} users`);

    // Check for recent users in processed results
    const recentUserIds = [
      '1bc3ba27-0de9-49d3-9253-7fc9f8b4602a', // NAwaz mohammad
      '5c62abad-c017-498d-be4e-c10658cf1075'  // Techx oman
    ];

    console.log('\n4. Checking recent users in processed results...');
    recentUserIds.forEach((id, index) => {
      const user = profileUsers.find(u => u.id === id);
      if (user) {
        console.log(`✅ ${index + 1}. ${id} - FOUND: ${user.full_name} (${user.email})`);
        console.log(`   - Status: ${user.status}`);
        console.log(`   - Verification Status: ${user.verification_status}`);
        console.log(`   - Has Auth User: ${authById.has(id)}`);
      } else {
        console.log(`❌ ${index + 1}. ${id} - NOT FOUND in processed results`);
      }
    });

    // Show all processed users
    console.log('\n5. All processed users:');
    profileUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name} (${user.email}) - ${user.status} - ${user.verification_status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugProductionAPI().catch(console.error);
