REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) FROM PUBLIC;