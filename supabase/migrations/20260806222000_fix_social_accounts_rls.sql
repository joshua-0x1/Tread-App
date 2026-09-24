-- Re-adjust public.social_accounts RLS policies to allow registration callback actions for unapproved users
DROP POLICY IF EXISTS "Approved users can manage their social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Approved users can view their social accounts" ON public.social_accounts;

CREATE POLICY "Users or admins can view social accounts" 
ON public.social_accounts FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users or admins can manage social accounts" 
ON public.social_accounts FOR ALL 
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());
