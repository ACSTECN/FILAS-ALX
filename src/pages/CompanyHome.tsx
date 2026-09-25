import { useEffect, useMemo, useState } from "react";
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
import { HotzoneGrid } from "@/components/HotzoneGrid";
import { AnalystRanking } from "@/components/AnalystRanking";
import { AnalystHistory } from "@/components/AnalystHistory";
import { QueueFilters } from "@/components/QueueFilters";
import { QueueForm } from "@/components/QueueForm";
import { QueueList } from "@/components/QueueList";
import { QueueStats } from "@/components/QueueStats";
import { hotzonesByCity } from "@/data/hotzones";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import type { City, QueueFilters as QueueFiltersType } from "@/types/queue";

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

export default function CompanyHome() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { loading, error: companyErr, company, analystUsers, stores } =
    useCompanyScoped(slug);

  const companyAuthStore = stores?.auth.useCompanyAuthStore ?? null;
  const queueStore = stores?.queue ?? null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const user = companyAuthStore ? companyAuthStore((s) => s.user) : null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const logout = companyAuthStore ? companyAuthStore((s) => s.logout) : null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const queue = queueStore ? queueStore((s) => s.queue) : [];
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const filters = queueStore
    ? queueStore((s) => s.filters)
    : {
        cidade: "Todas" as const,
        hotzone: "Todas" as const,
        turno_desejado: "Todos" as const,
        data_fila: "Todas" as const,
        origem: "Todas" as const,
        tipo: "Todas" as const,
      };
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const loadingQ = queueStore ? queueStore((s) => s.loading) : true;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const syncing = queueStore ? queueStore((s) => s.syncing) : false;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const errorQ = queueStore ? queueStore((s) => s.error) : null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const loadQueue = queueStore ? queueStore((s) => s.loadQueue) : null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const setFilters = queueStore ? queueStore((s) => s.setFilters) : null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const analystName = queueStore ? queueStore((s) => s.analystName) : "";
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const setAnalystName = queueStore ? queueStore((s) => s.setAnalystName) : null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const createRecord = queueStore ? queueStore((s) => s.createRecord) : null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const removeRecord = queueStore ? queueStore((s) => s.removeRecord) : null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const assignRecord = queueStore ? queueStore((s) => s.assignRecord) : null;

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

  const userName = user?.analystName ?? user?.identifier ?? "Usuario";
  const greeting = getGreetingByHour(now.getHours());
  const dateLabel = formatDateBR(now);
  const timeLabel = formatTimeBR(now);

  const filteredQueue = useMemo(() => {
    return queue.filter((record) => {
      const byCity = filters.cidade === "Todas" || record.cidade === filters.cidade;
      const byHotzone =
        filters.hotzone === "Todas" || record.hotzone === filters.hotzone;
      const byShift =
        filters.turno_desejado === "Todos" ||
        record.turno_desejado === filters.turno_desejado;
      const byDate =
        filters.data_fila === "Todas" || record.data_fila === filters.data_fila;
      const byOrigem =
        filters.origem === "Todas" || record.origem === filters.origem;
      const byTipo = filters.tipo === "Todas" || record.tipo === filters.tipo;

      return byCity && byHotzone && byShift && byDate && byOrigem && byTipo;
    });
  }, [filters, queue]);

  const analistaOverride = useMemo(
    () =>
      analystUsers.find((a) => a.id === user?.analystId) ??
      (user?.analystName
        ? {
            id: user.analystId ?? user.identifier,
            role: "operacional" as const,
            name: user.analystName,
            initials: user.analystInitials ?? userName.slice(0, 2).toUpperCase(),
            password: "",
          }
        : null),
    [analystUsers, user, userName],
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
    if (loadQueue) {
      void loadQueue();
    }
  }, [loadQueue]);

  useEffect(() => {
    if (!company || !loadQueue) return;
    if (!hasSupabaseConfig) return;
    if (!supabase) return;
    const suffix = company.id.slice(0, 8);
    const channel = supabase
      .channel(`fila-registros-company-${suffix}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fila_registros" },
        () => {
          void loadQueue();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [company, loadQueue]);

  if (loading || !company) {
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

  if (!user || user.role !== "operacional") {
    return <Navigate to={`/c/${slug}/login`} replace />;
  }

  const changeCity = (city: City) => {
    setActiveCity(city);
    setSelectedHotzone(hotzonesByCity[city][0]);
  };

  const changeFilters = (nextFilters: Partial<QueueFiltersType>) => {
    if (setFilters) setFilters(nextFilters);
  };

  const handleAssign = async (id: string) => {
    if (assignRecord) await assignRecord(id);
  };

  const hotzoneProp = (company.allowed_hotzones?.length ?? 0) > 0
    ? company.allowed_hotzones
    : undefined;

  const companyName = company.name;
  const companyLogo = company.logo_url;

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
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[22px] border border-white/10 bg-gradient-to-br from-[#a78bfa] to-[#2563eb] shadow-[0_18px_50px_rgba(167,139,250,0.25)]">
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
                    Painel operacional · {companyName} · tudo sincronizado em tempo real.
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
                    alt={companyName}
                    className="h-24 w-auto rounded-[28px] border border-white/10 bg-black/30 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.45)] sm:h-28"
                  />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-[28px] border border-white/10 bg-gradient-to-br from-[#2563eb] to-[#a78bfa] shadow-[0_18px_70px_rgba(0,0,0,0.45)] sm:h-28 sm:w-28">
                    <Building2 className="h-10 w-10 text-white sm:h-12 sm:w-12" />
                  </div>
                )}
                <span className="inline-flex items-center gap-2 rounded-full border border-[#2563eb]/30 bg-[#2563eb]/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[#dbeafe]">
                  <RadioTower className="h-4 w-4" />
                  Operacao ao vivo · {companyName}
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
                  {companyName} · Equipe operacional
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (logout) logout();
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
          <QueueStats activeCity={activeCity} queue={queue} />
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

        {errorQ ? (
          <div className="mt-6 rounded-[24px] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {errorQ}
          </div>
        ) : null}

        {activeTab === "ranking" && features.enableRanking ? (
          <div className="mt-6">
            <AnalystRanking
              companyId={company.id}
              analystsList={analystUsers}
            />
          </div>
        ) : activeTab === "historico" && features.enableHistorico ? (
          <div className="mt-6">
            <AnalystHistory
              companyId={company.id}
              selectedAnalystOverride={analistaOverride ?? undefined}
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
                <HotzoneGrid
                  city={activeCity}
                  selectedHotzone={selectedHotzone}
                  queue={queue}
                  onSelect={setSelectedHotzone}
                  allowedHotzones={hotzoneProp}
                />
              </div>

              <QueueFilters
                filters={filters}
                onChange={changeFilters}
                allowedHotzones={hotzoneProp}
              />
              <QueueList
                records={filteredQueue}
                loading={loadingQ}
                syncing={syncing}
                onRemove={removeRecord ?? (async () => {})}
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
                  value={analystName}
                  onChange={(event) => setAnalystName?.(event.target.value)}
                  placeholder="Digite seu nome (analista)"
                  className="alx-field mt-5 w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#a78bfa]/60"
                />
                <p className="mt-3 text-sm text-slate-400">
                  Esse nome marca quem colocou o entregador na fila (e conta no ranking
                  quando for atribuido).
                </p>
              </div>
              <QueueForm
                activeCity={activeCity}
                selectedHotzone={selectedHotzone}
                syncing={syncing}
                analystName={analystName}
                onSubmit={createRecord ?? (async () => {})}
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
              <p className="text-sm font-medium text-white">{companyName}</p>
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
