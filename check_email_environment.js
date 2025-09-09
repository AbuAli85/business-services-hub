// Check email environment and dependencies
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Email Environment...\n');

// Check if Resend package is installed
try {
    const resend = require('resend');
    console.log('✅ Resend package is installed');
    
    // Try to create a Resend instance
    try {
        const resendInstance = new resend.Resend('test-key');
        console.log('✅ Resend can be instantiated');
    } catch (error) {
        console.log('❌ Resend instantiation error:', error.message);
    }
} catch (error) {
    console.log('❌ Resend package not found:', error.message);
}

// Check package.json for Resend
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.dependencies && packageJson.dependencies.resend) {
        console.log('✅ Resend is in package.json dependencies:', packageJson.dependencies.resend);
    } else if (packageJson.devDependencies && packageJson.devDependencies.resend) {
        console.log('✅ Resend is in package.json devDependencies:', packageJson.devDependencies.resend);
    } else {
        console.log('❌ Resend not found in package.json');
    }
} catch (error) {
    console.log('❌ Error reading package.json:', error.message);
}

// Check if .env files exist
const envFiles = ['.env', '.env.local', '.env.production'];
envFiles.forEach(envFile => {
    if (fs.existsSync(envFile)) {
        console.log(`✅ ${envFile} exists`);
        
        // Check for RESEND_API_KEY
        try {
            const envContent = fs.readFileSync(envFile, 'utf8');
            if (envContent.includes('RESEND_API_KEY')) {
                console.log(`✅ RESEND_API_KEY found in ${envFile}`);
            } else {
                console.log(`❌ RESEND_API_KEY not found in ${envFile}`);
            }
        } catch (error) {
            console.log(`❌ Error reading ${envFile}:`, error.message);
        }
    } else {
        console.log(`❌ ${envFile} does not exist`);
    }
});

// Check if API route exists
const apiRoutePath = 'app/api/send-email/route.ts';
if (fs.existsSync(apiRoutePath)) {
    console.log('✅ Email API route exists');
    
    // Check if route has proper imports
    try {
        const routeContent = fs.readFileSync(apiRoutePath, 'utf8');
        if (routeContent.includes('import { Resend }')) {
            console.log('✅ Resend import found in API route');
        } else {
            console.log('❌ Resend import not found in API route');
        }
        
        if (routeContent.includes('process.env.RESEND_API_KEY')) {
            console.log('✅ Environment variable check found in API route');
        } else {
            console.log('❌ Environment variable check not found in API route');
        }
    } catch (error) {
        console.log('❌ Error reading API route:', error.message);
    }
} else {
    console.log('❌ Email API route does not exist');
}

console.log('\n🔧 Common Issues and Solutions:');
console.log('1. Make sure RESEND_API_KEY is set in your environment variables');
console.log('2. Verify your Resend API key is valid and active');
console.log('3. Check that your Resend account is verified');
console.log('4. Ensure the API route is properly deployed');
console.log('5. Check server logs for detailed error messages');

console.log('\n📋 Next Steps:');
console.log('1. Run: node debug_email_500.js');
console.log('2. Open: debug_email_500.html in your browser');
console.log('3. Check your production server logs');
console.log('4. Verify environment variables in production');
