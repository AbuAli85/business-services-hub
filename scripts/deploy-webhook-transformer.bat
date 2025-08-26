@echo off
REM Deploy Webhook Transformer Edge Function
REM This script deploys the Edge Function and sets up the environment

echo 🚀 Deploying Webhook Transformer Edge Function...

REM Check if we're in the right directory
if not exist "supabase\config.toml" (
    echo ❌ Error: Please run this script from the project root directory
    pause
    exit /b 1
)

REM Check if Supabase CLI is installed
supabase --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Supabase CLI is not installed
    echo Please install it from: https://supabase.com/docs/guides/cli
    pause
    exit /b 1
)

REM Check if user is logged in
supabase status >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Not logged in to Supabase
    echo Please run: supabase login
    pause
    exit /b 1
)

echo 📋 Current project status:
supabase status

echo.
echo 🔧 Deploying Edge Function...
supabase functions deploy webhook-transformer

echo.
echo 🔑 Setting environment variables...

REM Set Make.com webhook URL (update this with your actual webhook URL)
echo Setting MAKE_WEBHOOK_URL...
supabase secrets set MAKE_WEBHOOK_URL=https://hook.eu2.make.com/ckseohqanys963qtkf773le623k2up7l

REM Set webhook ID
echo Setting MAKE_WEBHOOK_ID...
supabase secrets set MAKE_WEBHOOK_ID=services-webhook

echo.
echo ✅ Edge Function deployed successfully!
echo.
echo 📋 Next steps:
echo 1. Go to your Supabase Dashboard → Database → Webhooks
echo 2. Create webhook for 'services' table:
echo    - Name: services-webhook
echo    - Table: services
echo    - Events: INSERT only
echo    - URL: https://your-project.supabase.co/functions/v1/webhook-transformer
echo    - Method: POST
echo.
echo 3. Test by creating a service in your app
echo 4. Check Edge Function logs for any issues
echo.
echo 🔗 Edge Function URL: https://your-project.supabase.co/functions/v1/webhook-transformer
echo 📊 Monitor logs: Supabase Dashboard → Edge Functions → webhook-transformer → Logs

pause
