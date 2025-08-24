# PowerShell script to set up environment variables for Business Services Hub
# Run this script from the project root directory

Write-Host "🚀 Setting up environment variables for Business Services Hub..." -ForegroundColor Green

# Check if .env.local already exists
if (Test-Path ".env.local") {
    Write-Host "⚠️  .env.local already exists. Backing up to .env.local.backup" -ForegroundColor Yellow
    Copy-Item ".env.local" ".env.local.backup"
}

# Copy from env.example to .env.local
if (Test-Path "env.example") {
    Copy-Item "env.example" ".env.local"
    Write-Host "✅ Environment variables copied from env.example to .env.local" -ForegroundColor Green
} else {
    Write-Host "❌ env.example not found. Please ensure it exists in the project root." -ForegroundColor Red
    exit 1
}

# Verify the file was created
if (Test-Path ".env.local") {
    Write-Host "✅ .env.local created successfully" -ForegroundColor Green
    
    # Display the first few lines to confirm
    Write-Host "`n📋 First few lines of .env.local:" -ForegroundColor Cyan
    Get-Content ".env.local" | Select-Object -First 5 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    
    Write-Host "`n🔧 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Review .env.local and update any placeholder values" -ForegroundColor White
    Write-Host "   2. Restart your development server" -ForegroundColor White
    Write-Host "   3. Test the application" -ForegroundColor White
    
} else {
    Write-Host "❌ Failed to create .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "`n✨ Environment setup complete!" -ForegroundColor Green 