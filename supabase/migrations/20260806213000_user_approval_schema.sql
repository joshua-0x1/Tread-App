-- Alter public.user_profiles to add role and is_approved columns
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE;

-- Create helper function to check if a user is an approved admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if a user is approved
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for public.user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

CREATE POLICY "Users can view their own profile or admins can view all" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile or admins can update all" 
ON public.user_profiles FOR UPDATE 
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Update RLS policies for public.social_accounts
DROP POLICY IF EXISTS "Users can view their social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Users can manage their social accounts" ON public.social_accounts;

CREATE POLICY "Approved users can view their social accounts" 
ON public.social_accounts FOR SELECT 
USING (auth.uid() = user_id AND public.is_approved());

CREATE POLICY "Approved users can manage their social accounts" 
ON public.social_accounts FOR ALL 
USING (auth.uid() = user_id AND public.is_approved());

-- Update RLS policies for public.posts
DROP POLICY IF EXISTS "Users can view their posts" ON public.posts;
DROP POLICY IF EXISTS "Users can manage their posts" ON public.posts;

CREATE POLICY "Approved users can view their posts" 
ON public.posts FOR SELECT 
USING (auth.uid() = user_id AND public.is_approved());

CREATE POLICY "Approved users can manage their posts" 
ON public.posts FOR ALL 
USING (auth.uid() = user_id AND public.is_approved());

-- Update RLS policies for public.post_analytics
DROP POLICY IF EXISTS "Users can view analytics for their posts" ON public.post_analytics;
DROP POLICY IF EXISTS "Users can manage analytics for their posts" ON public.post_analytics;

CREATE POLICY "Approved users can view analytics for their posts" 
ON public.post_analytics FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.posts WHERE public.posts.id = public.post_analytics.post_id AND public.posts.user_id = auth.uid() AND public.is_approved()));

CREATE POLICY "Approved users can manage analytics for their posts" 
ON public.post_analytics FOR ALL 
USING (EXISTS (SELECT 1 FROM public.posts WHERE public.posts.id = public.post_analytics.post_id AND public.posts.user_id = auth.uid() AND public.is_approved()));

-- Create RPC to securely query all user details (Admin only)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  profile_id UUID,
  user_id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT,
  is_approved BOOLEAN,
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
    p.created_at
  FROM public.user_profiles p
  JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN public.social_accounts s ON p.user_id = s.user_id AND s.platform = 'threads'
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed initial admin profiles based on existing emails
UPDATE public.user_profiles
SET role = 'admin', is_approved = true
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('yoddi.dev@gmail.com', 'rikukodama2@gmail.com', 'yoddi@test.com')
);
