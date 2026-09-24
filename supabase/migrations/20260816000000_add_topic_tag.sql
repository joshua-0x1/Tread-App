-- Threads' native "Community or Topic" tag set on a post at publish time.
-- Distinct from the existing `topic` column, which is the AI content-generation subject.
ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS topic_tag TEXT;
