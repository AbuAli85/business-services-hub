@echo off
REM Batch script to set up environment variables for Business Services Hub
REM Run this script from the project root directory

echo 🚀 Setting up environment variables for Business Services Hub...

REM Check if .env.local already exists
if exist ".env.local" (
    echo ⚠️  .env.local already exists. Backing up to .env.local.backup
    copy ".env.local" ".env.local.backup"
)

REM Copy from env.example to .env.local
if exist "env.example" (
    copy "env.example" ".env.local"
    echo ✅ Environment variables copied from env.example to .env.local
) else (
    echo ❌ env.example not found. Please ensure it exists in the project root.
    pause
    exit /b 1
)

REM Verify the file was created
if exist ".env.local" (
    echo ✅ .env.local created successfully
    
    echo.
    echo 📋 First few lines of .env.local:
    type ".env.local" | findstr /n "^" | findstr "^[1-5]:"
    
    echo.
    echo 🔧 Next steps:
    echo    1. Review .env.local and update any placeholder values
    echo    2. Restart your development server
    echo    3. Test the application
    
) else (
    echo ❌ Failed to create .env.local
    pause
    exit /b 1
)

echo.
echo ✨ Environment setup complete!
pause 