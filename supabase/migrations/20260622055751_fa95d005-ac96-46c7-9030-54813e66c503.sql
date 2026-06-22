
-- 1) Lock down user_roles writes: only service_role (via SECURITY DEFINER) may modify.
CREATE POLICY "No client writes to user_roles INSERT"
  ON public.user_roles FOR INSERT TO anon, authenticated
  WITH CHECK (false);
CREATE POLICY "No client writes to user_roles UPDATE"
  ON public.user_roles FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);
CREATE POLICY "No client writes to user_roles DELETE"
  ON public.user_roles FOR DELETE TO anon, authenticated
  USING (false);

-- 2) Tighten tool_usage: anon may only insert NULL user_id rows; authenticated must match auth.uid().
DROP POLICY IF EXISTS "Insert own usage" ON public.tool_usage;
CREATE POLICY "Anon insert anonymous usage"
  ON public.tool_usage FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);
CREATE POLICY "Authenticated insert own usage"
  ON public.tool_usage FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3) Lock down privileged SECURITY DEFINER functions from direct client EXECUTE.
REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
