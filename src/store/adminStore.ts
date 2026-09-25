import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type {
  Company,
  CompanyUpsertValues,
  CompanyUser,
  CompanyUserUpsertValues,
} from "@/types/company";
import type { Hotzone } from "@/types/queue";

type AdminStore = {
  companies: Company[];
  companyUsers: Record<string, CompanyUser[]>;
  loading: boolean;
  creating: boolean;
  error: string | null;
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  loadCompanies: () => Promise<void>;
  createCompany: (values: CompanyUpsertValues) => Promise<Company | null>;
  updateCompany: (id: string, values: Partial<CompanyUpsertValues>) => Promise<boolean>;
  toggleCompanyActive: (id: string) => Promise<boolean>;
  loadCompanyUsers: (companyId: string) => Promise<void>;
  createCompanyUser: (
    companyId: string,
    values: CompanyUserUpsertValues,
  ) => Promise<CompanyUser | null>;
  updateCompanyUser: (
    companyUserId: string,
    values: Partial<CompanyUserUpsertValues>,
  ) => Promise<boolean>;
  toggleCompanyUserActive: (companyUserId: string) => Promise<boolean>;
  getCompanyBySlug: (slug: string) => Promise<Company | null>;
};

const ALX_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export const useAdminStore = create<AdminStore>((set, get) => ({
  companies: [],
  companyUsers: {},
  loading: false,
  creating: false,
  error: null,
  selectedCompanyId: null,
  setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),

  loadCompanies: async () => {
    set({ loading: true, error: null });
    if (!supabase) {
      set({ loading: false, companies: [] });
      return;
    }
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      set({ loading: false, error: "Nao foi possivel carregar empresas." });
      return;
    }
    const normalized = (data as Company[] | null) ?? [];
    normalized.forEach((c) => {
      if (c.allowed_hotzones && !Array.isArray(c.allowed_hotzones)) {
        c.allowed_hotzones = [] as Hotzone[];
      }
    });
    set({ companies: normalized, loading: false });
  },

  createCompany: async (values) => {
    set({ creating: true, error: null });
    if (!supabase) {
      set({ creating: false, error: "Supabase nao configurado." });
      return null;
    }
    if (!values.slug || !values.name) {
      set({ creating: false, error: "Nome e slug sao obrigatorios." });
      return null;
    }
    const slug = values.slug.trim().toLowerCase();
    if (/[^a-z0-9-]/.test(slug)) {
      set({ creating: false, error: "Slug invalido: use apenas letras, numeros e hifen." });
      return null;
    }

    const payload = {
      slug,
      name: values.name.trim(),
      logo_url: values.logo_url ?? null,
      is_active: values.is_active ?? true,
      max_users: values.max_users ?? 5,
      enable_fila: values.enable_fila ?? true,
      enable_ranking: values.enable_ranking ?? true,
      enable_historico: values.enable_historico ?? true,
      enable_entregador_portal: values.enable_entregador_portal ?? true,
      allowed_hotzones: values.allowed_hotzones ?? [],
    };

    const { data, error } = await supabase
      .from("companies")
      .insert(payload as never)
      .select("*")
      .limit(1);

    if (error) {
      const msg =
        error.code === "23505" || /duplicate/i.test(error.message)
          ? "Ja existe uma empresa com esse slug."
          : "Nao foi possivel cadastrar a empresa.";
      set({ creating: false, error: msg });
      return null;
    }

    const created = (data?.[0] ?? null) as Company | null;
    if (created) {
      set({
        companies: [created, ...get().companies],
        creating: false,
        error: null,
      });
    } else {
      set({ creating: false });
    }
    return created;
  },

  updateCompany: async (id, values) => {
    set({ creating: true, error: null });
    if (!supabase) {
      set({ creating: false, error: "Supabase nao configurado." });
      return false;
    }
    const payload: Record<string, unknown> = {};
    if (values.name !== undefined) payload.name = values.name.trim();
    if (values.logo_url !== undefined) payload.logo_url = values.logo_url ?? null;
    if (values.is_active !== undefined) payload.is_active = values.is_active;
    if (values.max_users !== undefined) payload.max_users = values.max_users;
    if (values.enable_fila !== undefined) payload.enable_fila = values.enable_fila;
    if (values.enable_ranking !== undefined) payload.enable_ranking = values.enable_ranking;
    if (values.enable_historico !== undefined) payload.enable_historico = values.enable_historico;
    if (values.enable_entregador_portal !== undefined)
      payload.enable_entregador_portal = values.enable_entregador_portal;
    if (values.allowed_hotzones !== undefined) payload.allowed_hotzones = values.allowed_hotzones;
    if (values.slug !== undefined) {
      const slug = values.slug.trim().toLowerCase();
      if (/[^a-z0-9-]/.test(slug)) {
        set({ creating: false, error: "Slug invalido." });
        return false;
      }
      payload.slug = slug;
    }

    const { error } = await supabase
      .from("companies")
      .update(payload as never)
      .eq("id", id);
    if (error) {
      set({ creating: false, error: "Nao foi possivel atualizar empresa." });
      return false;
    }
    await get().loadCompanies();
    set({ creating: false, error: null });
    return true;
  },

  toggleCompanyActive: async (id) => {
    const current = get().companies.find((c) => c.id === id);
    if (!current) return false;
    return get().updateCompany(id, { is_active: !current.is_active });
  },

  loadCompanyUsers: async (companyId) => {
    set({ loading: true, error: null });
    if (!supabase) {
      set({ loading: false });
      return;
    }
    const { data, error } = await supabase
      .from("company_users")
      .select("id, company_id, name, initials, is_active, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });

    if (error) {
      set({ loading: false, error: "Nao foi possivel carregar usuarios." });
      return;
    }
    set((state) => ({
      companyUsers: { ...state.companyUsers, [companyId]: (data as CompanyUser[]) ?? [] },
      loading: false,
    }));
  },

  createCompanyUser: async (companyId, values) => {
    set({ creating: true, error: null });
    if (!supabase) {
      set({ creating: false, error: "Supabase nao configurado." });
      return null;
    }
    if (!values.name || !values.initials || !values.password) {
      set({ creating: false, error: "Nome, iniciais e senha sao obrigatorios." });
      return null;
    }
    if (companyId !== ALX_COMPANY_ID) {
      const { count, error: countErr } = await supabase
        .from("company_users")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId);
      if (!countErr) {
        const company = get().companies.find((c) => c.id === companyId);
        const maxUsers = company?.max_users ?? 5;
        if ((count ?? 0) >= maxUsers) {
          set({
            creating: false,
            error: `Limite de usuarios atingido (max ${maxUsers}). Aumente o limite da empresa.`,
          });
          return null;
        }
      }
    }

    const { data } = await supabase
      .rpc("crypt_with_salt", { password_text: values.password } as never)
      .maybeSingle();
    const passwordHash =
      (data as { crypt_with_salt: string } | null)?.crypt_with_salt ??
      values.password;

    const payload = {
      company_id: companyId,
      name: values.name.trim(),
      initials: values.initials.trim().toUpperCase().slice(0, 3),
      password_hash: passwordHash,
      is_active: values.is_active ?? true,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("company_users")
      .insert(payload as never)
      .select("id, company_id, name, initials, is_active, created_at")
      .limit(1);

    if (insertErr) {
      set({
        creating: false,
        error: insertErr.code === "23505"
          ? "Ja existe um usuario com esse nome na empresa."
          : "Nao foi possivel criar usuario.",
      });
      return null;
    }
    const created = (inserted?.[0] ?? null) as CompanyUser | null;
    if (created) {
      await get().loadCompanyUsers(companyId);
    }
    set({ creating: false, error: null });
    return created;
  },

  updateCompanyUser: async (companyUserId, values) => {
    set({ creating: true, error: null });
    if (!supabase) {
      set({ creating: false, error: "Supabase nao configurado." });
      return false;
    }
    const payload: Record<string, unknown> = {};
    if (values.name !== undefined) payload.name = values.name.trim();
    if (values.initials !== undefined)
      payload.initials = values.initials.trim().toUpperCase().slice(0, 3);
    if (values.is_active !== undefined) payload.is_active = values.is_active;
    if (values.password) {
      const { data } = await supabase
        .rpc("crypt_with_salt", { password_text: values.password } as never)
        .maybeSingle();
      payload.password_hash =
        (data as { crypt_with_salt: string } | null)?.crypt_with_salt ?? values.password;
    }

    const { error } = await supabase
      .from("company_users")
      .update(payload as never)
      .eq("id", companyUserId);
    if (error) {
      set({ creating: false, error: "Nao foi possivel atualizar usuario." });
      return false;
    }
    // refresh do cache local: encontra company_id e recarrega
    const state = get();
    const entry = Object.entries(state.companyUsers).find(([, list]) =>
      list.some((u) => u.id === companyUserId),
    );
    if (entry) await get().loadCompanyUsers(entry[0]);
    set({ creating: false, error: null });
    return true;
  },

  toggleCompanyUserActive: async (companyUserId) => {
    const state = get();
    const entry = Object.entries(state.companyUsers).find(([, list]) =>
      list.some((u) => u.id === companyUserId),
    );
    const user = entry?.[1].find((u) => u.id === companyUserId);
    if (!user) return false;
    return get().updateCompanyUser(companyUserId, { is_active: !user.is_active });
  },

  getCompanyBySlug: async (slug) => {
    const cleanSlug = slug.trim().toLowerCase();
    const cached = get().companies.find((c) => c.slug === cleanSlug) ?? null;
    if (cached) return cached;
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("slug", cleanSlug)
      .eq("is_active", true)
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return data[0] as Company;
  },
}));
