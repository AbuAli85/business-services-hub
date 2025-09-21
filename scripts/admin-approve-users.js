import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function adminApproveUsers() {
  console.log('🔧 Admin User Management Tool');
  console.log('============================');

  // 1. Get all pending users
  console.log('\n1. Fetching pending users...');
  const { data: pendingUsers, error: pendingError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, role, phone, company_name, created_at, verification_status')
    .eq('verification_status', 'pending')
    .order('created_at', { ascending: false });

  if (pendingError) {
    console.error('❌ Error fetching pending users:', pendingError.message);
    return;
  }

  console.log(`✅ Found ${pendingUsers.length} pending users:`);
  pendingUsers.forEach((user, index) => {
    console.log(`\n${index + 1}. ${user.full_name || 'N/A'} (${user.email})`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Company: ${user.company_name || 'N/A'}`);
    console.log(`   - Phone: ${user.phone || 'N/A'}`);
    console.log(`   - Created: ${new Date(user.created_at).toLocaleString()}`);
    console.log(`   - ID: ${user.id}`);
  });

  // 2. Show recent users (last 5)
  console.log('\n2. Recent users (last 5):');
  const { data: recentUsers, error: recentError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, role, verification_status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentError) {
    console.error('❌ Error fetching recent users:', recentError.message);
  } else {
    recentUsers.forEach((user, index) => {
      const status = user.verification_status === 'pending' ? '🟡 PENDING' : 
                   user.verification_status === 'approved' ? '✅ APPROVED' : '❌ REJECTED';
      console.log(`${index + 1}. ${user.full_name || 'N/A'} (${user.email}) - ${status}`);
    });
  }

  // 3. Approve specific users (you can modify this)
  console.log('\n3. Approving recent pending users...');
  
  const usersToApprove = [
    '1bc3ba27-0de9-49d3-9253-7fc9f8b4602a', // NAwaz mohammad
    '5c62abad-c017-498d-be4e-c10658cf1075', // Techx oman
    '2d29aee9-ad69-4892-a48f-187a6d1128f9'  // Admin Created User
  ];

  for (const userId of usersToApprove) {
    const user = pendingUsers.find(u => u.id === userId);
    if (user) {
      console.log(`\n   Approving: ${user.full_name} (${user.email})`);
      
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          verification_status: 'approved',
          verified_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error(`   ❌ Error approving ${user.full_name}:`, updateError.message);
      } else {
        console.log(`   ✅ Successfully approved ${user.full_name}`);
      }
    } else {
      console.log(`   ⚠️ User ${userId} not found in pending users`);
    }
  }

  // 4. Show final status
  console.log('\n4. Final status after approval:');
  const { data: finalUsers, error: finalError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, verification_status')
    .in('id', usersToApprove);

  if (finalError) {
    console.error('❌ Error fetching final status:', finalError.message);
  } else {
    finalUsers.forEach(user => {
      const status = user.verification_status === 'pending' ? '🟡 PENDING' : 
                   user.verification_status === 'approved' ? '✅ APPROVED' : '❌ REJECTED';
      console.log(`   ${user.full_name} (${user.email}) - ${status}`);
    });
  }

  console.log('\n🏁 Admin approval process complete!');
  console.log('\nYou can now refresh the admin dashboard to see the approved users.');
}

adminApproveUsers().catch(console.error);
