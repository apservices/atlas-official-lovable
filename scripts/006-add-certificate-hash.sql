-- Add certificate_hash column to models table if not exists
ALTER TABLE models
ADD COLUMN IF NOT EXISTS certificate_hash TEXT UNIQUE;

-- Create function to generate certificate hash
CREATE OR REPLACE FUNCTION generate_certificate_hash(
  model_id UUID
)
RETURNS TEXT AS $$
DECLARE
  hash_input TEXT;
  captures_count INT;
  previews_count INT;
  licenses_count INT;
  hash_result TEXT;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO captures_count FROM captures WHERE model_id = $1;
  SELECT COUNT(*) INTO previews_count FROM previews WHERE digital_twin_id = (SELECT id FROM models WHERE id = $1 LIMIT 1);
  SELECT COUNT(*) INTO licenses_count FROM licenses WHERE model_id = $1;
  
  -- Create input string for hashing
  hash_input := CONCAT(
    model_id::TEXT,
    '-',
    captures_count::TEXT,
    '-',
    previews_count::TEXT,
    '-',
    licenses_count::TEXT,
    '-',
    NOW()::TEXT
  );
  
  -- Generate SHA256 hash
  hash_result := encode(digest(hash_input, 'sha256'), 'hex');
  
  RETURN hash_result;
END;
$$ LANGUAGE plpgsql;

-- Create index for certificate_hash lookups
CREATE INDEX IF NOT EXISTS idx_models_certificate_hash ON models(certificate_hash);
