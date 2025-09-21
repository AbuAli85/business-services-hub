#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testSignupWithoutCaptcha() {
  console.log('🧪 Testing Signup Without Captcha...\n');

  try {
    const testEmail = `test-user-${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    console.log(`📧 Testing with email: ${testEmail}`);

    // Test 1: Signup without any captcha token
    console.log('\n   Test 1: Signup without captcha token...');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: 'Test User',
            role: 'client',
          }
        }
      });

      if (error) {
        console.error('   ❌ Signup error:', error.message);
        console.error('   Error code:', error.status);
        console.error('   Full error:', error);
      } else if (data.user) {
        console.log(`   ✅ User registered successfully: ${data.user.email}`);
        console.log('      User ID:', data.user.id);
        console.log('      Email Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
      } else {
        console.log('   ⚠️ Signup completed but no user data returned.');
      }
    } catch (err) {
      console.error('   ❌ Unexpected error during signup:', err.message);
    }

    // Test 2: Check if captcha is required by Supabase
    console.log('\n   Test 2: Checking Supabase auth settings...');
    try {
      // Try to get auth settings
      const { data: settings, error: settingsError } = await supabase
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

    // Test 3: Check if there's a different signup method
    console.log('\n   Test 3: Trying alternative signup approach...');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: `alt-${testEmail}`,
        password: testPassword,
        options: {
          captchaToken: '', // Empty captcha token
          data: {
            full_name: 'Test User Alt',
            role: 'client',
          }
        }
      });

      if (error) {
        console.error('   ❌ Alternative signup error:', error.message);
      } else if (data.user) {
        console.log(`   ✅ Alternative signup successful: ${data.user.email}`);
      }
    } catch (err) {
      console.error('   ❌ Alternative signup failed:', err.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSignupWithoutCaptcha().catch(console.error);
