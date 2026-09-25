import { create } from "zustand";
import type { AuthUser } from "@/types/auth";
import { supabase } from "@/lib/supabase";

const PLATFORM_AUTH_STORAGE_KEY = "alx-platform-admin-session";

const DEFAULT_ADMIN_USERNAME =
  (typeof import.meta !== "undefined" && (import.meta.env.VITE_PLATFORM_ADMIN_USERNAME as string | undefined)) ||
  "admin";

const DEFAULT_ADMIN_PASSWORD =
  (typeof import.meta !== "undefined" && (import.meta.env.VITE_PLATFORM_ADMIN_PASSWORD as string | undefined)) ||
  "admin@alx2026";

function readSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PLATFORM_AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed?.role === "platform_admin") return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeSession(session: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (session) {
    window.localStorage.setItem(PLATFORM_AUTH_STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(PLATFORM_AUTH_STORAGE_KEY);
  }
}

async function verifyPasswordWithHash(password: string, hash: string): Promise<boolean> {
  if (password === hash) return true;
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc("crypt", {
      key: password,
      value: hash,
    } as never);
    if (error) return false;
    return String(data ?? "") === String(hash);
  } catch {
    return false;
  }
}

type PlatformAuthStore = {
  user: AuthUser | null;
  loginError: string | null;
  loginPlatformAdmin: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
};

export const usePlatformAuthStore = create<PlatformAuthStore>((set) => ({
  user: readSession(),
  loginError: null,
  loginPlatformAdmin: async (username, password) => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      set({ loginError: "Informe usuario e senha." });
      return false;
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("platform_admins")
          .select("*")
          .eq("username", cleanUser)
          .eq("is_active", true)
          .limit(1);

        if (!error && data && data.length > 0) {
          const adminRow = data[0] as {
            username: string;
            password_hash: string;
            display_name?: string | null;
          };
          const ok = await verifyPasswordWithHash(cleanPass, adminRow.password_hash);
          if (ok) {
            const user: AuthUser = {
              role: "platform_admin",
              identifier: adminRow.username,
              displayName: adminRow.display_name ?? adminRow.username,
            };
            writeSession(user);
            set({ user, loginError: null });
            return true;
          }
          set({ loginError: "Usuario ou senha invalidos." });
          return false;
        }
      } catch {
        // fallback para credencial environment/default
      }
    }

    const envUser = DEFAULT_ADMIN_USERNAME.trim().toLowerCase();
    const envPass = DEFAULT_ADMIN_PASSWORD.trim();
    if (cleanUser === envUser && cleanPass === envPass) {
      const user: AuthUser = {
        role: "platform_admin",
        identifier: cleanUser,
        displayName: cleanUser,
      };
      writeSession(user);
      set({ user, loginError: null });
      return true;
    }

    set({ loginError: "Usuario ou senha invalidos." });
    return false;
  },
  logout: () => {
    writeSession(null);
    set({ user: null, loginError: null });
  },
}));
