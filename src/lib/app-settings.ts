import { supabase } from "@/integrations/supabase/client";

export type LimitsSettings = {
  daily_upscale_limit: number;
  max_file_mb: number;
  file_ttl_minutes: number;
};

export type AdSenseSettings = {
  enabled: boolean;
  publisher_id: string;
  slot_header: string;
  slot_in_content: string;
  slot_sidebar: string;
  slot_footer: string;
};

export const DEFAULT_LIMITS: LimitsSettings = {
  daily_upscale_limit: 5,
  max_file_mb: 20,
  file_ttl_minutes: 60,
};

export const DEFAULT_ADSENSE: AdSenseSettings = {
  enabled: false,
  publisher_id: "",
  slot_header: "",
  slot_in_content: "",
  slot_sidebar: "",
  slot_footer: "",
};

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
  return ((data?.value as T) ?? fallback);
}

export async function setSetting(key: string, value: unknown) {
  return supabase.from("app_settings").upsert({ key, value: value as never, updated_at: new Date().toISOString() });
}
