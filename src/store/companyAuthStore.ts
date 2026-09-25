import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { AuthUser, AnalystUser } from "@/types/auth";

function storageKeyFor(slug: string) {
  const safe = slug.trim().toLowerCase() || "company";
  return `alx-auth-session-${safe}`;
}

export function makeCompanyAuthStores(slug: string, companyId: string) {
  const STORE_KEY = storageKeyFor(slug);

  function readSession(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AuthUser;
      if (parsed?.companyId !== companyId) return null;
      if (parsed?.role === "operacional" || parsed?.role === "entregador") {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  function writeSession(session: AuthUser | null) {
    if (typeof window === "undefined") return;
    if (session) {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORE_KEY);
    }
  }

  type CompanyAuthStore = {
    user: AuthUser | null;
    loginError: string | null;
    loginOperacional: (analystName: string, password: string) => Promise<boolean>;
    loginEntregador: (cpf: string) => boolean;
    logout: () => void;
  };

  const useCompanyAuthStore = create<CompanyAuthStore>((set) => ({
    user: readSession(),
    loginError: null,

    loginOperacional: async (analystName, password) => {
      const cleanName = analystName.trim();
      const cleanPass = password.trim();

      if (!cleanName || !cleanPass) {
        set({ loginError: "Informe usuario e senha." });
        return false;
      }

      if (!supabase) {
        set({ loginError: "Supabase nao configurado." });
        return false;
      }

      const { data, error } = await supabase
        .from("company_users")
        .select("id, name, initials, password_hash, is_active")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .ilike("name", cleanName)
        .limit(1);

      if (error || !data || data.length === 0) {
        set({ loginError: "Usuario ou senha invalidos." });
        return false;
      }

      const row = data[0] as {
        id: string;
        name: string;
        initials: string;
        password_hash: string;
        is_active: boolean;
      };

      let matches = false;
      try {
        const { data: cryptData, error: cryptErr } = await supabase.rpc("crypt", {
          key: cleanPass,
          value: row.password_hash,
        } as never);
        if (!cryptErr) {
          matches = String(cryptData ?? "") === String(row.password_hash);
        }
      } catch {
        matches = false;
      }

      if (!matches) {
        set({ loginError: "Usuario ou senha invalidos." });
        return false;
      }

      const user: AuthUser = {
        role: "operacional",
        identifier: row.id,
        companyId,
        companySlug: slug,
        analystId: row.id,
        analystName: row.name,
        analystInitials: row.initials,
        displayName: row.name,
      };
      writeSession(user);
      set({ user, loginError: null });
      return true;
    },

    loginEntregador: (cpf) => {
      const digits = cpf.replace(/\D+/g, "").slice(0, 11);
      if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
        set({ loginError: "Informe um CPF valido para entrar." });
        return false;
      }
      const user: AuthUser = {
        role: "entregador",
        identifier: digits,
        companyId,
        companySlug: slug,
      };
      writeSession(user);
      set({ user, loginError: null });
      return true;
    },

    logout: () => {
      writeSession(null);
      set({ user: null, loginError: null });
    },
  }));

  function roleMatchesCompany(
    user: AuthUser | null,
    allowed: AnalystUser["role"] | AnalystUser["role"][] | "operacional" | "entregador" | Array<"operacional" | "entregador">,
  ): boolean {
    if (!user) return false;
    const list = Array.isArray(allowed) ? allowed : [allowed];
    return list.includes(user.role as "operacional" | "entregador");
  }

  return { useCompanyAuthStore, roleMatchesCompany, STORE_KEY };
}
