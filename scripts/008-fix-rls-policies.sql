-- ATLAS v2.0 - RLS and Storage Policies Fix
-- Fix: "new row violates row-level security policy" errors
-- Run this IMMEDIATELY after scripts 001-007

-- 1. DROP RESTRICTIVE STORAGE POLICIES AND REPLACE
DROP POLICY IF EXISTS "Admins can manage captures" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to captures" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own captures" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage previews" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view previews" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage assets" ON storage.objects;
DROP POLICY IF EXISTS "Licensed users can download assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage contracts" ON storage.objects;
DROP POLICY IF EXISTS "Contract parties can view" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their avatar" ON storage.objects;

-- 2. CREATE NEW PERMISSIVE STORAGE POLICIES

-- CAPTURES bucket policies
CREATE POLICY "captures_admin_all" ON storage.objects FOR ALL
  USING (bucket_id = 'captures' AND (SELECT get_user_role(auth.uid())) = 'admin');

CREATE POLICY "captures_authenticated_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'captures' AND auth.uid() IS NOT NULL);

CREATE POLICY "captures_authenticated_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'captures' AND auth.uid() IS NOT NULL);

CREATE POLICY "captures_authenticated_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'captures' AND auth.uid() IS NOT NULL);

-- PREVIEWS bucket policies
CREATE POLICY "previews_admin_all" ON storage.objects FOR ALL
  USING (bucket_id = 'previews' AND (SELECT get_user_role(auth.uid())) = 'admin');

CREATE POLICY "previews_authenticated_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'previews' AND auth.uid() IS NOT NULL);

CREATE POLICY "previews_authenticated_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'previews' AND auth.uid() IS NOT NULL);

-- ASSETS bucket policies
CREATE POLICY "assets_admin_all" ON storage.objects FOR ALL
  USING (bucket_id = 'assets' AND (SELECT get_user_role(auth.uid())) = 'admin');

CREATE POLICY "assets_authenticated_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "assets_authenticated_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assets' AND auth.uid() IS NOT NULL);

-- CONTRACTS bucket policies
CREATE POLICY "contracts_admin_all" ON storage.objects FOR ALL
  USING (bucket_id = 'contracts' AND (SELECT get_user_role(auth.uid())) = 'admin');

CREATE POLICY "contracts_authenticated_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'contracts' AND auth.uid() IS NOT NULL);

CREATE POLICY "contracts_authenticated_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'contracts' AND auth.uid() IS NOT NULL);

-- AVATARS bucket policies (public)
CREATE POLICY "avatars_public_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_authenticated_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "avatars_authenticated_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- 3. FIX audit_logs RLS POLICIES - Allow inserts
DROP POLICY IF EXISTS "audit_logs_admin_all" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_user_own" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_model_own" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_admin_all_read" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_user_own_read" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_model_own_read" ON audit_logs;

-- Recreate audit_logs policies with INSERT allowed
CREATE POLICY "audit_logs_insert_system" ON audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "audit_logs_admin_select" ON audit_logs FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "audit_logs_user_own_select" ON audit_logs FOR SELECT
  USING (actor_id = auth.uid());

CREATE POLICY "audit_logs_model_own_select" ON audit_logs FOR SELECT
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- 4. ENSURE profiles TABLE INSERT DURING AUTH WORKS
DROP POLICY IF EXISTS "Allow insert during signup" ON profiles;

CREATE POLICY "profiles_insert_auth" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
  USING (get_user_role(auth.uid()) = 'admin');

-- 5. FIX models TABLE POLICIES - Allow model role to see own + admin override
DROP POLICY IF EXISTS "Admins can do everything on models" ON models;
DROP POLICY IF EXISTS "Models can view own record" ON models;
DROP POLICY IF EXISTS "Models can update own record" ON models;
DROP POLICY IF EXISTS "Brands can view active models" ON models;

CREATE POLICY "models_admin_all" ON models FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "models_user_own_select" ON models FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "models_user_own_update" ON models FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "models_brand_view_active" ON models FOR SELECT
  USING (get_user_role(auth.uid()) = 'brand' AND status = 'active');

-- 6. FIX forges TABLE POLICIES
DROP POLICY IF EXISTS "Admins can do everything on forges" ON forges;
DROP POLICY IF EXISTS "Models can view own forges" ON forges;

CREATE POLICY "forges_admin_all" ON forges FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "forges_user_own_select" ON forges FOR SELECT
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
  );

CREATE POLICY "forges_user_own_update" ON forges FOR UPDATE
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
  );

CREATE POLICY "forges_user_own_insert" ON forges FOR INSERT
  WITH CHECK (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
  );

