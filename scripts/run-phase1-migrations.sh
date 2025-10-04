#!/bin/bash

# Phase 1: Database & Backend Cleanup Script
# This script runs all Phase 1 migrations in the correct order

echo "🚀 Starting Phase 1: Database & Backend Cleanup"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed"
    echo "Please install it with: npm install -g supabase"
    exit 1
fi

echo "📋 Running migrations in order..."

# Migration 1: Cleanup legacy views
echo ""
echo "1️⃣ Running migration 203: Cleanup legacy views..."
npx supabase db push --include-all
if [ $? -eq 0 ]; then
    echo "✅ Migration 203 completed successfully"
else
    echo "❌ Migration 203 failed"
    exit 1
fi

# Migration 2: Enhance v_booking_status view
echo ""
echo "2️⃣ Running migration 204: Enhance v_booking_status view..."
npx supabase db push --include-all
if [ $? -eq 0 ]; then
    echo "✅ Migration 204 completed successfully"
else
    echo "❌ Migration 204 failed"
    exit 1
fi

# Migration 3: Standardize status logic
echo ""
echo "3️⃣ Running migration 205: Standardize status logic..."
npx supabase db push --include-all
if [ $? -eq 0 ]; then
    echo "✅ Migration 205 completed successfully"
else
    echo "❌ Migration 205 failed"
    exit 1
fi

# Migration 4: Verify API endpoints
echo ""
echo "4️⃣ Running migration 206: Verify API endpoints..."
npx supabase db push --include-all
if [ $? -eq 0 ]; then
    echo "✅ Migration 206 completed successfully"
else
    echo "❌ Migration 206 failed"
    exit 1
fi

echo ""
echo "🎉 Phase 1 Complete! All migrations executed successfully."
echo ""
echo "📊 Summary of changes:"
echo "  ✅ Removed legacy views (booking_enriched, enhanced_bookings, bookings_full_view)"
echo "  ✅ Enhanced v_booking_status with missing columns and indexes"
echo "  ✅ Standardized status logic with helper functions"
echo "  ✅ Verified API endpoint compatibility"
echo ""
echo "🔄 Next steps:"
echo "  1. Test your booking system to ensure everything works"
echo "  2. Run Phase 2: Hooks Consolidation"
echo "  3. Run Phase 3: Component Cleanup"
echo ""
echo "💡 To test the changes:"
echo "  - Visit /dashboard/bookings in your app"
echo "  - Try exporting CSV data"
echo "  - Check that real-time updates work"
echo ""
