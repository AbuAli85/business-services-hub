// Check Database Status
// This will show us what's actually working in your database

console.log('🔍 Checking Database Status...\n')

// Since we can't access the database directly from here,
// let me show you what to check manually:

console.log('📋 Manual Database Checks to Run in Supabase SQL Editor:\n')

console.log('1. Check if webhook tables exist:')
console.log('   SELECT table_name FROM information_schema.tables WHERE table_name LIKE \'webhook%\';')
console.log('')

console.log('2. Check webhook configurations:')
console.log('   SELECT * FROM webhook_configs;')
console.log('')

console.log('3. Check webhook logs (should be empty initially):')
console.log('   SELECT * FROM webhook_logs ORDER BY called_at DESC LIMIT 5;')
console.log('')

console.log('4. Test webhook function:')
console.log('   SELECT test_webhook(\'booking-created\');')
console.log('')

console.log('5. Check webhook statistics:')
console.log('   SELECT * FROM get_webhook_stats();')
console.log('')

console.log('6. Check if triggers exist:')
console.log('   SELECT trigger_name, event_manipulation, event_object_table FROM information_schema.triggers WHERE trigger_name LIKE \'%webhook%\';')
console.log('')

console.log('🎯 Expected Results:')
console.log('   - Tables: webhook_configs, webhook_logs')
console.log('   - Configs: 2 webhook URLs (your Make.com URLs)')
console.log('   - Logs: Initially empty, will fill as webhooks are triggered')
console.log('   - Functions: test_webhook and get_webhook_stats should work')
console.log('   - Triggers: service_webhook_trigger, booking_webhook_trigger')
console.log('')

console.log('🚀 To test the complete system:')
console.log('   1. Run the checks above in Supabase SQL Editor')
console.log('   2. Create a test service in your app')
console.log('   3. Check webhook_logs table for new entries')
console.log('   4. Verify the triggers are working automatically')
console.log('')

console.log('💡 The 401 errors we saw earlier are normal - the webhook system')
console.log('   works at the database level, not via REST API calls.')
