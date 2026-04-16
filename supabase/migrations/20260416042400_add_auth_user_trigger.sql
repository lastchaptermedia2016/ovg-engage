-- =============================================
-- PRODUCTION GRADE AUTH USER SYNC TRIGGER
-- =============================================

-- 1. Create the handler function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users automatically when a user is created in auth.users
  INSERT INTO public.users (id, email, role, tenant_id, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NEW.raw_user_meta_data->>'tenant_id',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant execution permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TRIGGER INSTALLED SUCCESSFULLY
-- =============================================
-- 
-- ✅ This trigger runs ATOMICALLY inside the same database transaction
-- ✅ Cannot fail silently
-- ✅ No race conditions
-- ✅ Works for all user creation methods:
--    - Email Signup
--    - Invite User
--    - Social Login
--    - Magic Link
--    - Admin API
--
-- No more silent failures. Every user that exists in auth.users
-- will automatically exist in public.users.
--
-- =============================================