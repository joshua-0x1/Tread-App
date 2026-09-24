-- Add username column to social_accounts table
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS username TEXT;
