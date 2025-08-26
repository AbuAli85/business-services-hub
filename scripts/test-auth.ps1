# PowerShell script to test Supabase Authentication
# Run this script from the project root directory

Write-Host "🔍 Testing Supabase Authentication..." -ForegroundColor Green
Write-Host ""

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "❌ .env.local not found!" -ForegroundColor Red
    Write-Host "Please run: .\scripts\setup-env.ps1" -ForegroundColor Yellow
    exit 1
}

# Load environment variables
Write-Host "📋 Loading environment variables..." -ForegroundColor Cyan
$envContent = Get-Content ".env.local" | Where-Object { $_ -match '^[^#]' -and $_ -match '=' }
$envVars = @{}

foreach ($line in $envContent) {
    if ($line -match '^([^=]+)=(.*)$') {
        $key = $matches[1]
        $value = $matches[2]
        $envVars[$key] = $value
    }
}

# Check required variables
$supabaseUrl = $envVars["NEXT_PUBLIC_SUPABASE_URL"]
$supabaseKey = $envVars["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

Write-Host "  Supabase URL: $($supabaseUrl ? '✅ Set' : '❌ Missing')" -ForegroundColor $(if ($supabaseUrl) { "Green" } else { "Red" })
Write-Host "  Supabase Key: $($supabaseKey ? '✅ Set' : '❌ Missing')" -ForegroundColor $(if ($supabaseKey) { "Green" } else { "Red" })

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Host ""
    Write-Host "❌ Environment variables not configured!" -ForegroundColor Red
    Write-Host "Please check your .env.local file" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🔧 Testing Supabase connection..." -ForegroundColor Cyan

# Test basic connection (this is a simple test without actual API calls)
try {
    if ($supabaseUrl -match '^https://[^/]+\.supabase\.co$') {
        Write-Host "✅ Supabase URL format is valid" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Supabase URL format may be incorrect" -ForegroundColor Yellow
    }
    
    if ($supabaseKey -match '^eyJ[A-Za-z0-9+/=]+$') {
        Write-Host "✅ Supabase key format is valid" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Supabase key format may be incorrect" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Connection test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Next steps to test authentication:" -ForegroundColor Cyan
Write-Host "1. Start your development server: npm run dev" -ForegroundColor White
Write-Host "2. Open your browser and go to the app" -ForegroundColor White
Write-Host "3. Try to sign in" -ForegroundColor White
Write-Host "4. Check the browser console for any errors" -ForegroundColor White
Write-Host "5. If you get 'Unauthorized' errors:" -ForegroundColor Yellow
Write-Host "   - Clear browser cache and cookies" -ForegroundColor White
Write-Host "   - Sign out and sign in again" -ForegroundColor White
Write-Host "   - Check that your Supabase project is active" -ForegroundColor White

Write-Host ""
Write-Host "🔧 For detailed testing, run: node scripts/test-auth.js" -ForegroundColor Cyan
Write-Host "🎉 Environment check complete!" -ForegroundColor Green
