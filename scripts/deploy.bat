@echo off
echo 🚀 Business Services Hub - Production Deployment
echo ================================================

echo.
echo 📋 Checking prerequisites...

REM Check if package.json exists
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

REM Check if .env.production exists
if not exist ".env.production" (
    echo ⚠️  Warning: .env.production not found.
    echo    Please create it with production environment variables.
    echo    See deployment-config.md for details.
    echo.
)

echo ✅ Prerequisites check complete
echo.

echo 🧹 Cleaning previous builds...
if exist ".next" rmdir /s /q ".next"
if exist "out" rmdir /s /q "out"

echo 📦 Installing dependencies...
call npm ci --production

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo 🔨 Building production application...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed! Please check the errors above.
    pause
    exit /b 1
)

echo.
echo ✅ Build successful!
echo 📁 Production files ready in .next directory
echo.

echo 📊 Build size:
for /f "tokens=*" %%i in ('dir .next /s ^| find "File(s)"') do echo %%i

echo.
echo 🎉 Ready for deployment!
echo.
echo Next steps:
echo 1. Upload .next directory to your hosting platform
echo 2. Configure environment variables on your hosting platform
echo 3. Set up your domain and SSL certificate
echo 4. Test the live application
echo.
echo For detailed instructions, see DEPLOYMENT.md
echo.

pause
