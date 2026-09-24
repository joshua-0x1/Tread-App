-- Re-add structured persona fields (dropped/never applied on live DB) so the AI
-- extraction step in savePersonaProfile has columns to write the parsed
-- personality/likes/values/lifestyle/dreams/outlook categories into.
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS personality_traits TEXT,
    ADD COLUMN IF NOT EXISTS likes_dislikes TEXT,
    ADD COLUMN IF NOT EXISTS values TEXT,
    ADD COLUMN IF NOT EXISTS lifestyle TEXT,
    ADD COLUMN IF NOT EXISTS dreams TEXT,
    ADD COLUMN IF NOT EXISTS outlook_on_life TEXT;
