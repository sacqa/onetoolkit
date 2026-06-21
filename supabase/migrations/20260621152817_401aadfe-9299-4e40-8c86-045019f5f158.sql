
-- Admin can read all profiles + roles for user management UI
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all user roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Secure RPC: change a user's role (admin-only)
CREATE OR REPLACE FUNCTION public.set_user_role(_target_user uuid, _new_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  IF _target_user = auth.uid() AND _new_role <> 'admin' THEN
    -- Prevent the last admin from demoting themselves into a no-admin state
    IF (SELECT count(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'cannot demote the last remaining admin';
    END IF;
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _target_user;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user, _new_role);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO authenticated;

-- Bootstrap: promote the calling user to admin if there are zero admins
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'must be signed in';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN false;
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _uid;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin');
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;

-- Seed default app_settings rows
INSERT INTO public.app_settings (key, value) VALUES
  ('limits', '{"daily_upscale_limit": 5, "max_file_mb": 20, "file_ttl_minutes": 60}'::jsonb),
  ('adsense', '{"enabled": false, "publisher_id": "", "slot_header": "", "slot_in_content": "", "slot_sidebar": "", "slot_footer": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;
