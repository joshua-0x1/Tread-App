-- Invitation codes: gate signups behind an admin-managed code
CREATE TABLE IF NOT EXISTS public.invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  max_uses INTEGER NOT NULL DEFAULT 1,
  uses_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invitation_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_code_id UUID NOT NULL REFERENCES public.invitation_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_code_redemptions ENABLE ROW LEVEL SECURITY;

-- No direct table policies: all access goes through SECURITY DEFINER RPCs below.

-- Admin-only: list all invitation codes
CREATE OR REPLACE FUNCTION public.get_invitation_codes()
RETURNS TABLE (
  id UUID,
  code TEXT,
  max_uses INTEGER,
  uses_count INTEGER,
  is_active BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT c.id, c.code, c.max_uses, c.uses_count, c.is_active, c.expires_at, c.note, c.created_at
  FROM public.invitation_codes c
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin-only: create a new invitation code
CREATE OR REPLACE FUNCTION public.create_invitation_code(
  p_code TEXT,
  p_max_uses INTEGER DEFAULT 1,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RAISE EXCEPTION 'Invitation code cannot be empty';
  END IF;

  IF p_max_uses IS NULL OR p_max_uses < 1 THEN
    RAISE EXCEPTION 'max_uses must be at least 1';
  END IF;

  INSERT INTO public.invitation_codes (code, max_uses, expires_at, note, created_by)
  VALUES (upper(trim(p_code)), p_max_uses, p_expires_at, p_note, auth.uid())
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin-only: activate/deactivate a code
CREATE OR REPLACE FUNCTION public.set_invitation_code_active(p_id UUID, p_is_active BOOLEAN)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  UPDATE public.invitation_codes SET is_active = p_is_active WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin-only: delete a code
CREATE OR REPLACE FUNCTION public.delete_invitation_code(p_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  DELETE FROM public.invitation_codes WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public: atomically reserve a slot on a valid code, called before signUp.
-- Locks the row so concurrent signups can't both consume the last slot.
CREATE OR REPLACE FUNCTION public.reserve_invitation_code(p_code TEXT)
RETURNS UUID AS $$
DECLARE
  target public.invitation_codes%ROWTYPE;
BEGIN
  SELECT * INTO target
  FROM public.invitation_codes
  WHERE code = upper(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invitation code';
  END IF;

  IF NOT target.is_active THEN
    RAISE EXCEPTION 'This invitation code is no longer active';
  END IF;

  IF target.expires_at IS NOT NULL AND target.expires_at < now() THEN
    RAISE EXCEPTION 'This invitation code has expired';
  END IF;

  IF target.uses_count >= target.max_uses THEN
    RAISE EXCEPTION 'This invitation code has already been used';
  END IF;

  UPDATE public.invitation_codes
  SET uses_count = uses_count + 1
  WHERE id = target.id;

  RETURN target.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public: release a previously reserved slot (called if the subsequent signUp fails)
CREATE OR REPLACE FUNCTION public.release_invitation_code(p_invitation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.invitation_codes
  SET uses_count = GREATEST(uses_count - 1, 0)
  WHERE id = p_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public: record which user redeemed a reserved code (called after signUp succeeds)
CREATE OR REPLACE FUNCTION public.finalize_invitation_redemption(p_invitation_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.invitation_code_redemptions (invitation_code_id, user_id)
  VALUES (p_invitation_id, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
