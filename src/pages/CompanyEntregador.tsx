import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useCompanyScoped } from "@/hooks/useCompanyScoped";
import { CompanyHotzoneGrid } from "@/components/CompanyHotzoneGrid";
import { CompanyQueueFilters } from "@/components/CompanyQueueFilters";
import { CompanyQueueForm } from "@/components/CompanyQueueForm";
import { hotzonesByCity } from "@/data/hotzones";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import type {
  City,
  Hotzone,
  QueueFilters as QueueFiltersType,
  QueueFormValues,
  QueueRecord,
  Shift,
} from "@/types/queue";
import { formatCPF, isValidCPF, normalizeCPF, type AuthUser } from "@/types/auth";

function statusLabel(status: string) {
  if (status.startsWith("na_fila_")) return "Em interesse";
  if (status.startsWith("atribuido_")) return "Atribuido";
  return "Retirado";
}

function tipoLabel(tipo: string) {
  if (tipo === "ENTREGADOR") return "Entregador";
  if (tipo === "TPR") return "TPR";
  return "Fila";
}

const DEFAULT_FILTERS: QueueFiltersType = {
  cidade: "Todas",
  hotzone: "Todas",
  turno_desejado: "Todos",
  data_fila: "Todas",
  origem: "Todas",
  tipo: "Todas",
};

