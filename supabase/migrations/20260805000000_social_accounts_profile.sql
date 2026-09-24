-- Add display_name and avatar_url to social_accounts
ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Enforce one Threads account per app user
ALTER TABLE public.social_accounts
  DROP CONSTRAINT IF EXISTS social_accounts_user_platform_unique;
ALTER TABLE public.social_accounts
  ADD CONSTRAINT social_accounts_user_platform_unique UNIQUE (user_id, platform);

-- Enforce a single user per Threads account_id to prevent same Threads account linking to multiple users
ALTER TABLE public.social_accounts
  DROP CONSTRAINT IF EXISTS social_accounts_platform_account_id_unique;
ALTER TABLE public.social_accounts
  ADD CONSTRAINT social_accounts_platform_account_id_unique UNIQUE (platform, account_id);
