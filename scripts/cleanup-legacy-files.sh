#!/bin/bash

echo "🧹 Starting Legacy Code Cleanup..."
echo "=================================="

# Safety check - make sure we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

echo "✅ Confirmed: In project root directory"

# Create backup directory
BACKUP_DIR="legacy_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📦 Created backup directory: $BACKUP_DIR"

# Function to safely remove file with backup
safe_remove() {
    local file="$1"
    if [ -f "$file" ]; then
        echo "🗑️  Removing: $file"
        # Create backup
        mkdir -p "$BACKUP_DIR/$(dirname "$file")"
        cp "$file" "$BACKUP_DIR/$file"
        # Remove original
        rm "$file"
        echo "✅ Removed and backed up: $file"
    else
        echo "⚠️  File not found: $file"
    fi
}

# Function to safely remove directory with backup
safe_remove_dir() {
    local dir="$1"
    if [ -d "$dir" ]; then
        echo "🗑️  Removing directory: $dir"
        # Create backup
        cp -r "$dir" "$BACKUP_DIR/"
        # Remove original
        rm -rf "$dir"
        echo "✅ Removed and backed up directory: $dir"
    else
        echo "⚠️  Directory not found: $dir"
    fi
}

echo ""
echo "1️⃣ Removing Legacy View Files..."
safe_remove "create_bookings_full_view.sql"
safe_remove "scripts/create-views-and-functions.sql"
safe_remove "scripts/optimize-database-performance.sql"

echo ""
echo "2️⃣ Removing Legacy Migration Files..."
safe_remove "supabase/migrations/043_create_enhanced_bookings_view.sql"
safe_remove "supabase/migrations/044_fix_enhanced_bookings_view.sql"
safe_remove "supabase/migrations/03_create_enriched_views.sql"
safe_remove "supabase/migrations/03_views.sql"
safe_remove "supabase/migrations/04_cleanup.sql"
safe_remove "supabase/migrations/04_fix_enriched_views_rls.sql"

echo ""
echo "3️⃣ Removing Legacy Documentation..."
safe_remove "docs/booking-list-display-fixes.md"
safe_remove "docs/schema-refactor-guide.md"
safe_remove "docs/migration-fix-summary.md"
safe_remove "BOOKING_DASHBOARD_DATA_FIXES_SUMMARY.md"
safe_remove "BOOKINGS_VERIFICATION_REPORT.md"

echo ""
echo "4️⃣ Removing Legacy Scripts..."
safe_remove "scripts/fix-remaining-security-definer-views.sql"
safe_remove "scripts/fix-remaining-security-definer-views-safe.sql"
safe_remove "scripts/fix-security-definer-views-simple.sql"
safe_remove "scripts/fix-security-definer-views-direct.sql"

echo ""
echo "5️⃣ Removing Legacy Progress System Files..."
safe_remove "lib/progress-tracking.ts"
safe_remove "lib/backend-progress-service.ts"
safe_remove "docs/backend-driven-progress-system.md"

echo ""
echo "6️⃣ Cleaning up empty directories..."
find . -type d -empty -delete 2>/dev/null || true

echo ""
echo "🎉 Legacy Code Cleanup Complete!"
echo "================================"
echo "📦 Backup created in: $BACKUP_DIR"
echo "📊 Files removed: $(find "$BACKUP_DIR" -type f | wc -l)"
echo ""
echo "✅ Your codebase is now clean and optimized!"
echo "🚀 Only the unified v_booking_status system remains active."
echo ""
echo "Next steps:"
echo "1. Test your application to ensure everything works"
echo "2. Commit the cleaned codebase"
echo "3. Remove the backup directory when you're confident everything works"
