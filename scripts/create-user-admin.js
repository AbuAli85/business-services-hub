#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createUserAdmin() {
  console.log('🔧 Creating User via Admin API (Bypassing Captcha)...\n');

  try {
    const testEmail = `admin-created-${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    console.log(`📧 Creating user: ${testEmail}`);

    // Create user via admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: 'Admin Created User',
        role: 'client',
        phone: '1234567890',
        company_name: 'Test Company'
      }
    });

    if (authError) {
      console.error('❌ Admin user creation error:', authError.message);
      return;
    }

    console.log('✅ User created via admin API:', {
      id: authData.user.id,
      email: authData.user.email,
      email_confirmed: !!authData.user.email_confirmed_at
    });

    // Check if profile was created automatically
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile not created automatically:', profileError.message);
      
      // Create profile manually
      console.log('🔧 Creating profile manually...');
      const { data: newProfile, error: newProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name: 'Admin Created User',
          role: 'client',
          phone: '1234567890',
          company_name: 'Test Company',
          verification_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (newProfileError) {
        console.error('❌ Manual profile creation failed:', newProfileError.message);
      } else {
        console.log('✅ Profile created manually:', {
          id: newProfile.id,
          email: newProfile.email,
          role: newProfile.role,
          verification_status: newProfile.verification_status
        });
      }
    } else {
      console.log('✅ Profile created automatically:', {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        verification_status: profile.verification_status
      });
    }

    // Verify the user appears in the admin API
    console.log('\n🔍 Verifying user appears in admin API...');
    const { data: apiUsers, error: apiError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id);

    if (apiError) {
      console.error('❌ API verification failed:', apiError.message);
    } else {
      console.log('✅ User verified in admin API:', apiUsers.length > 0 ? 'Yes' : 'No');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

createUserAdmin().catch(console.error);
