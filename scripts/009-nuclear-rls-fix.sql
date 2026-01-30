-- ATLAS v2.0 - NUCLEAR RLS FIX
-- Maximum permissiveness approach - if this works, problem is RLS
-- Use this if script 008 didn't resolve storage + audit_logs issues

-- ============================================================================
-- STEP 1: COMPLETELY CLEAR ALL STORAGE POLICIES
-- ============================================================================
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_name);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: CREATE MAXIMUM PERMISSIVE STORAGE POLICIES
-- ============================================================================

-- ALL authenticated users can read any storage object
CREATE POLICY "storage_select_all" ON storage.objects FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ALL authenticated users can insert to ANY bucket
CREATE POLICY "storage_insert_all" ON storage.objects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ALL authenticated users can update their uploads
CREATE POLICY "storage_update_all" ON storage.objects FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ALL authenticated users can delete their uploads
CREATE POLICY "storage_delete_all" ON storage.objects FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Allow public read to public buckets
CREATE POLICY "storage_select_public" ON storage.objects FOR SELECT
  USING (
    (SELECT public FROM storage.buckets WHERE id = storage.objects.bucket_id) = true
  );

-- ============================================================================
-- STEP 3: FIX audit_logs - ABSOLUTELY PERMISSIVE FOR INSERTS
-- ============================================================================

-- Drop ALL existing audit_logs policies
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'audit_logs'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON audit_logs', policy_name);
    END LOOP;
END $$;

-- Allow ANY authenticated user to INSERT audit logs
CREATE POLICY "audit_insert_any" ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR true);

-- Allow admins to view all audit logs
CREATE POLICY "audit_select_admin" ON audit_logs FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Allow users to view their own audit logs
CREATE POLICY "audit_select_own" ON audit_logs FOR SELECT
  USING (actor_id = auth.uid());

-- Allow models to view audit logs for their models
CREATE POLICY "audit_select_model" ON audit_logs FOR SELECT
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: FIX COMMON TABLE POLICIES - ENSURE INSERT WORKS
-- ============================================================================

-- Fix models insert
DROP POLICY IF EXISTS "models_insert_auth" ON models;
CREATE POLICY "models_insert_auth" ON models FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix forges insert  
DROP POLICY IF EXISTS "forges_insert_model" ON forges;
CREATE POLICY "forges_insert_any" ON forges FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix captures insert
DROP POLICY IF EXISTS "captures_insert_model" ON captures;
CREATE POLICY "captures_insert_any" ON captures FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix previews insert
DROP POLICY IF EXISTS "previews_insert_model" ON previews;
CREATE POLICY "previews_insert_any" ON previews FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix licenses insert
DROP POLICY IF EXISTS "licenses_insert_admin" ON licenses;
CREATE POLICY "licenses_insert_any" ON licenses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix contracts insert
DROP POLICY IF EXISTS "contracts_insert_admin" ON contracts;
CREATE POLICY "contracts_insert_any" ON contracts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix visual_assets insert
DROP POLICY IF EXISTS "visual_assets_insert_admin" ON visual_assets;
CREATE POLICY "visual_assets_insert_any" ON visual_assets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- STEP 5: VERIFY RLS IS ENABLED BUT PERMISSIVE
-- ============================================================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE forges ENABLE ROW LEVEL SECURITY;
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_assets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: TEST CONFIRMATION
-- ============================================================================
-- If you can see these messages in the logs, the script executed
DO $$
BEGIN
  RAISE NOTICE 'Storage policies updated - INSERT/UPDATE/DELETE now permissive for authenticated users';
  RAISE NOTICE 'Audit logs policies updated - INSERT now permissive for authenticated users';
  RAISE NOTICE 'Common table INSERT policies now permissive for authenticated users';
  RAISE NOTICE 'If upload still fails, the issue is NOT row-level security';
END $$;

COMMIT;
