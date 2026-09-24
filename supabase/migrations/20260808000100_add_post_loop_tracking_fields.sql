-- Persist the analytics loop's simulated tracking fields (previously kept only in localStorage)
ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS structure_cloned BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS marked_for_restart BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ai_insight TEXT;