export default function CompanyEntregador() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    loading: scopedLoading,
    error: companyErr,
    company,
    stores,
  } = useCompanyScoped(slug);

  const originalMetaRef = useRef<{ title: string } | null>(null);
  if (!originalMetaRef.current && typeof document !== "undefined") {
    originalMetaRef.current = { title: document.title };
  }

  const companyLogo = company?.logo_url ?? null;
  const companyDisplayName = company?.display_name?.trim() || company?.name || "";
  const companyPrimaryColor = company?.primary_color?.trim() || null;
  const companyFavicon = company?.favicon_url?.trim() || null;

  useEffect(() => {
    if (!company) return;
    const doc = document;
    const root = doc.documentElement;
    const originalTitle = originalMetaRef.current?.title ?? doc.title;
    doc.title = `${companyDisplayName} | Portal do entregador`;
    if (companyPrimaryColor) { root.style.setProperty("--company-primary", companyPrimaryColor); }
    else { root.style.removeProperty("--company-primary"); }
    const existingIcons = Array.from(doc.querySelectorAll("link[rel~='icon'], link[rel~='shortcut icon']")) as HTMLLinkElement[];
    existingIcons.forEach((el) => el.remove());
    if (companyFavicon) {
      const link = doc.createElement("link");
      link.rel = "icon"; link.href = companyFavicon;
      doc.head.appendChild(link);
    }
    return () => {
      doc.title = originalTitle;
      root.style.removeProperty("--company-primary");
      const added = doc.querySelectorAll("link[rel~='icon'], link[rel~='shortcut icon']");
      added.forEach((el) => el.remove());
      const defaultFav = doc.createElement("link");
      defaultFav.rel = "icon"; defaultFav.type = "image/png"; defaultFav.href = "/logofilas.png";
      doc.head.appendChild(defaultFav);
    };
  }, [company, companyDisplayName, companyPrimaryColor, companyFavicon]);

  const heroGradient = companyPrimaryColor
    ? `linear-gradient(90deg, ${companyPrimaryColor} 0%, #2563eb 55%, #38bdf8 100%)`
    : undefined;

  const [safeAuthUser, setSafeAuthUser] = useState<AuthUser | null>(null);
  const [authHydrated, setAuthHydrated] = useState<boolean>(false);
  const safeLoginEntregadorRef = useRef<((cpf: string) => boolean) | null>(null);
  const [safeLoginError, setSafeLoginError] = useState<string | null>(null);

  const [safeQueue, setSafeQueue] = useState<QueueRecord[]>([]);
  const [safeLoading, setSafeLoading] = useState<boolean>(true);
  const [safeSyncing, setSafeSyncing] = useState<boolean>(false);
  const [safeError, setSafeError] = useState<string | null>(null);
  const [safeFilters, setSafeFilters] = useState<QueueFiltersType>(DEFAULT_FILTERS);

  const loadEntregadorQueueRef = useRef<((cpf: string) => Promise<void>) | null>(null);
  const createRecordRef = useRef<((values: QueueFormValues) => Promise<void>) | null>(null);
  const setFiltersRef = useRef<((filters: Partial<QueueFiltersType>) => void) | null>(null);
  const queueStoreGetStateRef = useRef<(() => unknown) | null>(null);

  useEffect(() => {
    if (!stores) {
      setSafeAuthUser(null);
      setAuthHydrated(false);
      safeLoginEntregadorRef.current = null;
      setSafeLoginError(null);
      setSafeQueue([]);
      setSafeLoading(true);
      setSafeSyncing(false);
      setSafeError(null);
      setSafeFilters(DEFAULT_FILTERS);
      loadEntregadorQueueRef.current = null;
      createRecordRef.current = null;
      setFiltersRef.current = null;
      queueStoreGetStateRef.current = null;
      return;
    }

    const useAuthStore = stores.auth.useCompanyAuthStore;
    const useQueueStore = stores.queue;

    const initialAuth = useAuthStore.getState();
    setSafeAuthUser(initialAuth.user);
    setSafeLoginError(initialAuth.loginError);
    safeLoginEntregadorRef.current = initialAuth.loginEntregador;

    const unsubAuthUser = useAuthStore.subscribe((s) => setSafeAuthUser(s.user));
    const unsubLoginError = useAuthStore.subscribe((s) => setSafeLoginError(s.loginError));

    const initialQueue = useQueueStore.getState();
    setSafeQueue(initialQueue.queue);
    setSafeLoading(initialQueue.loading);
    setSafeSyncing(initialQueue.syncing);
    setSafeError(initialQueue.error);
    setSafeFilters(initialQueue.filters);

    const unsubQueue = useQueueStore.subscribe((s) => setSafeQueue(s.queue));
    const unsubLoading = useQueueStore.subscribe((s) => setSafeLoading(s.loading));
    const unsubSyncing = useQueueStore.subscribe((s) => setSafeSyncing(s.syncing));
    const unsubError = useQueueStore.subscribe((s) => setSafeError(s.error));
    const unsubFilters = useQueueStore.subscribe((s) => setSafeFilters(s.filters));

    loadEntregadorQueueRef.current = initialQueue.loadEntregadorQueue;
    createRecordRef.current = initialQueue.createRecord;
    setFiltersRef.current = initialQueue.setFilters;
    queueStoreGetStateRef.current = useQueueStore.getState;

    setAuthHydrated(true);

    return () => {
      unsubAuthUser();
      unsubLoginError();
      unsubQueue();
      unsubLoading();
      unsubSyncing();
      unsubError();
      unsubFilters();
    };
  }, [stores]);

  const [cpf, setCpf] = useState("");
  const [cpfConfirmado, setCpfConfirmado] = useState<string | null>(
    safeAuthUser?.role === "entregador" ? safeAuthUser.identifier : null,
  );
  const [cidade, setCidade] = useState<City>("Rio de Janeiro");
  const [hotzone, setHotzone] = useState<Hotzone>(hotzonesByCity["Rio de Janeiro"][0]);
  const [turno, setTurno] = useState<Shift>("Manhã");
  const [dataFila, setDataFila] = useState(() => new Date().toISOString().slice(0, 10));
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [confirmacaoOk, setConfirmacaoOk] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [cpfLoading, setCpfLoading] = useState(false);

  const hotzoneProp = useMemo(() => {
    if (!company) return undefined;
    return (company.allowed_hotzones?.length ?? 0) > 0
      ? company.allowed_hotzones
      : undefined;
  }, [company]);

  const cityHotzones = useMemo(() => {
    const all = hotzonesByCity[cidade];
    if (!hotzoneProp) return all;
    return all.filter((hz) => hotzoneProp.includes(hz));
  }, [cidade, hotzoneProp]);

  const turnoOptions = useMemo<Shift[]>(() => {
    const base: Shift[] = ["Manhã", "Tarde", "Noite"];
    if (cidade === "Rio de Janeiro") {
      base.push("Ceia");
    }
    return base;
  }, [cidade]);

  useEffect(() => {
    if (!turnoOptions.includes(turno)) {
      setTurno(turnoOptions[0] ?? "Manhã");
    }
  }, [turnoOptions, turno]);

  useEffect(() => {
    if (cityHotzones.length > 0 && !cityHotzones.includes(hotzone)) {
      setHotzone(cityHotzones[0]);
    } else if (cityHotzones.length === 0 && hotzonesByCity[cidade].length > 0) {
      setHotzone(hotzonesByCity[cidade][0]);
    }
  }, [cityHotzones, hotzone, cidade]);

  useEffect(() => {
    if (location.pathname !== `/c/${slug}/entregador`) {
      navigate(`/c/${slug}/entregador`, { replace: true });
    }
  }, [location.pathname, navigate, slug]);

  useEffect(() => {
    if (cpfConfirmado && loadEntregadorQueueRef.current) {
      void loadEntregadorQueueRef.current(cpfConfirmado);
    }
  }, [cpfConfirmado, stores]);

  useEffect(() => {
    if (!company || !loadEntregadorQueueRef.current || !cpfConfirmado) return;
    if (!hasSupabaseConfig) return;
    if (!supabase) return;
    const suffix = company.id.slice(0, 8);
    const channel = supabase
      .channel(`fila-registros-entregador-${suffix}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fila_registros" },
        () => {
          if (loadEntregadorQueueRef.current && cpfConfirmado) {
            void loadEntregadorQueueRef.current(cpfConfirmado);
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [company, stores, cpfConfirmado]);

  const registros = useMemo(
    () =>
      [...safeQueue]
        .filter((item) => item.cpf === cpfConfirmado)
        .sort((a, b) => b.criado_em.localeCompare(a.criado_em)),
    [cpfConfirmado, safeQueue],
  );

  const registrosFiltrados = useMemo(() => {
    return registros.filter((record) => {
      const byCity = safeFilters.cidade === "Todas" || record.cidade === safeFilters.cidade;
      const byHotzone =
        safeFilters.hotzone === "Todas" || record.hotzone === safeFilters.hotzone;
      const byShift =
        safeFilters.turno_desejado === "Todos" ||
        record.turno_desejado === safeFilters.turno_desejado;
      const byDate =
        safeFilters.data_fila === "Todas" || record.data_fila === safeFilters.data_fila;
      const byOrigem =
        safeFilters.origem === "Todas" || record.origem === safeFilters.origem;
      const byTipo = safeFilters.tipo === "Todas" || record.tipo === safeFilters.tipo;
      return byCity && byHotzone && byShift && byDate && byOrigem && byTipo;
    });
  }, [registros, safeFilters]);

  const pending = registrosFiltrados.filter((item) => item.status.startsWith("na_fila_"));
  const concluidos = registrosFiltrados.filter((item) => !item.status.startsWith("na_fila_"));

  const handleIdentificar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setCpfLoading(true);

    try {
      const digits = normalizeCPF(cpf);
      if (!isValidCPF(digits)) {
        setFormError("Informe um CPF valido para continuar.");
        return;
      }

      if (safeLoginEntregadorRef.current) {
        const ok = safeLoginEntregadorRef.current(digits);
        if (!ok) {
          setFormError(safeLoginError ?? "CPF invalido.");
          return;
        }
      }

      setCpfConfirmado(digits);
      if (loadEntregadorQueueRef.current) await loadEntregadorQueueRef.current(digits);
      navigate(`/c/${slug}/entregador`, { replace: true });
    } finally {
      setCpfLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const cpfDigits = normalizeCPF(cpfConfirmado ?? "");
    if (!isValidCPF(cpfDigits)) {
      setFormError("CPF invalido para agendar interesse.");
      return;
    }

    if (!nome.trim()) {
      setFormError("Informe seu nome para agendar.");
      return;
    }

    if (!confirmacaoOk) {
      setFormError("Confirme o aviso antes de cadastrar o interesse.");
      return;
    }

    if (cityHotzones.length === 0) {
      setFormError("Nao existem pracas habilitadas para a cidade selecionada nesta empresa.");
      return;
    }

    const payload: QueueFormValues = {
      origem: "entregador",
      tipo: "ENTREGADOR",
      codigo_pessoa: null,
      cpf: cpfDigits,
      nome: nome.trim(),
      cidade,
      hotzone,
      turno_desejado: turno,
      data_fila: dataFila,
      entregador_contato: contato.trim() || null,
    };

    if (createRecordRef.current) await createRecordRef.current(payload);

    const storeState = queueStoreGetStateRef.current
      ? (queueStoreGetStateRef.current() as { error?: string | null })
      : null;
    if (storeState?.error) {
      setFormError(storeState.error);
      return;
    }

    setNome("");
    setContato("");
    setConfirmacaoOk(false);
    setFormSuccess("Interesse de agenda registrado. A equipe ira acompanhar.");
    if (cpfConfirmado && loadEntregadorQueueRef.current) {
      await loadEntregadorQueueRef.current(cpfConfirmado);
    }
  };

  const handleChangeFilters = (nextFilters: Partial<QueueFiltersType>) => {
    if (setFiltersRef.current) setFiltersRef.current(nextFilters);
  };

  const handleCompanyFormSubmit = async (values: QueueFormValues) => {
    if (createRecordRef.current) {
      await createRecordRef.current({
        ...values,
        origem: "entregador",
        tipo: "ENTREGADOR",
        cpf: normalizeCPF(cpfConfirmado ?? values.cpf ?? ""),
        nome: nome.trim() || values.nome,
        entregador_contato: contato.trim() || values.entregador_contato || null,
      });
      if (cpfConfirmado && loadEntregadorQueueRef.current) {
        await loadEntregadorQueueRef.current(cpfConfirmado);
      }
    }
  };

  if (!authHydrated || scopedLoading || !company) {
    return (
      <main className="min-h-screen bg-[#020617] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-slate-300">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Carregando empresa...
          </div>
        </div>
      </main>
    );
  }

  if (companyErr) {
    return (
      <main className="min-h-screen bg-[#020617] text-white">
        <div className="mx-auto flex min-h-screen max-w-xl items-center px-4 sm:px-6 lg:px-8">
          <div className="w-full rounded-[32px] border border-rose-500/20 bg-rose-500/5 p-6 sm:p-8 backdrop-blur">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl border border-rose-500/30 bg-rose-500/10">
                <ShieldAlert className="h-6 w-6 text-rose-200" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Acesso indisponivel</h1>
                <p className="mt-2 text-sm text-slate-300">{companyErr}</p>
                <button
                  type="button"
                  onClick={() => navigate("/login", { replace: true })}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:text-white"
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!company.enable_entregador_portal) {
    return (
      <main className="min-h-screen bg-[#020617] text-white">
        <div className="mx-auto flex min-h-screen max-w-xl items-center px-4 sm:px-6 lg:px-8">
          <div className="w-full rounded-[32px] border border-amber-500/20 bg-amber-500/5 p-6 sm:p-8 backdrop-blur">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
                <ShieldAlert className="h-6 w-6 text-amber-200" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Portal fechado</h1>
                <p className="mt-2 text-sm text-slate-300">
                  O portal do entregador nao esta habilitado para {company.display_name?.trim() || company.name} no momento.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/c/${slug}/login`, { replace: true })}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:text-white"
                >
                  Ir para login da equipe
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] pb-20 pt-12 text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[420px] w-[420px] rounded-full bg-[#f97316]/20 blur-3xl" />
        <div className="absolute right-10 top-24 h-[340px] w-[340px] rounded-full bg-[#fb923c]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-[#f59e0b]/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <header className="alx-panel alx-glow alx-sheen rounded-[36px] border border-white/10 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex flex-wrap items-center gap-4">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={companyDisplayName}
                  className="h-16 w-auto rounded-[20px] border border-white/10 bg-black/30 p-2.5 shadow-[0_18px_70px_rgba(0,0,0,0.45)]"
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-[20px] border border-white/10 p-2.5 shadow-[0_18px_70px_rgba(0,0,0,0.45)]" style={{ background: heroGradient ?? "linear-gradient(135deg,#f97316,#a78bfa)" }}>
                  <Building2 className="h-8 w-8 text-white" />
                </div>
              )}
              <span className="inline-flex items-center gap-2 rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-[#ffedd5]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Area exclusiva do entregador · {companyDisplayName}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/c/${slug}/login`, { replace: true })}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-xs uppercase tracking-[0.22em] text-slate-200 transition hover:border-white/20 hover:text-white"
            >
              Acesso equipe
            </button>
          </div>
          <h1 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl">
            Agende sua data de interesse.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Informe seu CPF para visualizar seus agendamentos e cadastrar novas datas de
            interesse para a equipe {companyDisplayName}.
          </p>
        </header>

        {!cpfConfirmado ? (
          <section className="mt-8">
            <form
              onSubmit={handleIdentificar}
              className="mx-auto alx-card max-w-2xl rounded-[32px] border border-white/10 p-6 shadow-[0_24px_90px_rgba(2,6,23,0.48)] backdrop-blur sm:p-8"
            >
              <p className="text-xs uppercase tracking-[0.32em] text-[#f97316]">
                Identificacao
              </p>
              <h3 className="mt-3 text-2xl font-semibold">Informe seu CPF</h3>
              <p className="mt-2 text-sm text-slate-400">
                Usamos apenas para localizar seus agendamentos.
              </p>

              <div className="mt-6 space-y-4">
                <label className="space-y-2 block text-sm text-slate-300">
                  <span>CPF</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={cpf}
                    onChange={(event) => {
                      const digits = normalizeCPF(event.target.value);
                      setCpf(formatCPF(digits));
                    }}
                    placeholder="000.000.000-00"
                    className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#f97316]/60"
                  />
                </label>

                {formError ? (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {formError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={cpfLoading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-950 shadow-[0_20px_60px_rgba(249,115,22,0.3)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ background: heroGradient ?? "linear-gradient(90deg,#f97316 0%,#fb923c 55%,#f97316 100%)" }}
                >
                  {cpfLoading ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Continuar"
                  )}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <form
                onSubmit={handleSubmit}
                className="alx-card rounded-[32px] border border-white/10 p-6 shadow-[0_24px_90px_rgba(2,6,23,0.48)] backdrop-blur"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-[#f97316]">
                      Interesse de agenda
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold">
                      Cadastrar data de interesse
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#fb923c]/30 bg-[#fb923c]/10 px-3 py-1 text-xs text-[#fff7ed]">
                    CPF: {formatCPF(cpfConfirmado)}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                    <span>Nome completo</span>
                    <input
                      value={nome}
                      onChange={(event) => setNome(event.target.value)}
                      placeholder="Digite seu nome"
                      className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#f97316]/60"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Cidade</span>
                    <select
                      value={cidade}
                      onChange={(event) => {
                        const next = event.target.value as City;
                        setCidade(next);
                        const all = hotzonesByCity[next];
                        const first = hotzoneProp
                          ? all.find((hz) => hotzoneProp.includes(hz)) ?? all[0]
                          : all[0];
                        if (first) setHotzone(first);
                      }}
                      className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none"
                    >
                      <option value="Rio de Janeiro" className="bg-slate-950 text-white">
                        Rio de Janeiro
                      </option>
                      <option value="São Paulo" className="bg-slate-950 text-white">
                        São Paulo
                      </option>
                    </select>
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Hotzone</span>
                    {cityHotzones.length > 0 ? (
                      <select
                        value={hotzone}
                        onChange={(event) => setHotzone(event.target.value as Hotzone)}
                        className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none"
                      >
                        {cityHotzones.map((item) => (
                          <option key={item} value={item} className="bg-slate-950 text-white">
                            {item}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">
                        Sem pracas habilitadas nesta cidade.
                      </div>
                    )}
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Turno desejado</span>
                    <select
                      value={turno}
                      onChange={(event) => setTurno(event.target.value as Shift)}
                      className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none"
                    >
                      {turnoOptions.map((item) => (
                        <option key={item} value={item} className="bg-slate-950 text-white">
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Data de interesse</span>
                    <input
                      type="date"
                      value={dataFila}
                      onChange={(event) => setDataFila(event.target.value)}
                      className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition focus:border-[#f97316]/60"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                    <span>Contato (WhatsApp / celular) - opcional</span>
                    <input
                      value={contato}
                      onChange={(event) => setContato(event.target.value)}
                      placeholder="Ex: (21) 99999-9999"
                      className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#f97316]/60"
                    />
                  </label>
                </div>

                <div className="mt-6 rounded-[28px] border border-[#f59e0b]/25 bg-gradient-to-br from-[#f59e0b]/10 via-[#f97316]/10 to-transparent p-5">
                  <div className="flex items-start gap-4">
                    <div className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-[#f59e0b]/20 text-[#f59e0b]">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="space-y-3 text-sm leading-7">
                      <p className="font-semibold text-[#fde68a]">
                        Atencao: precisamos de certeza sobre o seu interesse.
                      </p>
                      <p className="text-slate-200">
                        Ao cadastrar este interesse de agenda, voce confirma que esta de
                        acordo com a data e o turno informados. Caso surja uma oportunidade
                        na sua hotzone, a equipe {companyDisplayName} entrara em contato com voce
                        para confirmar e seguir com o atendimento.
                      </p>
                      <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-slate-200">
                        <input
                          type="checkbox"
                          checked={confirmacaoOk}
                          onChange={(event) => setConfirmacaoOk(event.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 text-[#f97316] focus:ring-[#f97316]"
                        />
                        <span>
                          Tenho certeza do interesse informado e autorizo a equipe {companyDisplayName}
                          a entrar em contato caso haja oportunidade nesta data.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {formError ? (
                  <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {formError}
                  </div>
                ) : null}

                {formSuccess ? (
                  <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    {formSuccess}
                  </div>
                ) : null}

                {safeError ? (
                  <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {safeError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={safeSyncing || safeLoading || cityHotzones.length === 0}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-950 shadow-[0_20px_60px_rgba(249,115,22,0.3)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ background: heroGradient ?? "linear-gradient(90deg,#f97316 0%,#fb923c 55%,#f97316 100%)" }}
                >
                  {safeSyncing ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Registrando interesse
                    </>
                  ) : (
                    <>
                      Cadastrar interesse
                      <CalendarCheck className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCpfConfirmado(null);
                    setCpf("");
                    stores?.auth.useCompanyAuthStore.getState().logout?.();
                    navigate(`/c/${slug}/entregador`, { replace: true });
                  }}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-white/20 hover:text-white"
                >
                  Usar outro CPF
                </button>
              </form>

              <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                      Hotzones disponiveis
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Pracas da empresa
                    </h2>
                  </div>
                  <p className="text-sm text-slate-400">
                    Selecionada: {hotzone}
                  </p>
                </div>
                <CompanyHotzoneGrid
                  city={cidade}
                  selectedHotzone={hotzone}
                  queue={safeQueue}
                  onSelect={setHotzone}
                  allowedHotzones={hotzoneProp}
                />
              </div>

              <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Cadastro rapido (opcional)
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white mb-5">
                  Formulario operacional
                </h2>
                <CompanyQueueForm
                  activeCity={cidade}
                  selectedHotzone={hotzone}
                  syncing={safeSyncing}
                  analystName={nome || "Entregador"}
                  onSubmit={handleCompanyFormSubmit}
                  allowedHotzones={hotzoneProp}
                />
              </div>
            </div>

            <div className="space-y-6">
              <CompanyQueueFilters
                filters={safeFilters}
                onChange={handleChangeFilters}
                allowedHotzones={hotzoneProp}
              />

              <div className="alx-card rounded-[32px] border border-white/10 p-6 backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">Interesses aguardando</h3>
                    <p className="mt-2 text-sm text-slate-300">
                      Registros em aberto que a equipe operacional analisa.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-4 py-2 text-sm text-[#ffedd5]">
                    {pending.length} em aberto
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {pending.length === 0 ? (
                    <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-slate-400">
                      Sem interesses abertos no momento.
                    </p>
                  ) : (
                    pending.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white uppercase tracking-wide">
                              {item.nome}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {item.cidade} · {item.hotzone}
                            </p>
                          </div>
                          <span className="rounded-full border border-[#fb923c]/30 bg-[#fb923c]/10 px-3 py-1 text-xs text-[#fff7ed]">
                            {tipoLabel(item.tipo)}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              Turno
                            </p>
                            <p className="mt-1 text-white">{item.turno_desejado}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              Data
                            </p>
                            <p className="mt-1 text-white">{item.data_fila}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              Status
                            </p>
                            <p className="mt-1 text-white">{statusLabel(item.status)}</p>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="alx-card rounded-[32px] border border-white/10 p-6 backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">Historico</h3>
                    <p className="mt-2 text-sm text-slate-300">
                      Interesses atribuidos ou concluidos.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#a78bfa]/30 bg-[#a78bfa]/10 px-4 py-2 text-sm text-[#e9d5ff]">
                    {concluidos.length} registros
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {concluidos.length === 0 ? (
                    <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-slate-400">
                      Sem historico por enquanto.
                    </p>
                  ) : (
                    concluidos.slice(0, 12).map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white uppercase tracking-wide">
                              {item.nome}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {item.cidade} · {item.hotzone}
                            </p>
                          </div>
                          <span
                            className={
                              item.status.startsWith("atribuido_")
                                ? "rounded-full border border-[#38bdf8]/30 bg-[#38bdf8]/10 px-3 py-1 text-xs text-[#e0f2fe]"
                                : "rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1 text-xs text-[#dcfce7]"
                            }
                          >
                            {statusLabel(item.status)}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              Turno
                            </p>
                            <p className="mt-1 text-white">{item.turno_desejado}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              Data
                            </p>
                            <p className="mt-1 text-white">{item.data_fila}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              Criado em
                            </p>
                            <p className="mt-1 text-white">
                              {new Date(item.criado_em).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
