# PowerShell script to apply services migration and fix database schema issues
# This script will run the migration to add missing columns to the services table

param(
    [string]$Environment = "local"
)

Write-Host "🚀 Starting services migration..." -ForegroundColor Green

# Check if .env.local exists
$envPath = ".env.local"
if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env.local file not found. Please create it with your Supabase credentials." -ForegroundColor Red
    exit 1
}

# Load environment variables
Get-Content $envPath | ForEach-Object {
    if ($_ -match "^([^#][^=]+)=(.*)$") {
        $name = $matches[1]
        $value = $matches[2]
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# Check required environment variables
$supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$supabaseServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $supabaseUrl -or -not $supabaseServiceKey) {
    Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
    Write-Host "   NEXT_PUBLIC_SUPABASE_URL: $($supabaseUrl -ne $null)" -ForegroundColor Red
    Write-Host "   SUPABASE_SERVICE_ROLE_KEY: $($supabaseServiceKey -ne $null)" -ForegroundColor Red
    Write-Host "   Please check your .env.local file" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment variables loaded successfully" -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "   Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm packages are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing npm packages..." -ForegroundColor Yellow
    npm install
}

# Run the Node.js migration script
Write-Host "🔧 Running migration script..." -ForegroundColor Yellow
try {
    node scripts/apply-services-migration.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "🎉 Migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error running migration script: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your application" -ForegroundColor White
Write-Host "2. Try creating a new service" -ForegroundColor White
Write-Host "3. Check if the service detail page loads without errors" -ForegroundColor White
Write-Host ""
Write-Host "If you encounter issues, you can also:" -ForegroundColor Cyan
Write-Host "1. Run the migration manually in your Supabase dashboard SQL editor" -ForegroundColor White
Write-Host "2. Copy the SQL from supabase/migrations/046_fix_services_approval_status.sql" -ForegroundColor White
Write-Host "3. Execute it directly in the Supabase SQL editor" -ForegroundColor White
