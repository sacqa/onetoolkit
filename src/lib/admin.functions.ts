import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleInput = z.object({
  id: z.string().uuid(),
  role: z.enum(["admin", "user"]),
});

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => roleInput.parse(data))
  .handler(async ({ context, data }) => {
    const { data: adminRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      throw new Error("Admin role required");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.id === context.userId && data.role !== "admin") {
      const { count, error: countError } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if (countError) throw countError;
      if ((count ?? 0) <= 1) {
        throw new Error("Cannot remove the last admin");
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.id);

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.id, role: data.role });

    if (insertError) throw insertError;

    return { ok: true };
  });