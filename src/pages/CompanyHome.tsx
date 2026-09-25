import { useEffect, useMemo, useState, useRef } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  BellElectric,
  Building2,
  Calendar,
  Clock,
  DatabaseZap,
  LogOut,
  LoaderCircle,
  Map,
  RadioTower,
  Sparkles,
  ShieldAlert,
  User,
} from "lucide-react";
import { useCompanyScoped } from "@/hooks/useCompanyScoped";
import { CitySwitch } from "@/components/CitySwitch";
import { CompanyHotzoneGrid } from "@/components/CompanyHotzoneGrid";
import { CompanyAnalystRanking } from "@/components/CompanyAnalystRanking";
import { CompanyAnalystHistory } from "@/components/CompanyAnalystHistory";
import { CompanyQueueFilters } from "@/components/CompanyQueueFilters";
import { CompanyQueueForm } from "@/components/CompanyQueueForm";
import { QueueList } from "@/components/QueueList";
import { QueueStats } from "@/components/QueueStats";
import { hotzonesByCity } from "@/data/hotzones";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import type { City, QueueFilters as QueueFiltersType, QueueFormValues, QueueRecord } from "@/types/queue";
import type { AnalystUser, AuthUser } from "@/types/auth";

function formatDateBR(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTimeBR(date: Date) {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getGreetingByHour(hour: number) {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

type CompanyTab = "fila" | "ranking" | "historico";

const DEFAULT_FILTERS: QueueFiltersType = {
  cidade: "Todas",
  hotzone: "Todas",
  turno_desejado: "Todos",
  data_fila: "Todas",
  origem: "Todas",
  tipo: "Todas",
};

export default function CompanyHome() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { loading, error: companyErr, company, analystUsers, stores } =
    useCompanyScoped(slug);

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
    doc.title = `${companyDisplayName} | Painel`;
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

  const [safeUser, setSafeUser] = useState<AuthUser | null>(null);
  const [authHydrated, setAuthHydrated] = useState<boolean>(false);
  const [logoutFn, setLogoutFn] = useState<(() => void) | null>(null);

  const [safeQueue, setSafeQueue] = useState<QueueRecord[]>([]);
  const [safeFilters, setSafeFilters] = useState<QueueFiltersType>(DEFAULT_FILTERS);
  const [safeLoadingQ, setSafeLoadingQ] = useState<boolean>(true);
  const [safeSyncing, setSafeSyncing] = useState<boolean>(false);
  const [safeErrorQ, setSafeErrorQ] = useState<string | null>(null);
  const [safeAnalystName, setSafeAnalystName] = useState<string>("");

  const loadQueueRef = useRef<(() => Promise<void>) | null>(null);
  const setFiltersRef = useRef<((filters: Partial<QueueFiltersType>) => void) | null>(null);
  const setAnalystNameRef = useRef<((value: string) => void) | null>(null);
  const createRecordRef = useRef<((values: QueueFormValues) => Promise<void>) | null>(null);
  const removeRecordRef = useRef<((id: string) => Promise<void>) | null>(null);
  const assignRecordRef = useRef<((id: string) => Promise<void>) | null>(null);

  useEffect(() => {
    if (!stores) {
      setSafeUser(null);
      setAuthHydrated(false);
      setLogoutFn(null);
      setSafeQueue([]);
      setSafeFilters(DEFAULT_FILTERS);
      setSafeLoadingQ(true);
      setSafeSyncing(false);
      setSafeErrorQ(null);
      setSafeAnalystName("");
      loadQueueRef.current = null;
      setFiltersRef.current = null;
      setAnalystNameRef.current = null;
      createRecordRef.current = null;
      removeRecordRef.current = null;
      assignRecordRef.current = null;
      return;
    }

    const useAuthStore = stores.auth.useCompanyAuthStore;
    const useQueueStore = stores.queue;

    const initialAuth = useAuthStore.getState();
    setSafeUser(initialAuth.user);
    setLogoutFn(initialAuth.logout);

    const unsubUser = useAuthStore.subscribe((s) => setSafeUser(s.user));
    const unsubLogout = useAuthStore.subscribe((s) => setLogoutFn(() => s.logout));

    const initialQueue = useQueueStore.getState();
    setSafeQueue(initialQueue.queue);
    setSafeFilters(initialQueue.filters);
    setSafeLoadingQ(initialQueue.loading);
    setSafeSyncing(initialQueue.syncing);
    setSafeErrorQ(initialQueue.error);
    setSafeAnalystName(initialQueue.analystName);

    const unsubQueue = useQueueStore.subscribe((s) => setSafeQueue(s.queue));
    const unsubFilters = useQueueStore.subscribe((s) => setSafeFilters(s.filters));
    const unsubLoading = useQueueStore.subscribe((s) => setSafeLoadingQ(s.loading));
    const unsubSyncing = useQueueStore.subscribe((s) => setSafeSyncing(s.syncing));
    const unsubError = useQueueStore.subscribe((s) => setSafeErrorQ(s.error));
    const unsubAnalystName = useQueueStore.subscribe((s) => setSafeAnalystName(s.analystName));

    loadQueueRef.current = initialQueue.loadQueue;
    setFiltersRef.current = initialQueue.setFilters;
    setAnalystNameRef.current = initialQueue.setAnalystName;
    createRecordRef.current = initialQueue.createRecord;
    removeRecordRef.current = initialQueue.removeRecord;
    assignRecordRef.current = initialQueue.assignRecord;

    setAuthHydrated(true);

    return () => {
      unsubUser();
      unsubLogout();
      unsubQueue();
      unsubFilters();
      unsubLoading();
      unsubSyncing();
      unsubError();
      unsubAnalystName();
    };
  }, [stores]);

  const [now, setNow] = useState<Date>(new Date());

  const features = useMemo(() => {
    if (!company)
      return {
        enableFila: false,
        enableRanking: false,
        enableHistorico: false,
        enableEntregador: false,
      };
    return {
      enableFila: company.enable_fila,
      enableRanking: company.enable_ranking,
      enableHistorico: company.enable_historico,
      enableEntregador: company.enable_entregador_portal,
    };
  }, [company]);

  const availableTabs: CompanyTab[] = useMemo(() => {
    const tabs: CompanyTab[] = [];
    if (features.enableFila) tabs.push("fila");
    if (features.enableRanking) tabs.push("ranking");
    if (features.enableHistorico) tabs.push("historico");
    return tabs;
  }, [features]);

  const [activeTab, setActiveTab] = useState<CompanyTab>(
    availableTabs[0] ?? "fila",
  );
  const [activeCity, setActiveCity] = useState<City>("Rio de Janeiro");
  const [selectedHotzone, setSelectedHotzone] = useState<City extends keyof typeof hotzonesByCity ? (typeof hotzonesByCity)[City][number] : never>(() => hotzonesByCity["Rio de Janeiro"][0]);

  const userName = safeUser?.analystName ?? safeUser?.identifier ?? "Usuario";
  const greeting = getGreetingByHour(now.getHours());
  const dateLabel = formatDateBR(now);
  const timeLabel = formatTimeBR(now);

  const filteredQueue = useMemo(() => {
    return safeQueue.filter((record) => {
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
  }, [safeFilters, safeQueue]);

  const analistaOverride: AnalystUser | null = useMemo(
    () =>
      analystUsers.find((a) => a.id === safeUser?.analystId) ??
      (safeUser?.analystName
        ? {
            id: safeUser.analystId ?? safeUser.identifier,
            role: "operacional" as const,
            name: safeUser.analystName,
            initials: safeUser.analystInitials ?? userName.slice(0, 2).toUpperCase(),
            password: "",
          }
        : null),
    [analystUsers, safeUser, userName],
  );

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs, activeTab]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30 * 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (loadQueueRef.current) {
      void loadQueueRef.current();
    }
  }, [stores]);

  useEffect(() => {
    if (!company || !loadQueueRef.current) return;
    if (!hasSupabaseConfig) return;
    if (!supabase) return;
    const suffix = company.id.slice(0, 8);
    const channel = supabase
      .channel(`fila-registros-company-${suffix}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fila_registros" },
        () => {
          if (loadQueueRef.current) void loadQueueRef.current();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [company, stores]);

  if (!authHydrated || loading || !company) {
    return (
      <main className="min-h-screen bg-[#020617] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-slate-300">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Carregando painel...
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

  if (!safeUser || safeUser.role !== "operacional") {
    return <Navigate to={`/c/${slug}/login`} replace />;
  }

  const changeCity = (city: City) => {
    setActiveCity(city);
    setSelectedHotzone(hotzonesByCity[city][0]);
  };

  const changeFilters = (nextFilters: Partial<QueueFiltersType>) => {
    if (setFiltersRef.current) setFiltersRef.current(nextFilters);
  };

  const handleAssign = async (id: string) => {
    if (assignRecordRef.current) await assignRecordRef.current(id);
  };

  const hotzoneProp = (company.allowed_hotzones?.length ?? 0) > 0
    ? company.allowed_hotzones
    : undefined;

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-0 h-[420px] w-[420px] rounded-full bg-[#a78bfa]/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-[340px] w-[340px] rounded-full bg-[#2563eb]/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-[#1d4ed8]/15 blur-3xl" />
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="alx-card rounded-[32px] border border-white/10 bg-gradient-to-br from-[#2563eb]/15 via-[#a78bfa]/10 to-[#f97316]/10 p-6 backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[22px] border border-white/10 shadow-[0_18px_50px_rgba(167,139,250,0.25)]" style={{ background: heroGradient ?? "linear-gradient(135deg,#a78bfa,#2563eb)" }}>
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#c4b5fd]">
                    {greeting}
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                    Bem-vindo,{" "}
                    <span className="bg-gradient-to-r from-[#c4b5fd] via-[#a5f3fc] to-[#fdba74] bg-clip-text text-transparent">
                      {userName}
                    </span>
                  </h1>
                  <p className="mt-2 text-sm text-slate-300">
                    Painel operacional · {companyDisplayName} · tudo sincronizado em tempo real.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:w-[420px]">
            <div className="alx-card rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#38bdf8]" />
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Hoje
                  </p>
                </div>
              </div>
              <p className="mt-3 text-base font-semibold text-white capitalize">
                {dateLabel}
              </p>
            </div>
            <div className="alx-card rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#f97316]" />
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Horario
                  </p>
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-white">
                {timeLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="alx-panel alx-glow alx-sheen rounded-[36px] border border-white/10 p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-4">
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt={companyDisplayName}
                    className="h-24 w-auto rounded-[28px] border border-white/10 bg-black/30 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.45)] sm:h-28"
                  />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-[28px] border border-white/10 shadow-[0_18px_70px_rgba(0,0,0,0.45)] sm:h-28 sm:w-28" style={{ background: heroGradient ?? "linear-gradient(135deg,#2563eb,#a78bfa)" }}>
                    <Building2 className="h-10 w-10 text-white sm:h-12 sm:w-12" />
                  </div>
                )}
                <span className="inline-flex items-center gap-2 rounded-full border border-[#2563eb]/30 bg-[#2563eb]/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[#dbeafe]">
                  <RadioTower className="h-4 w-4" />
                  Operacao ao vivo · {companyDisplayName}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#a78bfa]/30 bg-[#a78bfa]/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[#e9d5ff]">
                  <User className="h-4 w-4" />
                  Dashboard operacional
                </span>
              </div>
              <h1 className="mt-6 max-w-4xl font-display text-4xl font-semibold leading-tight text-white sm:text-5xl xl:text-6xl">
                Fila unificada: equipe + interesses de entregadores.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
                Cadastro rapido, visualização em tempo real e separacao por
                origem/tipo (Fila, TPR ou Entregador) para operação rápida.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px] xl:grid-cols-1">
              {[
                {
                  icon: Map,
                  label:
                    hotzoneProp && hotzoneProp.length > 0
                      ? `${hotzoneProp.length} pracas permitidas`
                      : "Todas as pracas",
                  detail: hotzoneProp ? hotzoneProp.slice(0, 3).join(" / ") + (hotzoneProp.length > 3 ? "..." : "") : "RJ e SP em uma unica tela",
                },
                {
                  icon: BellElectric,
                  label: "Fila aberta",
                  detail: "Equipe e entregadores em tempo real",
                },
                {
                  icon: DatabaseZap,
                  label: hasSupabaseConfig ? "Supabase ativo" : "Modo local ativo",
                  detail: hasSupabaseConfig
                    ? "Pronto para Realtime"
                    : "Basta preencher .env para sincronizar",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                >
                  <item.icon className="h-5 w-5 text-[#a78bfa]" />
                  <p className="mt-5 text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
                </div>
              ))}

              <div className="flex flex-col gap-2 rounded-[24px] border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Sessao
                </p>
                <p className="text-sm font-semibold text-white">
                  {companyDisplayName} · Equipe operacional
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (logoutFn) logoutFn();
                    navigate(`/c/${slug}/login`, { replace: true });
                  }}
                  className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 transition hover:border-white/20 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-black/15 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <CitySwitch activeCity={activeCity} onChange={changeCity} />
              <p className="text-sm text-slate-400">
                Selecione a cidade e escolha a hotzone antes de cadastrar.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.24em] text-slate-400">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                historico preservado
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                realtime compartilhado
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <QueueStats activeCity={activeCity} queue={safeQueue} />
          {availableTabs.length > 0 && (
            <div className="flex items-center gap-2 self-start rounded-[22px] border border-white/10 bg-white/5 p-2">
              {availableTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={
                    activeTab === tab
                      ? "rounded-[18px] bg-white/10 px-4 py-2 text-sm font-semibold text-white capitalize"
                      : "rounded-[18px] px-4 py-2 text-sm text-slate-300 capitalize transition hover:text-white"
                  }
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>

        {safeErrorQ ? (
          <div className="mt-6 rounded-[24px] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {safeErrorQ}
          </div>
        ) : null}

        {activeTab === "ranking" && features.enableRanking ? (
          <div className="mt-6">
            <CompanyAnalystRanking
              companyId={company.id}
              analystsList={analystUsers}
            />
          </div>
        ) : activeTab === "historico" && features.enableHistorico ? (
          <div className="mt-6">
            <CompanyAnalystHistory
              companyId={company.id}
              selectedAnalyst={analistaOverride}
            />
          </div>
        ) : features.enableFila ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-6">
              <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                      Hotzones
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Quadrados operacionais
                    </h2>
                  </div>
                  <p className="text-sm text-slate-400">
                    Hotzone selecionada: {selectedHotzone}
                  </p>
                </div>
                <CompanyHotzoneGrid
                  city={activeCity}
                  selectedHotzone={selectedHotzone}
                  queue={safeQueue}
                  onSelect={setSelectedHotzone}
                  allowedHotzones={hotzoneProp}
                />
              </div>

              <CompanyQueueFilters
                filters={safeFilters}
                onChange={changeFilters}
                allowedHotzones={hotzoneProp}
              />
              <QueueList
                records={filteredQueue}
                loading={safeLoadingQ}
                syncing={safeSyncing}
                onRemove={removeRecordRef.current ?? (async () => {})}
                onAssign={handleAssign}
              />
            </section>

            <aside className="xl:sticky xl:top-6 xl:self-start">
              <div className="alx-card mb-6 rounded-[32px] border border-white/10 p-6 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.32em] text-[#a78bfa]">
                  Operacao
                </p>
                <h3 className="mt-3 text-xl font-semibold text-white">Analista</h3>
                <input
                  value={safeAnalystName}
                  onChange={(event) => setAnalystNameRef.current?.(event.target.value)}
                  placeholder="Digite seu nome (analista)"
                  className="alx-field mt-5 w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#a78bfa]/60"
                />
                <p className="mt-3 text-sm text-slate-400">
                  Esse nome marca quem colocou o entregador na fila (e conta no ranking
                  quando for atribuido).
                </p>
              </div>
              <CompanyQueueForm
                activeCity={activeCity}
                selectedHotzone={selectedHotzone}
                syncing={safeSyncing}
                analystName={safeAnalystName}
                onSubmit={createRecordRef.current ?? (async () => {})}
                allowedHotzones={hotzoneProp}
              />
            </aside>
          </div>
        ) : (
          <div className="mt-8 rounded-[32px] border border-dashed border-white/10 bg-white/5 p-10 text-center">
            <p className="text-lg font-semibold text-white">Nenhuma visualizacao habilitada</p>
            <p className="mt-2 text-sm text-slate-400">
              Contate o administrador da plataforma para habilitar Fila, Ranking ou Historico.
            </p>
          </div>
        )}

        <footer className="mt-10 rounded-[32px] border border-white/10 bg-black/20 px-6 py-5 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-white">{companyDisplayName}</p>
              <p className="mt-1 text-sm text-slate-400">
                Direitos reservados · TWINEX TECH.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <img
                src="/logotwinex.png"
                alt="Twinex Tech"
                className="h-14 w-auto rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-2"
              />
              <p className="text-right text-xs uppercase tracking-[0.24em] text-slate-400">
                TWINEX TECH
                <br />
                tecnologia e automacao
              </p>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}
