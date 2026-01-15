-- ATLAS Digital Identity Platform - Database Schema
-- Version 1.0.0

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'model', 'brand', 'viewer');
CREATE TYPE model_status AS ENUM ('pending', 'active', 'archived');
CREATE TYPE capture_status AS ENUM ('pending', 'validated', 'rejected');
CREATE TYPE license_status AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE contract_status AS ENUM ('draft', 'pending', 'signed', 'rejected');
CREATE TYPE preview_status AS ENUM ('active', 'expired', 'deleted');
CREATE TYPE vtg_job_status AS ENUM ('queued', 'processing', 'done', 'failed');

-- Profiles table (extends auth.users with RBAC)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Models table (core entity)
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  country TEXT,
  status model_status NOT NULL DEFAULT 'pending',
  plan_type TEXT NOT NULL DEFAULT 'BASIC',
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  consent_date TIMESTAMPTZ,
  internal_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id)
);

-- Forges table (digital twin creation pipeline)
CREATE TABLE forges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'CREATED',
  version INTEGER NOT NULL DEFAULT 1,
  digital_twin_id TEXT UNIQUE,
  seed_hash TEXT,
  capture_progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  certified_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  blockchain_tx_hash TEXT,
  blockchain_timestamp TIMESTAMPTZ
);

-- Captures table (uploaded assets)
CREATE TABLE captures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  forge_id UUID NOT NULL REFERENCES forges(id) ON DELETE CASCADE,
  digital_twin_id TEXT,
  asset_url TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'PHOTO',
  angle TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  resolution_width INTEGER NOT NULL,
  resolution_height INTEGER NOT NULL,
  stage TEXT NOT NULL DEFAULT 'CAPTURE',
  status capture_status NOT NULL DEFAULT 'pending',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Previews table (watermarked preview images)
CREATE TABLE previews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  capture_id UUID REFERENCES captures(id) ON DELETE SET NULL,
  digital_twin_id TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  preview_type TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  watermarked BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  status preview_status NOT NULL DEFAULT 'active'
);

-- Brands table
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Licenses table
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  digital_twin_id TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES profiles(id),
  usage_type TEXT NOT NULL,
  territory TEXT[] NOT NULL DEFAULT ARRAY['WORLDWIDE'],
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  status license_status NOT NULL DEFAULT 'active',
  max_downloads INTEGER,
  current_downloads INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT
);

-- Contracts table (auto-created with licenses)
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  brand_name TEXT NOT NULL,
  contract_url TEXT,
  signed BOOLEAN NOT NULL DEFAULT FALSE,
  signed_at TIMESTAMPTZ,
  status contract_status NOT NULL DEFAULT 'draft',
  hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Brand-Model relationships
CREATE TABLE brand_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'shortlisted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(brand_id, model_id)
);

-- Visual Assets table
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

-- VTG Jobs table
CREATE TABLE vtg_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  digital_twin_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  category TEXT NOT NULL,
  preset_id TEXT,
  status vtg_job_status NOT NULL DEFAULT 'queued',
  priority INTEGER NOT NULL DEFAULT 1,
  result JSONB,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Certificates table
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forge_id UUID NOT NULL REFERENCES forges(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  digital_twin_id TEXT NOT NULL UNIQUE,
  model_name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  verification_code TEXT NOT NULL UNIQUE,
  public_key TEXT,
  signature TEXT,
  plan_type TEXT NOT NULL,
  forge_version INTEGER NOT NULL DEFAULT 1
);

-- Audit Logs table (immutable)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  forge_id UUID,
  model_id UUID,
  digital_twin_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  integrity_hash TEXT,
  previous_log_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Financial transactions table
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_models_user_id ON models(user_id);
CREATE INDEX idx_models_status ON models(status);
CREATE INDEX idx_forges_model_id ON forges(model_id);
CREATE INDEX idx_forges_state ON forges(state);
CREATE INDEX idx_forges_digital_twin_id ON forges(digital_twin_id);
CREATE INDEX idx_captures_forge_id ON captures(forge_id);
CREATE INDEX idx_captures_model_id ON captures(model_id);
CREATE INDEX idx_captures_digital_twin_id ON captures(digital_twin_id);
CREATE INDEX idx_previews_digital_twin_id ON previews(digital_twin_id);
CREATE INDEX idx_licenses_model_id ON licenses(model_id);
CREATE INDEX idx_licenses_client_id ON licenses(client_id);
CREATE INDEX idx_licenses_digital_twin_id ON licenses(digital_twin_id);
CREATE INDEX idx_contracts_license_id ON contracts(license_id);
CREATE INDEX idx_visual_assets_digital_twin_id ON visual_assets(digital_twin_id);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_forges_updated_at BEFORE UPDATE ON forges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brand_models_updated_at BEFORE UPDATE ON brand_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
