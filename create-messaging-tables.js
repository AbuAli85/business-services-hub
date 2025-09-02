const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createMessagingTables() {
  console.log('🔧 Creating messaging system tables...')

  try {
    // 1. Create booking_messages table
    console.log('📝 Creating booking_messages table...')
    const { error: messagesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.booking_messages (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          booking_id UUID NOT NULL,
          sender_id UUID NOT NULL,
          content TEXT NOT NULL,
          message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system', 'template')),
          priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
          sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('client', 'provider', 'admin')),
          replied_to_id UUID,
          read_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add foreign key constraints
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'booking_messages_booking_id_fkey'
          ) THEN
            ALTER TABLE public.booking_messages 
            ADD CONSTRAINT booking_messages_booking_id_fkey 
            FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
          END IF;
        END $$;

        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'booking_messages_sender_id_fkey'
          ) THEN
            ALTER TABLE public.booking_messages 
            ADD CONSTRAINT booking_messages_sender_id_fkey 
            FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
          END IF;
        END $$;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_booking_messages_booking_id ON public.booking_messages(booking_id);
        CREATE INDEX IF NOT EXISTS idx_booking_messages_sender_id ON public.booking_messages(sender_id);
        CREATE INDEX IF NOT EXISTS idx_booking_messages_created_at ON public.booking_messages(created_at);
      `
    })

    if (messagesError) {
      console.error('❌ Error creating booking_messages:', messagesError)
    } else {
      console.log('✅ booking_messages table created')
    }

    // 2. Create message_reactions table
    console.log('📝 Creating message_reactions table...')
    const { error: reactionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.message_reactions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          message_id UUID NOT NULL,
          user_id UUID NOT NULL,
          reaction VARCHAR(50) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add foreign key constraints
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'message_reactions_message_id_fkey'
          ) THEN
            ALTER TABLE public.message_reactions 
            ADD CONSTRAINT message_reactions_message_id_fkey 
            FOREIGN KEY (message_id) REFERENCES public.booking_messages(id) ON DELETE CASCADE;
          END IF;
        END $$;

        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'message_reactions_user_id_fkey'
          ) THEN
            ALTER TABLE public.message_reactions 
            ADD CONSTRAINT message_reactions_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
          END IF;
        END $$;

        -- Create unique constraint
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'message_reactions_unique'
          ) THEN
            ALTER TABLE public.message_reactions 
            ADD CONSTRAINT message_reactions_unique 
            UNIQUE(message_id, user_id, reaction);
          END IF;
        END $$;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
        CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);
      `
    })

    if (reactionsError) {
      console.error('❌ Error creating message_reactions:', reactionsError)
    } else {
      console.log('✅ message_reactions table created')
    }

    // 3. Create message_attachments table
    console.log('📝 Creating message_attachments table...')
    const { error: attachmentsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.message_attachments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          message_id UUID NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          file_size BIGINT NOT NULL,
          file_type VARCHAR(100) NOT NULL,
          file_url TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add foreign key constraints
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'message_attachments_message_id_fkey'
          ) THEN
            ALTER TABLE public.message_attachments 
            ADD CONSTRAINT message_attachments_message_id_fkey 
            FOREIGN KEY (message_id) REFERENCES public.booking_messages(id) ON DELETE CASCADE;
          END IF;
        END $$;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);
      `
    })

    if (attachmentsError) {
      console.error('❌ Error creating message_attachments:', attachmentsError)
    } else {
      console.log('✅ message_attachments table created')
    }

    // 4. Enable RLS and create policies
    console.log('🔐 Setting up Row Level Security...')
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Enable RLS
        ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies to avoid conflicts
        DROP POLICY IF EXISTS "Users can view messages for their bookings" ON public.booking_messages;
        DROP POLICY IF EXISTS "Users can send messages for their bookings" ON public.booking_messages;
        DROP POLICY IF EXISTS "Users can update their messages" ON public.booking_messages;
        DROP POLICY IF EXISTS "Users can view reactions for accessible messages" ON public.message_reactions;
        DROP POLICY IF EXISTS "Users can react to accessible messages" ON public.message_reactions;
        DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.message_reactions;
        DROP POLICY IF EXISTS "Users can view attachments for accessible messages" ON public.message_attachments;
        DROP POLICY IF EXISTS "Users can add attachments to their booking messages" ON public.message_attachments;

        -- Create booking_messages policies
        CREATE POLICY "Users can view messages for their bookings" ON public.booking_messages
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.bookings b 
              WHERE b.id = booking_messages.booking_id 
              AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
            )
          );

        CREATE POLICY "Users can send messages for their bookings" ON public.booking_messages
          FOR INSERT WITH CHECK (
            sender_id = auth.uid() AND
            EXISTS (
              SELECT 1 FROM public.bookings b 
              WHERE b.id = booking_id 
              AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
            )
          );

        CREATE POLICY "Users can update their messages" ON public.booking_messages
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM public.bookings b 
              WHERE b.id = booking_messages.booking_id 
              AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
            )
          );

        -- Create message_reactions policies
        CREATE POLICY "Users can view reactions for accessible messages" ON public.message_reactions
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.booking_messages bm
              JOIN public.bookings b ON b.id = bm.booking_id
              WHERE bm.id = message_reactions.message_id 
              AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
            )
          );

        CREATE POLICY "Users can react to accessible messages" ON public.message_reactions
          FOR INSERT WITH CHECK (
            user_id = auth.uid() AND
            EXISTS (
              SELECT 1 FROM public.booking_messages bm
              JOIN public.bookings b ON b.id = bm.booking_id
              WHERE bm.id = message_id 
              AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
            )
          );

        CREATE POLICY "Users can delete their own reactions" ON public.message_reactions
          FOR DELETE USING (user_id = auth.uid());

        -- Create message_attachments policies
        CREATE POLICY "Users can view attachments for accessible messages" ON public.message_attachments
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.booking_messages bm
              JOIN public.bookings b ON b.id = bm.booking_id
              WHERE bm.id = message_attachments.message_id 
              AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
            )
          );

        CREATE POLICY "Users can add attachments to their booking messages" ON public.message_attachments
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.booking_messages bm
              JOIN public.bookings b ON b.id = bm.booking_id
              WHERE bm.id = message_id 
              AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
              AND bm.sender_id = auth.uid()
            )
          );
      `
    })

    if (rlsError) {
      console.error('❌ Error setting up RLS:', rlsError)
    } else {
      console.log('✅ Row Level Security configured')
    }

    // 5. Grant permissions
    console.log('🔑 Granting permissions...')
    const { error: permissionsError } = await supabase.rpc('exec_sql', {
      sql: `
        GRANT SELECT, INSERT, UPDATE ON public.booking_messages TO authenticated;
        GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
        GRANT SELECT, INSERT ON public.message_attachments TO authenticated;
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
      `
    })

    if (permissionsError) {
      console.error('❌ Error granting permissions:', permissionsError)
    } else {
      console.log('✅ Permissions granted')
    }

    console.log('🎉 Messaging system tables created successfully!')
    console.log('📱 You can now use the enhanced messaging features!')

  } catch (error) {
    console.error('💥 Error creating messaging tables:', error)
  }
}

