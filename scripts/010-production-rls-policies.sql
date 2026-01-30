-- 010-production-rls-policies.sql
-- Políticas RLS seguras para produção
-- Inclui RBAC por função, owner, brand, admin
-- Adicione CREATE POLICY e DROP POLICY conforme necessário
-- Exemplo:
-- DROP POLICY IF EXISTS select_all ON models;
-- CREATE POLICY select_own ON models FOR SELECT USING (user_id = auth.uid());
-- ...
-- Adapte conforme sua lógica de negócio e tabelas

-- ATLAS v2.0 - PRODUCTION-READY RLS POLICIES
-- Secure role-based access control for all tables
-- Requires get_user_role() function and proper user profiles

-- ============================================================================
-- HELPER: Ensure user role function exists
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text AS $$
  SELECT role::text FROM profiles WHERE id = user_id
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- MODELS TABLE - Role-based Access
-- ============================================================================

-- Admin can see all models
DROP POLICY IF EXISTS "models_select_admin" ON models;
CREATE POLICY "models_select_admin" ON models FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Models can see only their own profile
DROP POLICY IF EXISTS "models_select_self" ON models;
CREATE POLICY "models_select_self" ON models FOR SELECT
  USING (user_id = auth.uid() AND get_user_role(auth.uid()) = 'model');

-- Brands can see linked models
DROP POLICY IF EXISTS "models_select_brand" ON models;
CREATE POLICY "models_select_brand" ON models FOR SELECT
  USING (
    id IN (
      SELECT model_id FROM brand_models 
      WHERE brand_id IN (
        SELECT id FROM brands WHERE user_id = auth.uid()
      )
    ) AND get_user_role(auth.uid()) = 'brand'
  );

-- Models can insert their own profile
DROP POLICY IF EXISTS "models_insert_self" ON models;
CREATE POLICY "models_insert_self" ON models FOR INSERT
  WITH CHECK (user_id = auth.uid() AND get_user_role(auth.uid()) = 'model');

-- Models can update their own profile
DROP POLICY IF EXISTS "models_update_self" ON models;
CREATE POLICY "models_update_self" ON models FOR UPDATE
  USING (user_id = auth.uid() AND get_user_role(auth.uid()) = 'model')
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- CAPTURES TABLE - Model ownership + Admin
-- ============================================================================

-- Admin can see all captures
DROP POLICY IF EXISTS "captures_select_admin" ON captures;
CREATE POLICY "captures_select_admin" ON captures FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Models can see their own captures
DROP POLICY IF EXISTS "captures_select_model" ON captures;
CREATE POLICY "captures_select_model" ON captures FOR SELECT
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    AND get_user_role(auth.uid()) = 'model'
  );

-- Brands can see captures from linked models
DROP POLICY IF EXISTS "captures_select_brand" ON captures;
CREATE POLICY "captures_select_brand" ON captures FOR SELECT
  USING (
    model_id IN (
      SELECT model_id FROM brand_models 
      WHERE brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
    )
    AND get_user_role(auth.uid()) = 'brand'
  );

-- Models can insert captures for their models
DROP POLICY IF EXISTS "captures_insert_model" ON captures;
CREATE POLICY "captures_insert_model" ON captures FOR INSERT
  WITH CHECK (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    AND get_user_role(auth.uid()) = 'model'
  );

-- ============================================================================
-- PREVIEWS TABLE - Digital Twin ownership
-- ============================================================================

-- Admin can see all previews
DROP POLICY IF EXISTS "previews_select_admin" ON previews;
CREATE POLICY "previews_select_admin" ON previews FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Models can see previews for their digital twins
DROP POLICY IF EXISTS "previews_select_model" ON previews;
CREATE POLICY "previews_select_model" ON previews FOR SELECT
  USING (
    digital_twin_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    AND get_user_role(auth.uid()) = 'model'
  );

