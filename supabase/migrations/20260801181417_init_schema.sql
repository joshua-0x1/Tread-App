-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    background_info TEXT,
    writing_style_rules TEXT,
    preferred_tone TEXT,
    author_persona TEXT,
    target_audience TEXT,
    -- Pocket parameters
    personality_traits TEXT,
    likes_dislikes TEXT,
    values TEXT,
    lifestyle TEXT,
    dreams TEXT,
    outlook_on_life TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)
);

-- Create social_accounts table
CREATE TABLE IF NOT EXISTS public.social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL DEFAULT 'threads',
    account_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
    platform TEXT NOT NULL DEFAULT 'threads',
    topic TEXT,
    core_message TEXT,
    reference_posts TEXT,
    generated_content TEXT,
    platform_post_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    analytics_synced BOOLEAN DEFAULT FALSE,
    -- Loop status variables
    structure_cloned BOOLEAN DEFAULT FALSE,
    marked_for_restart BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create post_analytics table
CREATE TABLE IF NOT EXISTS public.post_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    likes_count INT DEFAULT 0,
    replies_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    reposts_count INT DEFAULT 0,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their social accounts" ON public.social_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their social accounts" ON public.social_accounts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their posts" ON public.posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their posts" ON public.posts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view analytics for their posts" ON public.post_analytics FOR SELECT USING (EXISTS (SELECT 1 FROM public.posts WHERE public.posts.id = public.post_analytics.post_id AND public.posts.user_id = auth.uid()));
CREATE POLICY "Users can manage analytics for their posts" ON public.post_analytics FOR ALL USING (EXISTS (SELECT 1 FROM public.posts WHERE public.posts.id = public.post_analytics.post_id AND public.posts.user_id = auth.uid()));

-- Trigger to auto-create user_profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
