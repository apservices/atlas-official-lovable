-- ATLAS Digital Identity Platform - Storage Buckets
-- Version 1.0.0

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('captures', 'captures', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('previews', 'previews', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('assets', 'assets', false, 104857600, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('contracts', 'contracts', false, 10485760, ARRAY['application/pdf']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Storage policies for captures bucket
CREATE POLICY "Admins can manage captures" ON storage.objects FOR ALL 
  USING (bucket_id = 'captures' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can upload to captures" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'captures' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own captures" ON storage.objects FOR SELECT
  USING (bucket_id = 'captures' AND auth.uid() IS NOT NULL);

-- Storage policies for previews bucket
CREATE POLICY "Admins can manage previews" ON storage.objects FOR ALL 
  USING (bucket_id = 'previews' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Authenticated users can view previews" ON storage.objects FOR SELECT
  USING (bucket_id = 'previews' AND auth.uid() IS NOT NULL);

-- Storage policies for assets bucket
CREATE POLICY "Admins can manage assets" ON storage.objects FOR ALL 
  USING (bucket_id = 'assets' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Licensed users can download assets" ON storage.objects FOR SELECT
  USING (bucket_id = 'assets' AND auth.uid() IS NOT NULL);

-- Storage policies for contracts bucket
CREATE POLICY "Admins can manage contracts" ON storage.objects FOR ALL 
  USING (bucket_id = 'contracts' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Contract parties can view" ON storage.objects FOR SELECT
  USING (bucket_id = 'contracts' AND auth.uid() IS NOT NULL);

-- Storage policies for avatars bucket (public)
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their avatar" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
