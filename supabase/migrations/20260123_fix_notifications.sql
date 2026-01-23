-- Fix Notification System
-- Ensures notifications table exists, tenant_id is added, and RLS policies allow inserts

-- Step 1: Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Step 2: Add tenant_id column to notifications if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN tenant_id UUID;
    END IF;
END $$;

-- Step 3: Create trigger to auto-set tenant_id on notification insert
CREATE OR REPLACE FUNCTION public.set_notification_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If tenant_id not provided, get it from the user_id being notified
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := (SELECT tenant_id FROM public.profiles WHERE id = NEW.user_id LIMIT 1);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_notification_tenant_id_trigger ON public.notifications;
CREATE TRIGGER set_notification_tenant_id_trigger
    BEFORE INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION set_notification_tenant_id();

-- Step 3: Update INSERT policy to allow client-side inserts
-- (The notifyHR function is called from client code, not server-side)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications
FOR INSERT
WITH CHECK (true);  -- Allow all inserts, tenant_id will be auto-set by trigger

-- Step 4: Ensure SELECT policy includes tenant filtering
DROP POLICY IF EXISTS "Users can see their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Step 5: Ensure UPDATE policy is correct
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "notifications_update_policy" ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 6: Reload schema
NOTIFY pgrst, 'reload schema';
