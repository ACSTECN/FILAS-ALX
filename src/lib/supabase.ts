import { createClient } from "@supabase/supabase-js";
import type { QueueFormValues, QueueRecord } from "@/types/queue";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

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
