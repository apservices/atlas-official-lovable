-- ATLAS Digital Identity Platform - Row Level Security Policies
-- Version 1.0.0

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE forges ENABLE ROW LEVEL SECURITY;
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vtg_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_transacoes ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Allow insert during signup" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- MODELS policies
CREATE POLICY "Admins can do everything on models" ON models FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Models can view own record" ON models FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Models can update own record" ON models FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Brands can view active models" ON models FOR SELECT USING (
  get_user_role(auth.uid()) = 'brand' AND status = 'active'
);

-- FORGES policies
CREATE POLICY "Admins can do everything on forges" ON forges FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Models can view own forges" ON forges FOR SELECT USING (
  model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
);

-- CAPTURES policies
CREATE POLICY "Admins can do everything on captures" ON captures FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Models can view own captures" ON captures FOR SELECT USING (
  model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
);

-- PREVIEWS policies
CREATE POLICY "Admins can do everything on previews" ON previews FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users can view previews for their digital twins" ON previews FOR SELECT USING (
  digital_twin_id IN (
    SELECT digital_twin_id FROM forges WHERE model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "Brands can view approved previews" ON previews FOR SELECT USING (
  get_user_role(auth.uid()) = 'brand' AND approved = true
);

-- BRANDS policies
CREATE POLICY "Brands can view and update own brand" ON brands FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins can do everything on brands" ON brands FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Anyone can view brands" ON brands FOR SELECT USING (true);

-- LICENSES policies
CREATE POLICY "Admins can do everything on licenses" ON licenses FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Clients can view their licenses" ON licenses FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Models can view licenses for their digital twins" ON licenses FOR SELECT USING (
  model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
);

-- CONTRACTS policies
CREATE POLICY "Admins can do everything on contracts" ON contracts FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Brands can view their contracts" ON contracts FOR SELECT USING (
  brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
);
CREATE POLICY "Models can view their contracts" ON contracts FOR SELECT USING (
  model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
);
CREATE POLICY "Parties can sign contracts" ON contracts FOR UPDATE USING (
  brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()) OR
  model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
);

-- BRAND_MODELS policies
CREATE POLICY "Admins can do everything on brand_models" ON brand_models FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Brands can manage their model relationships" ON brand_models FOR ALL USING (
  brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
);

-- VISUAL_ASSETS policies
CREATE POLICY "Admins can do everything on visual_assets" ON visual_assets FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Licensed clients can view assets" ON visual_assets FOR SELECT USING (
  license_id IN (SELECT id FROM licenses WHERE client_id = auth.uid() AND status = 'active')
);
CREATE POLICY "Models can view their own assets" ON visual_assets FOR SELECT USING (
  digital_twin_id IN (
    SELECT digital_twin_id FROM forges WHERE model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  )
);

-- VTG_JOBS policies
CREATE POLICY "Admins can do everything on vtg_jobs" ON vtg_jobs FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users can view their own jobs" ON vtg_jobs FOR SELECT USING (created_by = auth.uid());

-- CERTIFICATES policies
CREATE POLICY "Anyone can view certificates" ON certificates FOR SELECT USING (true);
CREATE POLICY "Admins can manage certificates" ON certificates FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- AUDIT_LOGS policies (read-only for most, write for system)
CREATE POLICY "Admins can view all audit logs" ON audit_logs FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users can view their own audit logs" ON audit_logs FOR SELECT USING (actor_id = auth.uid());
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- FINANCEIRO_TRANSACOES policies
CREATE POLICY "Admins can do everything on transactions" ON financeiro_transacoes FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Brands can view their transactions" ON financeiro_transacoes FOR SELECT USING (
  brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
);
CREATE POLICY "Models can view their transactions" ON financeiro_transacoes FOR SELECT USING (
  model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
);
