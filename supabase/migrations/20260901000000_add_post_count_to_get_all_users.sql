DROP FUNCTION IF EXISTS public.get_all_users();

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
  created_at TIMESTAMP WITH TIME ZONE,
  invitation_code TEXT,
  post_count BIGINT
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
    p.created_at,
    ic.code as invitation_code,
    COALESCE(pc.post_count, 0) as post_count
  FROM public.user_profiles p
  JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN public.social_accounts s ON p.user_id = s.user_id AND s.platform = 'threads'
  LEFT JOIN public.invitation_code_redemptions r ON r.user_id = p.user_id
  LEFT JOIN public.invitation_codes ic ON ic.id = r.invitation_code_id
  LEFT JOIN (
    SELECT posts.user_id, COUNT(*) as post_count
    FROM public.posts
    GROUP BY posts.user_id
  ) pc ON pc.user_id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
