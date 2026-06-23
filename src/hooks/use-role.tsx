import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const ADMIN_EMAILS = new Set(["noonnashpati@gmail.com", "lightlabprints@gmail.com"]);

export function isAllowedAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.has(email.toLowerCase());
}

export function useIsAdmin() {
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !loading && !!user,
    queryFn: async () => {
      if (!user) return false;
      if (!isAllowedAdminEmail(user.email)) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });
}
