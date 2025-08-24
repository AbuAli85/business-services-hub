const fs = require('fs');
const path = require('path');

// Function to recursively find all .tsx and .ts files
function findFiles(dir, extensions = ['.tsx', '.ts']) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      results = results.concat(findFiles(filePath, extensions));
    } else if (extensions.some(ext => file.endsWith(ext))) {
      results.push(filePath);
    }
  });
  
  return results;
}

// Function to fix async getSupabaseClient calls
function fixAsyncSupabaseCalls(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Pattern to match getSupabaseClient() calls that are not awaited
    // This regex looks for getSupabaseClient() calls that are not preceded by await
    const regex = /(?<!await\s+)(?<!const\s+supabase\s*=\s*await\s+)(?<!let\s+supabase\s*=\s*await\s+)(?<!var\s+supabase\s*=\s*await\s+)const\s+supabase\s*=\s*getSupabaseClient\(\)/g;
    
    if (regex.test(content)) {
      content = content.replace(regex, 'const supabase = await getSupabaseClient()');
      modified = true;
      console.log(`✅ Fixed: ${filePath}`);
    }
    
    // Also fix let and var declarations
    const letRegex = /(?<!await\s+)(?<!const\s+supabase\s*=\s*await\s+)(?<!let\s+supabase\s*=\s*await\s+)(?<!var\s+supabase\s*=\s*await\s+)let\s+supabase\s*=\s*getSupabaseClient\(\)/g;
    if (letRegex.test(content)) {
      content = content.replace(letRegex, 'let supabase = await getSupabaseClient()');
      modified = true;
      console.log(`✅ Fixed let: ${filePath}`);
    }
    
    const varRegex = /(?<!await\s+)(?<!const\s+supabase\s*=\s*await\s+)(?<!let\s+supabase\s*=\s*await\s+)(?<!var\s+supabase\s*=\s*await\s+)var\s+supabase\s*=\s*getSupabaseClient\(\)/g;
    if (varRegex.test(content)) {
      content = content.replace(varRegex, 'var supabase = await getSupabaseClient()');
      modified = true;
      console.log(`✅ Fixed var: ${filePath}`);
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
    
    return modified;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
console.log('🔍 Finding TypeScript/TSX files...');
const files = findFiles('.');
console.log(`📁 Found ${files.length} files to process`);

let fixedCount = 0;
files.forEach(file => {
  if (fixAsyncSupabaseCalls(file)) {
    fixedCount++;
  }
});

console.log(`\n🎉 Fix complete! Modified ${fixedCount} files.`);
console.log('\n📋 Next steps:');
console.log('1. Review the changes in git diff');
console.log('2. Test the build: npm run build');
console.log('3. Commit the changes if everything works');
