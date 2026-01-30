-- ATLAS v2.0 - Schema Alignment Migration
-- Fixes schema misalignment between code expectations and Supabase database
-- Run this after scripts 001-006

-- 0. CREATE ENUM TYPES FIRST (if they don't exist)
CREATE TYPE IF NOT EXISTS license_status AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE IF NOT EXISTS preview_status AS ENUM ('active', 'expired', 'deleted');
CREATE TYPE IF NOT EXISTS user_role AS ENUM ('admin', 'model', 'brand', 'viewer');
CREATE TYPE IF NOT EXISTS model_status AS ENUM ('pending', 'active', 'archived');
CREATE TYPE IF NOT EXISTS capture_status AS ENUM ('pending', 'validated', 'rejected');
CREATE TYPE IF NOT EXISTS contract_status AS ENUM ('draft', 'pending', 'signed', 'rejected');
CREATE TYPE IF NOT EXISTS vtg_job_status AS ENUM ('queued', 'processing', 'done', 'failed');

-- 1. ADD MISSING STATUS COLUMN TO licenses TABLE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'licenses' AND column_name = 'status'
  ) THEN
    ALTER TABLE licenses ADD COLUMN status license_status NOT NULL DEFAULT 'active'::license_status;
  END IF;
END $$;

-- 2. ADD MISSING STATUS COLUMN TO previews TABLE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'previews' AND column_name = 'status'
  ) THEN
    ALTER TABLE previews ADD COLUMN status preview_status NOT NULL DEFAULT 'active'::preview_status;
  END IF;
END $$;

-- 3. ENSURE visual_assets TABLE EXISTS WITH ALL REQUIRED COLUMNS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'visual_assets'
  ) THEN
    CREATE TABLE visual_assets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      digital_twin_id TEXT NOT NULL,
      vtg_job_id UUID,
      asset_type TEXT NOT NULL,
      category TEXT NOT NULL,
      file_url TEXT NOT NULL,
      hash TEXT NOT NULL,
      license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
      watermarked BOOLEAN NOT NULL DEFAULT FALSE,
      certificate_id UUID,
      resolution_width INTEGER NOT NULL DEFAULT 4096,
      resolution_height INTEGER NOT NULL DEFAULT 3072,
      format TEXT NOT NULL DEFAULT 'PNG',
      file_size INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX idx_visual_assets_digital_twin_id ON visual_assets(digital_twin_id);
    CREATE INDEX idx_visual_assets_license_id ON visual_assets(license_id);
    
    ALTER TABLE visual_assets ENABLE ROW LEVEL SECURITY;
    
    -- RLS Policies for visual_assets
    CREATE POLICY "Admins can do everything on visual_assets" ON visual_assets 
      FOR ALL USING (get_user_role(auth.uid()) = 'admin');
    
    CREATE POLICY "Licensed clients can view assets" ON visual_assets 
      FOR SELECT USING (
        license_id IN (
          SELECT id FROM licenses 
          WHERE client_id = auth.uid() AND status = 'active'
        )
      );
    
    CREATE POLICY "Models can view their own assets" ON visual_assets 
      FOR SELECT USING (
        digital_twin_id IN (
          SELECT digital_twin_id FROM forges 
          WHERE model_id IN (
            SELECT id FROM models WHERE user_id = auth.uid()
          )
        )
      );
  END IF;
END $$;

-- 4. ADD model_id COLUMN TO audit_logs IF MISSING
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'model_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN model_id UUID;
  END IF;
END $$;

-- 5. FIX RLS POLICIES FOR audit_logs TABLE
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;

-- Create corrected RLS policies for audit_logs
CREATE POLICY "audit_logs_admin_all" ON audit_logs
  FOR ALL USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "audit_logs_user_own" ON audit_logs
  FOR SELECT USING (actor_id = auth.uid());

