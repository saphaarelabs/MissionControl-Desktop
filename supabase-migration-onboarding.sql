-- Migration: Add onboarding fields to user_profiles table
-- Date: 2026-03-11
-- Description: Add full_name, phone_number, and onboarding_data columns to support new onboarding flow

-- Add new columns for onboarding data
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_data JSONB;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.full_name IS 'User full name collected during onboarding';
COMMENT ON COLUMN user_profiles.phone_number IS 'User phone number collected during onboarding';
COMMENT ON COLUMN user_profiles.onboarding_data IS 'Complete onboarding data including LLM config, channels, etc.';
