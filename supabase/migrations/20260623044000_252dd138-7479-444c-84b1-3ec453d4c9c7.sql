CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND (
        _role <> 'admin'
        OR lower(p.email) IN ('noonnashpati@gmail.com', 'lightlabprints@gmail.com')
      )
  )
$$;

GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM anon;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.has_role(_user_id, _role)
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins read all user roles" ON public.user_roles;
CREATE POLICY "Admins read all user roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins read all usage" ON public.tool_usage;
CREATE POLICY "Admins read all usage" ON public.tool_usage
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins write page content" ON public.page_content;
CREATE POLICY "Admins write page content" ON public.page_content
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins write app settings" ON public.app_settings;
CREATE POLICY "Admins write app settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_user_role(_target_user uuid, _new_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  IF _target_user = auth.uid() AND _new_role <> 'admin' THEN
    IF (SELECT count(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'cannot demote the last remaining admin';
    END IF;
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _target_user;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user, _new_role);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;