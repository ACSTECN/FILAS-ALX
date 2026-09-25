import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Company, CompanyUser } from "@/types/company";
import type { AnalystUser } from "@/types/auth";
import type { Hotzone } from "@/types/queue";
import { createCompanyQueueStore } from "@/store/companyQueueStore";
import { makeCompanyAuthStores } from "@/store/companyAuthStore";

export function useCompanyScoped(slug: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [users, setUsers] = useState<CompanyUser[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      if (!supabase) {
        setLoading(false);
        setError("Supabase nao configurado neste deploy.");
        return;
      }
      if (!slug) {
        setLoading(false);
        setError("Slug da empresa nao informado.");
        return;
      }

      const { data: compData, error: compErr } = await supabase
        .from("companies")
        .select("*")
        .eq("slug", slug.trim().toLowerCase())
        .limit(1);

      if (compErr || !compData || compData.length === 0) {
        if (!cancelled) {
          setError("Empresa nao encontrada ou inativa.");
          setLoading(false);
        }
        return;
      }

      const comp = compData[0] as Company;
      if (!comp.is_active) {
        if (!cancelled) {
          setError("Esta empresa esta inativa no momento.");
          setLoading(false);
        }
        return;
      }
      if (comp.allowed_hotzones && !Array.isArray(comp.allowed_hotzones)) {
        comp.allowed_hotzones = [] as Hotzone[];
      }

      const { data: usersData, error: usersErr } = await supabase
        .from("company_users")
        .select("id, company_id, name, initials, is_active, created_at")
        .eq("company_id", comp.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (!cancelled) {
        setCompany(comp);
        setUsers((!usersErr && (usersData as CompanyUser[])) || []);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const analystUsers: AnalystUser[] = useMemo(() => {
    return users.map((u) => ({
      id: u.id,
      role: "operacional" as const,
      name: u.name,
      initials: u.initials,
      password: "",
    }));
  }, [users]);

  const stores = useMemo(() => {
    if (!company) return null;
    const auth = makeCompanyAuthStores(company.slug, company.id);
    const queue = createCompanyQueueStore(company.id, company.slug);
    return { auth, queue };
  }, [company]);

  return {
    loading,
    error,
    company,
    users,
    analystUsers,
    stores,
  };
}
