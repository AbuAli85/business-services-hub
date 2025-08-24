const fs = require('fs');

// Function to fix the company page async issues with unique variable names
function fixCompanyPageV2() {
  try {
    const filePath = 'app/dashboard/company/page.tsx';
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix the specific patterns that need proper variable assignment
    const specificFixes = [
      // Fix around line 951 - use supabaseDb for database operations
      {
        search: 'const supabase = await getSupabaseClient()\n      const { data: currentDbData, error: fetchError } = await supabase\n        .from(\'companies\')',
        replace: 'const supabaseDb = await getSupabaseClient()\n      const { data: currentDbData, error: fetchError } = await supabaseDb\n        .from(\'companies\')'
      },
      {
        search: 'const { data: emailConflicts, error: conflictError } = await supabase\n        .from(\'companies\')',
        replace: 'const { data: emailConflicts, error: conflictError } = await supabaseDb\n        .from(\'companies\')'
      },
      {
        search: 'const { data: constraintData, error: constraintError } = await supabase\n        .from(\'companies\')',
        replace: 'const { data: constraintData, error: constraintError } = await supabaseDb\n        .from(\'companies\')'
      },
      {
        search: 'const { data: tableInfo, error: tableError } = await supabase\n        .from(\'companies\')',
        replace: 'const { data: tableInfo, error: tableError } = await supabaseDb\n        .from(\'companies\')'
      },
      {
        search: 'const { error } = await supabase\n        .from(\'companies\')',
        replace: 'const { error } = await supabaseDb\n        .from(\'companies\')'
      }
    ];
    
    specificFixes.forEach(fix => {
      if (content.includes(fix.search)) {
        content = content.replace(fix.search, fix.replace);
        modified = true;
        console.log(`✅ Fixed specific pattern with unique variable name`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`\n🎉 Company page fixed successfully with unique variable names!`);
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
console.log('🔧 Fixing company page async issues with unique variable names...');
fixCompanyPageV2();
