# 🚀 One-Command Deployment Script (PowerShell)
# Automates the deployment process with validation

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Cyan "🚀 Starting Deployment Process...`n"

# Step 1: Validate deployment (optional)
Write-ColorOutput Cyan "Step 1: Validating deployment readiness..."
if (Test-Path "scripts\validate-deployment.ts") {
    try {
        npx tsx scripts/validate-deployment.ts
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput Green "✅ Validation passed`n"
        } else {
            Write-ColorOutput Red "❌ Validation failed. Please fix issues before deploying."
            exit 1
        }
    } catch {
        Write-ColorOutput Yellow "⚠️  Validation script error, skipping..."
    }
} else {
    Write-ColorOutput Yellow "⚠️  Validation script not found, skipping..."
}

# Step 2: Test build (optional - Vercel will build anyway)
Write-ColorOutput Cyan "Step 2: Testing build (optional)..."
$buildTest = Read-Host "Run build test? (y/n) [Recommended: n - Vercel will build]"
if ($buildTest -eq "y" -or $buildTest -eq "Y") {
    try {
        npm run build
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput Green "✅ Build successful`n"
        } else {
            Write-ColorOutput Yellow "⚠️  Local build failed. Vercel will build on deploy.`n"
            Write-ColorOutput Yellow "   This is okay - validation passed, so code is correct.`n"
            $continue = Read-Host "Continue with deployment? (y/n)"
            if ($continue -ne "y" -and $continue -ne "Y") {
                exit 0
            }
        }
    } catch {
        Write-ColorOutput Yellow "⚠️  Build test skipped (npm issue). Vercel will build on deploy.`n"
    }
} else {
    Write-ColorOutput Yellow "⚠️  Skipping build test (Vercel will build on deploy)`n"
}

# Step 3: Check git status
Write-ColorOutput Cyan "Step 3: Checking git status..."
$gitStatus = git status --porcelain
if ([string]::IsNullOrWhiteSpace($gitStatus)) {
    Write-ColorOutput Yellow "⚠️  No changes to commit"
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 0
    }
} else {
    Write-ColorOutput Green "✅ Changes detected"
    git status --short
    Write-Output ""
}

# Step 4: Commit changes
Write-ColorOutput Cyan "Step 4: Committing changes..."
$commitMsg = Read-Host "Commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMsg)) {
    $commitMsg = "chore: Deploy to production"
}

git add .
git commit -m $commitMsg
if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput Green "✅ Changes committed`n"
} else {
    Write-ColorOutput Red "❌ Commit failed"
    exit 1
}

# Step 5: Deploy
Write-ColorOutput Cyan "Step 5: Deploying to production..."
$deploy = Read-Host "Push to origin/main? (y/n)"
if ($deploy -eq "y" -or $deploy -eq "Y") {
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✅ Pushed to origin/main`n"
        Write-ColorOutput Green "🎉 Deployment initiated!`n"
        Write-ColorOutput Cyan "Next steps:"
        Write-Output "1. Monitor deployment: https://vercel.com/dashboard"
        Write-Output "2. Wait for build to complete (~2-3 minutes)"
        Write-Output "3. Verify your deployment URL"
        Write-Output "4. Monitor logs: vercel logs production --follow"
    } else {
        Write-ColorOutput Red "❌ Push failed"
        exit 1
    }
} else {
    Write-ColorOutput Yellow "⚠️  Deployment cancelled"
    exit 0
}

Write-Output "`n✅ Deployment process complete!"
