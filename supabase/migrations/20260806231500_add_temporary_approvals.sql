-- Drop the old get_all_users to allow changing its return signature
DROP FUNCTION IF EXISTS public.get_all_users();

-- Add approved_until column
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS approved_until TIMESTAMP WITH TIME ZONE NULL;

-- Update is_approved check to support expiration
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_approved = true
      AND (user_profiles.approved_until IS NULL OR user_profiles.approved_until > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create get_all_users with new signature
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  profile_id UUID,
  user_id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT,
  is_approved BOOLEAN,
  approved_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as profile_id,
    p.user_id,
    u.email::TEXT,
    COALESCE(s.display_name, u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)) as display_name,
    COALESCE(s.avatar_url, u.raw_user_meta_data->>'avatar_url') as avatar_url,
    p.role,
    p.is_approved,
    p.approved_until,
    p.created_at
  FROM public.user_profiles p
  JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN public.social_accounts s ON p.user_id = s.user_id AND s.platform = 'threads'
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