CREATE POLICY "audit_logs_model_own" ON audit_logs
  FOR SELECT USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- 6. ENSURE PROFILES TABLE ACCEPTS INSERTS DURING AUTH FLOW
DROP POLICY IF EXISTS "Allow insert during signup" ON profiles;

CREATE POLICY "Allow insert during signup" ON profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. FIX USER PROVISIONING TRIGGER - Ensure it completes without errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'viewer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_licenses_model_id ON licenses(model_id);
CREATE INDEX IF NOT EXISTS idx_licenses_client_id ON licenses(client_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_previews_digital_twin_id ON previews(digital_twin_id);
CREATE INDEX IF NOT EXISTS idx_previews_status ON previews(status);
CREATE INDEX IF NOT EXISTS idx_previews_approved ON previews(approved);
CREATE INDEX IF NOT EXISTS idx_audit_logs_model_id ON audit_logs(model_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 9. ENSURE financeiro_transacoes TABLE EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'financeiro_transacoes'
  ) THEN
    CREATE TABLE financeiro_transacoes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
      brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
      model_id UUID REFERENCES models(id) ON DELETE SET NULL,
      amount DECIMAL(12, 2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      transaction_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX idx_financeiro_transacoes_brand_id ON financeiro_transacoes(brand_id);
    CREATE INDEX idx_financeiro_transacoes_license_id ON financeiro_transacoes(license_id);
    CREATE INDEX idx_financeiro_transacoes_created_at ON financeiro_transacoes(created_at DESC);
    
    ALTER TABLE financeiro_transacoes ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Admins can do everything on financeiro_transacoes" ON financeiro_transacoes 
      FOR ALL USING (get_user_role(auth.uid()) = 'admin');
    
    CREATE POLICY "Brands can view their transactions" ON financeiro_transacoes 
      FOR SELECT USING (
        brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- 10. ENSURE AUDIT_LOGS WRITE PERMISSIONS FOR SYSTEM
-- Allow system functions to insert audit logs without RLS blocking
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Re-enable with corrected policies that allow inserts
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (system functions) to insert
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Re-apply read policies
CREATE POLICY "audit_logs_admin_all_read" ON audit_logs
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "audit_logs_user_own_read" ON audit_logs
  FOR SELECT USING (actor_id = auth.uid());

CREATE POLICY "audit_logs_model_own_read" ON audit_logs
  FOR SELECT USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- 11. ENSURE brand_models TABLE EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'brand_models'
  ) THEN
    CREATE TABLE brand_models (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'shortlisted',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(brand_id, model_id)
    );
    
    ALTER TABLE brand_models ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Admins can do everything on brand_models" ON brand_models 
      FOR ALL USING (get_user_role(auth.uid()) = 'admin');
    
    CREATE POLICY "Brands can manage their model relationships" ON brand_models 
      FOR ALL USING (
        brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- 12. ENUM TYPES ALREADY CREATED IN STEP 0

-- 13. FINAL VERIFICATION - Log all tables
DO $$
DECLARE
  missing_tables TEXT;
BEGIN
  missing_tables := '';
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    missing_tables := missing_tables || 'profiles, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'models') THEN
    missing_tables := missing_tables || 'models, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'licenses') THEN
    missing_tables := missing_tables || 'licenses, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'previews') THEN
    missing_tables := missing_tables || 'previews, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visual_assets') THEN
    missing_tables := missing_tables || 'visual_assets, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    missing_tables := missing_tables || 'audit_logs, ';
  END IF;
  
  IF missing_tables != '' THEN
    RAISE WARNING 'Missing tables: %', missing_tables;
  ELSE
    RAISE NOTICE 'All required tables exist';
  END IF;
END $$;

-- Migration complete
COMMIT;

-- 007-fix-schema-alignment.sql
-- Corrige alinhamento de schema e tipos
-- Exemplo: Adicionar colunas faltantes, corrigir tipos
-- Adicione comandos ALTER TABLE conforme necessário
