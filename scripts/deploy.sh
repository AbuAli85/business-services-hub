#!/bin/bash

# 🚀 Business Services Hub Production Deployment Script

echo "🚀 Starting production deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "⚠️  Warning: .env.production not found. Please create it with production environment variables."
    echo "   See deployment-config.md for details."
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf out

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Build the application
echo "🔨 Building production application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 Production files ready in .next directory"
    
    # Show build size
    echo "📊 Build size:"
    du -sh .next
    
    echo ""
    echo "🎉 Ready for deployment!"
    echo ""
    echo "Next steps:"
    echo "1. Upload .next directory to your hosting platform"
    echo "2. Configure environment variables on your hosting platform"
    echo "3. Set up your domain and SSL certificate"
    echo "4. Test the live application"
    
else
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi
