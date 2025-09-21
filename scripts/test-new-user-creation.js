#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testNewUserCreation() {
  console.log('🧪 Testing New User Creation Process...\n');

  try {
    // 1. Check current user count
    console.log('1. Checking current user count...');
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, verification_status, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ Profiles query error:', profilesError.message);
      return;
    }
    console.log(`✅ Current profiles: ${profiles.length}`);

    // 2. Test user registration with different approaches
    console.log('\n2. Testing user registration...');
    const testEmail = `test-user-${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    const testFullName = 'Test User';
    const testRole = 'client';

    console.log(`📧 Testing with email: ${testEmail}`);

    // Test 1: Basic signup without captcha
    console.log('\n   Test 1: Basic signup without captcha...');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: testFullName,
            role: testRole,
          }
        }
      });

      if (error) {
        console.error('   ❌ Signup error:', error.message);
        console.error('   Error details:', error);
      } else if (data.user) {
        console.log(`   ✅ User registered successfully: ${data.user.email}`);
        console.log('      User ID:', data.user.id);
        console.log('      Email Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
        
        // Check if profile was created
        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (profileError) {
          console.error('   ❌ Profile creation failed:', profileError.message);
        } else {
          console.log('   ✅ Profile created successfully:', {
            id: newProfile.id,
            email: newProfile.email,
            full_name: newProfile.full_name,
            role: newProfile.role,
            verification_status: newProfile.verification_status
          });
        }
      } else {
        console.log('   ⚠️ Signup completed but no user data returned.');
      }
    } catch (err) {
      console.error('   ❌ Unexpected error during signup:', err.message);
    }

    // 3. Check if captcha is required
    console.log('\n3. Checking captcha requirements...');
    try {
      const { data: settings, error: settingsError } = await supabaseAdmin
        .from('auth.config')
        .select('*');
      
      if (settingsError) {
        console.log('   ℹ️ Could not check auth config:', settingsError.message);
      } else {
        console.log('   Auth config:', settings);
      }
    } catch (err) {
      console.log('   ℹ️ Could not check auth settings');
    }

    // 4. Check recent profiles again
    console.log('\n4. Checking profiles after test...');
    const { data: updatedProfiles, error: updatedError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, verification_status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (updatedError) {
      console.error('❌ Updated profiles query error:', updatedError.message);
    } else {
      console.log(`✅ Updated profiles count: ${updatedProfiles.length}`);
      console.log('📊 Recent profiles:');
      updatedProfiles.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.full_name} (${p.email}) - ${p.verification_status} - ${p.created_at}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNewUserCreation().catch(console.error);
