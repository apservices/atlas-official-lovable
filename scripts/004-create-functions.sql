-- ATLAS Digital Identity Platform - Database Functions
-- Version 1.0.0

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'viewer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate digital twin ID
CREATE OR REPLACE FUNCTION generate_digital_twin_id(model_internal_id TEXT)
RETURNS TEXT AS $$
DECLARE
  random_part TEXT;
BEGIN
  random_part := upper(substr(md5(random()::text), 1, 4));
  RETURN 'DTW-' || EXTRACT(YEAR FROM NOW()) || '-' || model_internal_id || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create contract when license is created
CREATE OR REPLACE FUNCTION create_contract_for_license()
RETURNS TRIGGER AS $$
DECLARE
  brand_name_val TEXT;
  brand_id_val UUID;
BEGIN
  -- Get brand info from client
  SELECT b.id, b.name INTO brand_id_val, brand_name_val
  FROM brands b
  WHERE b.user_id = NEW.client_id
  LIMIT 1;
  
  -- Use client name if no brand found
  IF brand_name_val IS NULL THEN
    SELECT full_name INTO brand_name_val
    FROM profiles
    WHERE id = NEW.client_id;
  END IF;
  
  -- Create contract
  INSERT INTO contracts (license_id, model_id, brand_id, brand_name, status)
  VALUES (NEW.id, NEW.model_id, brand_id_val, COALESCE(brand_name_val, 'Unknown'), 'pending');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating contracts
DROP TRIGGER IF EXISTS create_contract_on_license ON licenses;
CREATE TRIGGER create_contract_on_license
  AFTER INSERT ON licenses
  FOR EACH ROW EXECUTE FUNCTION create_contract_for_license();

-- Function to check license validity before download
CREATE OR REPLACE FUNCTION check_license_validity(license_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  license_record licenses%ROWTYPE;
BEGIN
  SELECT * INTO license_record FROM licenses WHERE id = license_id_param;
  
  IF license_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF license_record.status != 'active' THEN
    RETURN FALSE;
  END IF;
  
  IF license_record.valid_until < NOW() THEN
    -- Auto-expire the license
    UPDATE licenses SET status = 'expired' WHERE id = license_id_param;
    RETURN FALSE;
  END IF;
  
  IF license_record.max_downloads IS NOT NULL AND 
     license_record.current_downloads >= license_record.max_downloads THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record download and increment counter
CREATE OR REPLACE FUNCTION record_asset_download(
  asset_id_param UUID,
  license_id_param UUID,
  user_id_param UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check license validity
  IF NOT check_license_validity(license_id_param) THEN
    RETURN FALSE;
  END IF;
  
  -- Increment download counter
  UPDATE licenses 
  SET current_downloads = current_downloads + 1
  WHERE id = license_id_param;
  
  -- Log the download
  INSERT INTO audit_logs (actor_id, actor_name, action, target_table, target_id, metadata)
  SELECT 
    user_id_param,
    p.full_name,
    'ASSET_DOWNLOADED',
    'visual_assets',
    asset_id_param,
    jsonb_build_object('license_id', license_id_param)
  FROM profiles p WHERE p.id = user_id_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire previews and licenses
CREATE OR REPLACE FUNCTION expire_outdated_items()
RETURNS void AS $$
BEGIN
  -- Expire previews
  UPDATE previews 
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < NOW();
  
  -- Expire licenses
  UPDATE licenses 
  SET status = 'expired'
  WHERE status = 'active' AND valid_until < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate integrity hash for audit logs
CREATE OR REPLACE FUNCTION generate_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
  prev_hash TEXT;
  data_string TEXT;
BEGIN
  -- Get previous log hash
  SELECT integrity_hash INTO prev_hash
  FROM audit_logs
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Create data string
  data_string := NEW.actor_id || ':' || NEW.action || ':' || COALESCE(NEW.target_id::TEXT, '') || ':' || NEW.created_at;
  
  -- Generate hash
  NEW.integrity_hash := encode(sha256((COALESCE(prev_hash, '') || ':' || data_string)::bytea), 'hex');
  NEW.previous_log_hash := prev_hash;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for audit log integrity
DROP TRIGGER IF EXISTS audit_log_integrity ON audit_logs;
CREATE TRIGGER audit_log_integrity
  BEFORE INSERT ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION generate_audit_hash();

-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE captures;
ALTER PUBLICATION supabase_realtime ADD TABLE previews;
ALTER PUBLICATION supabase_realtime ADD TABLE licenses;
ALTER PUBLICATION supabase_realtime ADD TABLE contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE forges;
