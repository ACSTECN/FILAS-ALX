import { createClient } from "@supabase/supabase-js";
import type { QueueFormValues, QueueRecord } from "@/types/queue";

function cleanEnvValue(value?: string) {
  return value?.trim().replace(/^["'`]+|["'`]+$/g, "");
}

const supabaseUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL)?.replace(/\/+$/, "");
const supabaseAnonKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

const isValidSupabaseUrl = Boolean(
  supabaseUrl &&
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl),
);

export const hasSupabaseConfig = Boolean(isValidSupabaseUrl && supabaseAnonKey);
export const canUseLocalFallback =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const supabase = hasSupabaseConfig
  ? createClient<{
      public: {
        Tables: {
          fila_registros: {
            Row: QueueRecord;
            Insert: QueueFormValues;
          };
        };
      };
    }>(supabaseUrl, supabaseAnonKey)
  : null;
