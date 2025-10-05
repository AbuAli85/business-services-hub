# Quick Fix for UUID Type Mismatch Error

## 🚨 **Immediate Fix Required**

You're experiencing a UUID type mismatch error because the `audit_logs` table has conflicting column types. Here's how to fix it immediately:

## **Option 1: Apply Migration (Recommended)**

If you have Supabase CLI access:

```bash
# Apply the emergency fix migration
npx supabase db push

# Or apply just the emergency fix
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/210_emergency_fix_audit_logs_trigger.sql
```

## **Option 2: Manual Fix via Supabase Dashboard**

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Run this SQL script:**

```sql
-- Step 1: Disable problematic triggers temporarily
DROP TRIGGER IF EXISTS trigger_audit_milestones ON public.milestones;
DROP TRIGGER IF EXISTS trigger_audit_tasks ON public.tasks;

-- Step 2: Fix the audit_logs table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs' 
        AND column_name = 'record_id' 
        AND data_type = 'text'
    ) THEN
        -- Backup existing data
        CREATE TABLE IF NOT EXISTS public.audit_logs_backup AS 
        SELECT * FROM public.audit_logs;
        
        -- Drop and recreate table
        DROP TABLE IF EXISTS public.audit_logs CASCADE;
    END IF;
END $$;

-- Step 3: Create correct table structure
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Step 5: Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policies
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for authenticated users" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Step 7: Grant permissions
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;

-- Step 8: Create fixed trigger function
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    record_id_to_use UUID;
BEGIN
    -- Safely convert to UUID
    BEGIN
        IF TG_OP = 'DELETE' THEN
            record_id_to_use := OLD.id::UUID;
        ELSE
            record_id_to_use := NEW.id::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not convert id to UUID for audit log: %', COALESCE(NEW.id, OLD.id);
        RETURN COALESCE(NEW, OLD);
    END;

    -- Insert audit log
    INSERT INTO public.audit_logs (
        table_name, record_id, action, old_values, new_values, user_id, created_at
    ) VALUES (
        TG_TABLE_NAME,
        record_id_to_use,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE NULL END,
        COALESCE(NEW.user_id, OLD.user_id, auth.uid()),
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Re-enable triggers
CREATE TRIGGER trigger_audit_milestones
    AFTER INSERT OR UPDATE OR DELETE ON public.milestones
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER trigger_audit_tasks
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();
```

## **Option 3: Temporary Disable (Quickest)**

If you need an immediate fix and don't mind losing audit logging temporarily:

```sql
-- Just disable the problematic triggers
DROP TRIGGER IF EXISTS trigger_audit_milestones ON public.milestones;
DROP TRIGGER IF EXISTS trigger_audit_tasks ON public.tasks;
```

## **Verification**

After applying the fix, test the milestone update:

1. Go to your application
2. Try to update a milestone
3. Check the browser console - you should no longer see the UUID error
4. Check the Supabase logs - no more 500 errors

## **What This Fixes**

- ✅ **UUID Type Mismatch**: Converts `record_id` from TEXT to UUID
- ✅ **Trigger Errors**: Fixes the audit trigger function
- ✅ **Database Consistency**: Ensures all audit_logs operations work
- ✅ **Milestone Updates**: PATCH /api/milestones will work again

## **Next Steps**

After applying this fix:

1. **Test the application** - milestone updates should work
2. **Apply the other migrations** - for complete audit logging
3. **Monitor logs** - ensure no more UUID errors

The error should be resolved immediately after applying any of these fixes!
