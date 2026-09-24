-- Add scheduling + lifecycle tracking columns to posts
ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS failure_reason TEXT,
    ADD COLUMN IF NOT EXISTS success_email_sent_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS failure_email_sent_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Speeds up the cron worker's "find due scheduled posts" query
CREATE INDEX IF NOT EXISTS idx_posts_due_scheduled ON public.posts (scheduled_at)
    WHERE status = 'scheduled';

-- Atomically claims due scheduled posts so overlapping cron runs can't double-publish
CREATE OR REPLACE FUNCTION public.claim_due_scheduled_posts(batch_size INT DEFAULT 20)
RETURNS SETOF public.posts AS $$
    UPDATE public.posts
    SET status = 'publishing', updated_at = NOW()
    WHERE id IN (
        SELECT id FROM public.posts
        WHERE status = 'scheduled' AND scheduled_at <= NOW()
        ORDER BY scheduled_at ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Only the cron worker (service-role key) should ever claim posts; block PostgREST access entirely.
REVOKE EXECUTE ON FUNCTION public.claim_due_scheduled_posts(INT) FROM PUBLIC, anon, authenticated;
