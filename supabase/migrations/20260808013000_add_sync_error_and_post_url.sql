-- Surface per-post analytics sync failures and link back to the live Threads post
ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS sync_error TEXT,
    ADD COLUMN IF NOT EXISTS platform_post_url TEXT;