-- Brands can see previews from linked models
DROP POLICY IF EXISTS "previews_select_brand" ON previews;
CREATE POLICY "previews_select_brand" ON previews FOR SELECT
  USING (
    digital_twin_id IN (
      SELECT model_id FROM brand_models 
      WHERE brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
    )
    AND get_user_role(auth.uid()) = 'brand'
  );

-- Models can insert previews for their digital twins
DROP POLICY IF EXISTS "previews_insert_model" ON previews;
CREATE POLICY "previews_insert_model" ON previews FOR INSERT
  WITH CHECK (
    digital_twin_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    AND get_user_role(auth.uid()) = 'model'
  );

-- ============================================================================
-- LICENSES TABLE - Model + Brand access
-- ============================================================================

-- Admin can see all licenses
DROP POLICY IF EXISTS "licenses_select_admin" ON licenses;
CREATE POLICY "licenses_select_admin" ON licenses FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Models can see licenses for their models
DROP POLICY IF EXISTS "licenses_select_model" ON licenses;
CREATE POLICY "licenses_select_model" ON licenses FOR SELECT
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    AND get_user_role(auth.uid()) = 'model'
  );

-- Brands can see their own licenses
DROP POLICY IF EXISTS "licenses_select_brand" ON licenses;
CREATE POLICY "licenses_select_brand" ON licenses FOR SELECT
  USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
    AND get_user_role(auth.uid()) = 'brand'
  );

-- Brands can create licenses for linked models
DROP POLICY IF EXISTS "licenses_insert_brand" ON licenses;
CREATE POLICY "licenses_insert_brand" ON licenses FOR INSERT
  WITH CHECK (
    model_id IN (
      SELECT model_id FROM brand_models 
      WHERE brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
    )
    AND brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
    AND get_user_role(auth.uid()) = 'brand'
  );

-- ============================================================================
-- CONTRACTS TABLE - Model + Brand access
-- ============================================================================

-- Admin can see all contracts
DROP POLICY IF EXISTS "contracts_select_admin" ON contracts;
CREATE POLICY "contracts_select_admin" ON contracts FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Models can see contracts for their models
DROP POLICY IF EXISTS "contracts_select_model" ON contracts;
CREATE POLICY "contracts_select_model" ON contracts FOR SELECT
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    AND get_user_role(auth.uid()) = 'model'
  );

-- Brands can see their own contracts
DROP POLICY IF EXISTS "contracts_select_brand" ON contracts;
CREATE POLICY "contracts_select_brand" ON contracts FOR SELECT
  USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
    AND get_user_role(auth.uid()) = 'brand'
  );

-- Models can sign contracts
DROP POLICY IF EXISTS "contracts_update_model" ON contracts;
CREATE POLICY "contracts_update_model" ON contracts FOR UPDATE
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    AND get_user_role(auth.uid()) = 'model'
  )
  WITH CHECK (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
  );

-- ============================================================================
-- AUDIT LOGS TABLE - Insert + Role-based reads
-- ============================================================================

-- Anyone authenticated can insert audit logs
DROP POLICY IF EXISTS "audit_logs_insert_auth" ON audit_logs;
CREATE POLICY "audit_logs_insert_auth" ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admin can see all audit logs
DROP POLICY IF EXISTS "audit_logs_select_admin" ON audit_logs;
CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Users can see audit logs for their own actions
DROP POLICY IF EXISTS "audit_logs_select_own" ON audit_logs;
CREATE POLICY "audit_logs_select_own" ON audit_logs FOR SELECT
  USING (actor_id = auth.uid());

-- Models can see audit logs for their models
DROP POLICY IF EXISTS "audit_logs_select_model" ON audit_logs;
CREATE POLICY "audit_logs_select_model" ON audit_logs FOR SELECT
  USING (
    model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    AND get_user_role(auth.uid()) = 'model'
  );

-- ============================================================================
-- STORAGE BUCKETS - Role-based access
-- ============================================================================

