const fs = require('fs');

// Function to fix the company page async issues
function fixCompanyPage() {
  try {
    const filePath = 'app/dashboard/company/page.tsx';
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Pattern to match await getSupabaseClient() followed by .from, .auth, .storage
    const patterns = [
      // Fix await getSupabaseClient().from(...)
      {
        regex: /await getSupabaseClient\(\)\s*\.\s*from\s*\(/g,
        replacement: 'await getSupabaseClient()\n        .from(',
        description: 'await getSupabaseClient().from(...)'
      },
      // Fix await getSupabaseClient().auth.getUser()
      {
        regex: /await getSupabaseClient\(\)\s*\.\s*auth\s*\.\s*getUser\(\)/g,
        replacement: 'await getSupabaseClient()\n      const { data: { user } } = await supabase.auth.getUser()',
        description: 'await getSupabaseClient().auth.getUser()'
      },
      // Fix await getSupabaseClient().storage
      {
        regex: /await getSupabaseClient\(\)\s*\.\s*storage/g,
        replacement: 'await getSupabaseClient()\n      const { data, error } = await supabase.storage',
        description: 'await getSupabaseClient().storage'
      }
    ];
    
    patterns.forEach(pattern => {
      if (pattern.regex.test(content)) {
        content = content.replace(pattern.regex, pattern.replacement);
        modified = true;
        console.log(`✅ Fixed: ${pattern.description}`);
      }
    });
    
    // Now fix the specific patterns that need proper variable assignment
    const specificFixes = [
      // Fix the specific pattern around line 951
      {
        search: 'const { data: currentDbData, error: fetchError } = await getSupabaseClient()\n        .from(\'companies\')',
        replace: 'const supabase = await getSupabaseClient()\n      const { data: currentDbData, error: fetchError } = await supabase\n        .from(\'companies\')'
      },
      {
        search: 'const { data: emailConflicts, error: conflictError } = await getSupabaseClient()\n        .from(\'companies\')',
        replace: 'const { data: emailConflicts, error: conflictError } = await supabase\n        .from(\'companies\')'
      },
      {
        search: 'const { data: constraintData, error: constraintError } = await getSupabaseClient()\n        .from(\'companies\')',
        replace: 'const { data: constraintData, error: constraintError } = await supabase\n        .from(\'companies\')'
      },
      {
        search: 'const { data: tableInfo, error: tableError } = await getSupabaseClient()\n        .from(\'companies\')',
        replace: 'const { data: tableInfo, error: tableError } = await supabase\n        .from(\'companies\')'
      },
      {
        search: 'const { error } = await getSupabaseClient()\n        .from(\'companies\')',
        replace: 'const { error } = await supabase\n        .from(\'companies\')'
      }
    ];
    
    specificFixes.forEach(fix => {
      if (content.includes(fix.search)) {
        content = content.replace(fix.search, fix.replace);
        modified = true;
        console.log(`✅ Fixed specific pattern`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`\n🎉 Company page fixed successfully!`);
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
console.log('🔧 Fixing company page async issues...');
fixCompanyPage();
