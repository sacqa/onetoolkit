
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

DROP POLICY "Anyone can insert usage" ON public.tool_usage;
CREATE POLICY "Insert own usage" ON public.tool_usage FOR INSERT TO authenticated, anon
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
