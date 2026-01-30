-- ATLAS Digital Identity Platform - Demo Data Seed
-- Version 1.0.0
-- NOTE: Run this AFTER creating a test admin user via Supabase Auth

-- This script should be run manually after creating users via Auth
-- The UUIDs below should be replaced with actual user IDs from auth.users

-- Example: After creating admin@atlas.io via Auth UI, get their UUID and update this script

-- Insert demo profiles (these should match auth.users IDs after signup)
-- INSERT INTO profiles (id, email, full_name, role) VALUES
--   ('YOUR-ADMIN-UUID', 'admin@atlas.io', 'System Admin', 'admin'),
--   ('YOUR-MODEL-UUID', 'model@atlas.io', 'John Mitchell', 'model'),
--   ('YOUR-BRAND-UUID', 'brand@atlas.io', 'Fashion Brand Co', 'brand');

-- For initial testing, you can create profiles via the Auth signup flow
-- The handle_new_user trigger will automatically create profile records

-- 005-seed-demo-data.sql (opcional)
-- Popula dados de exemplo para testes
-- Execute apenas em ambiente de desenvolvimento
-- Exemplo:
INSERT INTO profiles (id, email, full_name, role) VALUES (uuid_generate_v4(), 'admin@test.com', 'Admin', 'admin');
INSERT INTO brands (id, name) VALUES (uuid_generate_v4(), 'Demo Brand');
INSERT INTO models (id, full_name, email, status) VALUES (uuid_generate_v4(), 'Demo Model', 'model@test.com', 'active');