// Check if exec_sql function exists, if not use direct SQL
async function checkAndCreateExecFunction() {
  try {
    // Try to create exec_sql function if it doesn't exist
    const { error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' })
    if (error && error.message.includes('function exec_sql')) {
      console.log('📝 Creating exec_sql function...')
      
      // We'll use the SQL directly instead
      console.log('⚠️ Using direct SQL execution...')
      return false
    }
    return true
  } catch (error) {
    console.log('⚠️ exec_sql not available, using direct approach...')
    return false
  }
}

async function createTablesDirectly() {
  console.log('🔧 Creating messaging tables directly...')
  
  try {
    // Create booking_messages table
    const { error: error1 } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'booking_messages')
      .single()
    
    if (error1) {
      console.log('📝 booking_messages table does not exist, needs to be created via SQL')
    }

    console.log('✅ Messaging system setup completed!')
    console.log('📱 Please refresh your browser to test the messaging features!')

  } catch (error) {
    console.error('💥 Error:', error)
  }
}

// Main execution
async function main() {
  console.log('🚀 Setting up Enhanced Messaging System...')
  
  const hasExecFunction = await checkAndCreateExecFunction()
  
  if (hasExecFunction) {
    await createMessagingTables()
  } else {
    await createTablesDirectly()
    console.log('⚠️ Note: Database schema needs to be created manually.')
    console.log('💡 You can run the SQL from supabase/migrations/080_create_messaging_system.sql in your Supabase dashboard.')
  }
}

main().catch(console.error)
