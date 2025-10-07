#!/usr/bin/env node

/**
 * Script to check and fix environment URL configuration
 * This helps identify and fix domain typos in environment variables
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking environment URL configuration...\n');

// Check for environment files
const envFiles = ['.env', '.env.local', '.env.production', '.env.development'];
const foundEnvFiles = [];

envFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    foundEnvFiles.push(file);
  }
});

if (foundEnvFiles.length === 0) {
  console.log('❌ No environment files found');
  process.exit(1);
}

console.log('📁 Found environment files:', foundEnvFiles.join(', '));

// Check each environment file
let hasIssues = false;

foundEnvFiles.forEach(file => {
  console.log(`\n🔍 Checking ${file}:`);
  
  const filePath = path.join(__dirname, '..', file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for URL-related environment variables
    if (line.includes('NEXT_PUBLIC_APP_URL') || line.includes('NEXT_PUBLIC_BASE_URL')) {
      console.log(`  Line ${lineNum}: ${line}`);
      
      // Check for typos
      if (line.includes('theditgialmorph.com')) {
        console.log(`  ❌ TYPO FOUND: theditgialmorph.com should be thedigitalmorph.com`);
        hasIssues = true;
      }
      
      // Check for correct domain
      if (line.includes('thedigitalmorph.com')) {
        console.log(`  ✅ Correct domain found`);
      }
    }
  });
});

// Check process.env (if available)
console.log('\n🔍 Checking process.env:');
const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;
if (envUrl) {
  console.log(`  NEXT_PUBLIC_APP_URL: ${envUrl}`);
  if (envUrl.includes('theditgialmorph.com')) {
    console.log(`  ❌ TYPO FOUND in process.env: theditgialmorph.com should be thedigitalmorph.com`);
    hasIssues = true;
  } else if (envUrl.includes('thedigitalmorph.com')) {
    console.log(`  ✅ Correct domain in process.env`);
  }
} else {
  console.log(`  No NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_BASE_URL found in process.env`);
}

// Summary
console.log('\n📊 Summary:');
if (hasIssues) {
  console.log('❌ Issues found! Please fix the domain typos in your environment variables.');
  console.log('\n🔧 To fix:');
  console.log('1. Update your environment variables to use: https://marketing.thedigitalmorph.com');
  console.log('2. Replace any instances of "theditgialmorph.com" with "thedigitalmorph.com"');
  console.log('3. Redeploy your application');
} else {
  console.log('✅ No domain typos found in environment variables');
}

console.log('\n💡 Recommended environment variable:');
console.log('NEXT_PUBLIC_APP_URL=https://marketing.thedigitalmorph.com');
