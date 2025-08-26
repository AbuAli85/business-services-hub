# PowerShell script to set up environment variables for Business Services Hub
# Run this script from the project root directory

Write-Host "🚀 Setting up environment variables for Business Services Hub..." -ForegroundColor Green

# Check if .env.local exists
if (Test-Path ".env.local") {
    Write-Host "⚠️  .env.local already exists. Backing up..." -ForegroundColor Yellow
    Copy-Item ".env.local" ".env.local.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Host "✅ Backup created" -ForegroundColor Green
}

# Copy env.example to .env.local
if (Test-Path "env.example") {
    Copy-Item "env.example" ".env.local"
    Write-Host "✅ Created .env.local from env.example" -ForegroundColor Green
} else {
    Write-Host "❌ env.example not found!" -ForegroundColor Red
    exit 1
}

# Check if .env.local was created
if (Test-Path ".env.local") {
    Write-Host "✅ Environment file created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Review .env.local and update any values if needed" -ForegroundColor White
    Write-Host "2. Restart your development server" -ForegroundColor White
    Write-Host "3. Clear browser cache and cookies" -ForegroundColor White
    Write-Host "4. Sign in again to refresh your session" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 If you still get authentication errors:" -ForegroundColor Yellow
    Write-Host "   - Check that your Supabase project is active" -ForegroundColor White
    Write-Host "   - Verify your API keys are correct" -ForegroundColor White
    Write-Host "   - Try signing out and signing in again" -ForegroundColor White
} else {
    Write-Host "❌ Failed to create .env.local" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Environment setup complete!" -ForegroundColor Green 