-- Anyone authenticated can read from public buckets
DROP POLICY IF EXISTS "storage_select_public" ON storage.objects;
CREATE POLICY "storage_select_public" ON storage.objects FOR SELECT
  USING (
    (SELECT public FROM storage.buckets WHERE id = storage.objects.bucket_id) = true
  );

-- Models can upload to their own buckets (captures, previews, assets)
DROP POLICY IF EXISTS "storage_insert_model" ON storage.objects;
CREATE POLICY "storage_insert_model" ON storage.objects FOR INSERT
  WITH CHECK (
    (
      bucket_id = 'captures' OR 
      bucket_id = 'previews' OR 
      bucket_id = 'assets'
    )
    AND auth.uid() IS NOT NULL
    AND get_user_role(auth.uid()) = 'model'
  );

-- Models can read their own uploads
DROP POLICY IF EXISTS "storage_select_own" ON storage.objects;
CREATE POLICY "storage_select_own" ON storage.objects FOR SELECT
  USING (
    owner_id = auth.uid() AND auth.uid() IS NOT NULL
  );

-- Brands can read assets from linked models
DROP POLICY IF EXISTS "storage_select_brand" ON storage.objects;
CREATE POLICY "storage_select_brand" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assets' AND auth.uid() IS NOT NULL AND
    get_user_role(auth.uid()) = 'brand'
  );

-- Admins can manage all storage
DROP POLICY IF EXISTS "storage_admin_all" ON storage.objects;
CREATE POLICY "storage_admin_all" ON storage.objects FOR ALL
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- ============================================================================
-- VISUAL_ASSETS TABLE - Licensed access
-- ============================================================================

-- Admin can see all assets
DROP POLICY IF EXISTS "visual_assets_select_admin" ON visual_assets;
CREATE POLICY "visual_assets_select_admin" ON visual_assets FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Models can see their own assets
DROP POLICY IF EXISTS "visual_assets_select_model" ON visual_assets;
CREATE POLICY "visual_assets_select_model" ON visual_assets FOR SELECT
  USING (
    digital_twin_id IN (SELECT id FROM models WHERE user_id = auth.uid())
    AND get_user_role(auth.uid()) = 'model'
  );

-- Brands can see licensed assets from linked models
DROP POLICY IF EXISTS "visual_assets_select_brand" ON visual_assets;
CREATE POLICY "visual_assets_select_brand" ON visual_assets FOR SELECT
  USING (
    license_status = 'active' AND
    digital_twin_id IN (
      SELECT model_id FROM brand_models 
      WHERE brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
    )
    AND get_user_role(auth.uid()) = 'brand'
  );

-- ============================================================================
-- BRANDS TABLE - Brand ownership
-- ============================================================================

-- Admin can see all brands
DROP POLICY IF EXISTS "brands_select_admin" ON brands;
CREATE POLICY "brands_select_admin" ON brands FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Brands can see only their own profile
DROP POLICY IF EXISTS "brands_select_self" ON brands;
CREATE POLICY "brands_select_self" ON brands FOR SELECT
  USING (user_id = auth.uid() AND get_user_role(auth.uid()) = 'brand');

-- Brands can insert their own profile
DROP POLICY IF EXISTS "brands_insert_self" ON brands;
CREATE POLICY "brands_insert_self" ON brands FOR INSERT
  WITH CHECK (user_id = auth.uid() AND get_user_role(auth.uid()) = 'brand');

-- Brands can update their own profile
DROP POLICY IF EXISTS "brands_update_self" ON brands;
CREATE POLICY "brands_update_self" ON brands FOR UPDATE
  USING (user_id = auth.uid() AND get_user_role(auth.uid()) = 'brand')
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PROFILES TABLE - Self-read, Admin full access
-- ============================================================================

-- Anyone can read their own profile
DROP POLICY IF EXISTS "profiles_select_self" ON profiles;
CREATE POLICY "profiles_select_self" ON profiles FOR SELECT
  USING (id = auth.uid());

-- Admin can see all profiles
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