-- 7. FIX captures TABLE POLICIES
DROP POLICY IF EXISTS "Admins can do everything on captures" ON captures;
DROP POLICY IF EXISTS "Models can view own captures" ON captures;

CREATE POLICY "captures_admin_all" ON captures FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "captures_user_own_select" ON captures FOR SELECT
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
  );

CREATE POLICY "captures_user_own_insert" ON captures FOR INSERT
  WITH CHECK (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
  );

CREATE POLICY "captures_user_own_update" ON captures FOR UPDATE
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
  );

-- 8. FIX previews TABLE POLICIES
DROP POLICY IF EXISTS "Admins can do everything on previews" ON previews;
DROP POLICY IF EXISTS "Users can view previews for their digital twins" ON previews;
DROP POLICY IF EXISTS "Brands can view approved previews" ON previews;

CREATE POLICY "previews_admin_all" ON previews FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "previews_user_own_select" ON previews FOR SELECT
  USING (
    digital_twin_id IN (
      SELECT digital_twin_id FROM forges WHERE model_id IN (
        SELECT id FROM models WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "previews_brand_approved_select" ON previews FOR SELECT
  USING (get_user_role(auth.uid()) = 'brand' AND approved = true);

CREATE POLICY "previews_user_own_insert" ON previews FOR INSERT
  WITH CHECK (
    digital_twin_id IN (
      SELECT digital_twin_id FROM forges WHERE model_id IN (
        SELECT id FROM models WHERE user_id = auth.uid()
      )
    )
  );

-- 9. FIX licenses TABLE POLICIES
DROP POLICY IF EXISTS "Admins can do everything on licenses" ON licenses;
DROP POLICY IF EXISTS "Clients can view their licenses" ON licenses;
DROP POLICY IF EXISTS "Models can view licenses for their digital twins" ON licenses;

CREATE POLICY "licenses_admin_all" ON licenses FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "licenses_client_own_select" ON licenses FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "licenses_model_own_select" ON licenses FOR SELECT
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
  );

-- 10. FIX contracts TABLE POLICIES
DROP POLICY IF EXISTS "Admins can do everything on contracts" ON contracts;
DROP POLICY IF EXISTS "Brands can view their contracts" ON contracts;
DROP POLICY IF EXISTS "Models can view their contracts" ON contracts;
DROP POLICY IF EXISTS "Parties can sign contracts" ON contracts;

CREATE POLICY "contracts_admin_all" ON contracts FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "contracts_brand_select" ON contracts FOR SELECT
  USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
  );

CREATE POLICY "contracts_model_select" ON contracts FOR SELECT
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
  );

CREATE POLICY "contracts_brand_update" ON contracts FOR UPDATE
  USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
  );

CREATE POLICY "contracts_model_update" ON contracts FOR UPDATE
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
  );

-- 11. FIX visual_assets TABLE POLICIES
DROP POLICY IF EXISTS "Admins can do everything on visual_assets" ON visual_assets;
DROP POLICY IF EXISTS "Licensed clients can view assets" ON visual_assets;
DROP POLICY IF EXISTS "Models can view their own assets" ON visual_assets;

CREATE POLICY "visual_assets_admin_all" ON visual_assets FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "visual_assets_client_select" ON visual_assets FOR SELECT
  USING (
    license_id IN (
      SELECT id FROM licenses WHERE client_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "visual_assets_model_select" ON visual_assets FOR SELECT
  USING (
    digital_twin_id IN (
      SELECT digital_twin_id FROM forges WHERE model_id IN (
        SELECT id FROM models WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "visual_assets_model_insert" ON visual_assets FOR INSERT
  WITH CHECK (
    digital_twin_id IN (
      SELECT digital_twin_id FROM forges WHERE model_id IN (
        SELECT id FROM models WHERE user_id = auth.uid()
      )
    )
  );

-- 12. FINAL COMMIT
COMMIT;

-- 008-fix-rls-policies.sql
-- Corrige políticas RLS para ambiente de desenvolvimento
-- Exemplo: Permitir acesso amplo para testes
-- Adicione comandos ALTER POLICY ou CREATE POLICY conforme necessário

-- Exemplos de comandos para permitir acesso amplo
-- ALTER POLICY "captures_admin_all" ON storage.objects
--   USING (true);

-- ALTER POLICY "captures_authenticated_upload" ON storage.objects
--   WITH CHECK (true);

-- ALTER POLICY "captures_authenticated_select" ON storage.objects
--   USING (true);

-- ALTER POLICY "captures_authenticated_update" ON storage.objects
--   USING (true);

-- Repita para outras políticas conforme necessário para testes em dev
