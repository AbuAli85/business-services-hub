const fs = require('fs');

// Function to fix all remaining async issues in the company page
function fixAllCompanyIssues() {
  try {
    const filePath = 'app/dashboard/company/page.tsx';
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix all remaining await getSupabaseClient() patterns
    const fixes = [
      // Fix RPC calls
      {
        search: 'const { data: constraintData, error: constraintError } = await getSupabaseClient()\n          .rpc(\'get_table_constraints\', { table_name: \'companies\' })',
        replace: 'const supabaseRpc = await getSupabaseClient()\n        const { data: constraintData, error: constraintError } = await supabaseRpc\n          .rpc(\'get_table_constraints\', { table_name: \'companies\' })'
      },
      {
        search: 'const { data: tableInfo, error: tableError } = await getSupabaseClient()\n          .rpc(\'get_table_info\', { table_name: \'companies\' })',
        replace: 'const { data: tableInfo, error: tableError } = await supabaseRpc\n          .rpc(\'get_table_info\', { table_name: \'companies\' })'
      },
      // Fix any remaining direct calls
      {
        search: 'await getSupabaseClient()\n        .from(\'companies\')',
        replace: 'await supabaseRpc\n        .from(\'companies\')'
      },
      {
        search: 'await getSupabaseClient()\n        .from(\'profiles\')',
        replace: 'await supabaseRpc\n        .from(\'profiles\')'
      }
    ];
    
    fixes.forEach(fix => {
      if (content.includes(fix.search)) {
        content = content.replace(fix.search, fix.replace);
        modified = true;
        console.log(`✅ Fixed: ${fix.description || 'specific pattern'}`);
      }
    });
    
    // Also fix any remaining patterns that might have been missed
    const remainingPatterns = [
      {
        regex: /await getSupabaseClient\(\)\s*\.\s*rpc/g,
        replacement: 'await getSupabaseClient()\n        const supabaseRpc = await getSupabaseClient()\n        await supabaseRpc.rpc',
        description: 'RPC calls'
      }
    ];
    
    remainingPatterns.forEach(pattern => {
      if (pattern.regex.test(content)) {
        content = content.replace(pattern.regex, pattern.replacement);
        modified = true;
        console.log(`✅ Fixed: ${pattern.description}`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`\n🎉 All company page async issues fixed successfully!`);
    } else {
      console.log(`\n✅ Company page already fixed or no changes needed.`);
    }
    
    return modified;
  } catch (error) {
    console.error(`❌ Error fixing company page:`, error.message);
    return false;
  }
}

// Run the fix
console.log('🔧 Fixing all remaining company page async issues...');
fixAllCompanyIssues();
