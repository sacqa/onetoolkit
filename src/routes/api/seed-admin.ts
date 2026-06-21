import { createFileRoute } from "@tanstack/react-router";

const ADMIN_EMAIL = "4sac.qa@gmail.com";
const ADMIN_PASSWORD = "Console@6221";

export const Route = createFileRoute("/api/seed-admin")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Find or create the auth user
        let userId: string | null = null;
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list?.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
        if (existing) {
          userId = existing.id;
          // Make sure password matches what was requested
          await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password: ADMIN_PASSWORD,
            email_confirm: true,
          });
        } else {
          const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: "Admin" },
          });
          if (error) return Response.json({ ok: false, step: "createUser", error: error.message }, { status: 500 });
          userId = created.user?.id ?? null;
        }
        if (!userId) return Response.json({ ok: false, error: "no user id" }, { status: 500 });

        // 2. Ensure profile row
        await supabaseAdmin.from("profiles").upsert(
          { id: userId, email: ADMIN_EMAIL, full_name: "Admin" },
          { onConflict: "id" },
        );

        // 3. Reset roles → admin only
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        if (roleErr) return Response.json({ ok: false, step: "role", error: roleErr.message }, { status: 500 });

        return Response.json({ ok: true, userId, email: ADMIN_EMAIL });
      },
    },
  },
});
