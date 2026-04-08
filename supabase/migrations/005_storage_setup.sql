-- ============================================
-- OVG Engage - Storage Bucket Setup (Simplified)
-- ============================================

-- Create storage bucket for tenant logos and header images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- HELPER FUNCTION TO GENERATE ASSET URL
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_asset_url(asset_path TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'https://' || current_setting('app.settings.storage_project_ref') || '.supabase.co/storage/v1/object/public/tenant-assets/' || asset_path;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STORAGE POLICIES - MANUAL SETUP REQUIRED
-- ============================================

-- IMPORTANT: Storage policies cannot be created through migrations.
-- They must be created manually in the Supabase Dashboard.
--
-- After running this migration, go to:
-- Supabase Dashboard → Storage → Policies → New Policy
--
-- Create these 5 policies for the 'tenant-assets' bucket:
--
-- 1. "Resellers can upload assets for their tenants" (INSERT)
-- 2. "Resellers can view their own assets" (SELECT)
-- 3. "Resellers can update their own assets" (UPDATE)
-- 4. "Resellers can delete their own assets" (DELETE)
-- 5. "Public read access to tenant assets" (SELECT)
--
-- SQL for each policy is provided in SETUP_GUIDE.md

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE storage.objects IS 'Storage objects for tenant assets (logos, header images, etc.)';
COMMENT ON COLUMN storage.objects.bucket_id IS 'Bucket identifier (tenant-assets)';
COMMENT ON COLUMN storage.objects.name IS 'File path within the bucket';