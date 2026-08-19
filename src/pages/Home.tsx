import { useEffect, useMemo, useState } from "react";
import {
  BellElectric,
  DatabaseZap,
  LogOut,
  Map,
  RadioTower,
  User,
} from "lucide-react";
import { CitySwitch } from "@/components/CitySwitch";
import { HotzoneGrid } from "@/components/HotzoneGrid";
import { AnalystRanking } from "@/components/AnalystRanking";
import { AnalystHistory } from "@/components/AnalystHistory";
import { QueueFilters } from "@/components/QueueFilters";
import { QueueForm } from "@/components/QueueForm";
import { QueueList } from "@/components/QueueList";
import { QueueStats } from "@/components/QueueStats";
import { hotzonesByCity } from "@/data/hotzones";
import { useQueueRealtime } from "@/hooks/useQueueRealtime";
import { hasSupabaseConfig } from "@/lib/supabase";
import { useQueueStore } from "@/store/queueStore";
import { useAuthStore } from "@/store/authStore";
import type { City, QueueFilters as QueueFiltersType } from "@/types/queue";

export default function Home() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [activeTab, setActiveTab] = useState<"fila" | "ranking" | "historico">("fila");
  const [activeCity, setActiveCity] = useState<City>("Rio de Janeiro");
  const [selectedHotzone, setSelectedHotzone] = useState(
    hotzonesByCity["Rio de Janeiro"][0],
  );

  const queue = useQueueStore((state) => state.queue);
  const filters = useQueueStore((state) => state.filters);
  const loading = useQueueStore((state) => state.loading);
  const syncing = useQueueStore((state) => state.syncing);
  const error = useQueueStore((state) => state.error);
  const loadQueue = useQueueStore((state) => state.loadQueue);
  const setFilters = useQueueStore((state) => state.setFilters);
  const analystName = useQueueStore((state) => state.analystName);
  const setAnalystName = useQueueStore((state) => state.setAnalystName);
  const createRecord = useQueueStore((state) => state.createRecord);
  const removeRecord = useQueueStore((state) => state.removeRecord);
  const assignRecord = useQueueStore((state) => state.assignRecord);

  useQueueRealtime();

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

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

  const changeCity = (city: City) => {
    setActiveCity(city);
    setSelectedHotzone(hotzonesByCity[city][0]);
  };

  const changeFilters = (nextFilters: Partial<QueueFiltersType>) => {
    setFilters(nextFilters);
  };

  const handleAssign = async (id: string) => {
    await assignRecord(id);
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-0 h-[420px] w-[420px] rounded-full bg-[#0f766e]/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-[340px] w-[340px] rounded-full bg-[#2563eb]/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-[#1d4ed8]/15 blur-3xl" />
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="alx-panel alx-glow alx-sheen rounded-[36px] border border-white/10 p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-4">
                <img
                  src="/logofilas.png"
                  alt="ALX Filas"
                  className="h-24 w-auto rounded-[28px] border border-white/10 bg-black/30 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.45)] sm:h-28"
                />
                <span className="inline-flex items-center gap-2 rounded-full border border-[#2563eb]/30 bg-[#2563eb]/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[#dbeafe]">
                  <RadioTower className="h-4 w-4" />
                  Operacao ao vivo
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[#ffedd5]">
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
                { icon: Map, label: "8 hotzones", detail: "RJ e SP em uma unica tela" },
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
                  <item.icon className="h-5 w-5 text-[#f97316]" />
                  <p className="mt-5 text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
                </div>
              ))}

              <div className="flex flex-col gap-2 rounded-[24px] border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Sessao
                </p>
                <p className="text-sm font-semibold text-white">
                  {user?.role === "operacional" ? "Equipe operacional" : "Acesso"}
                </p>
                <button
                  type="button"
                  onClick={logout}
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
          <div className="flex items-center gap-2 self-start rounded-[22px] border border-white/10 bg-white/5 p-2">
            <button
              type="button"
              onClick={() => setActiveTab("fila")}
              className={
                activeTab === "fila"
                  ? "rounded-[18px] bg-white/10 px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-[18px] px-4 py-2 text-sm text-slate-300 transition hover:text-white"
              }
            >
              Fila
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ranking")}
              className={
                activeTab === "ranking"
                  ? "rounded-[18px] bg-white/10 px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-[18px] px-4 py-2 text-sm text-slate-300 transition hover:text-white"
              }
            >
              Ranking
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("historico")}
              className={
                activeTab === "historico"
                  ? "rounded-[18px] bg-white/10 px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-[18px] px-4 py-2 text-sm text-slate-300 transition hover:text-white"
              }
            >
              Historico
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-[24px] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {activeTab === "ranking" ? (
          <div className="mt-6">
            <AnalystRanking />
          </div>
        ) : activeTab === "historico" ? (
          <div className="mt-6">
            <AnalystHistory />
          </div>
        ) : (
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
                />
              </div>

              <QueueFilters filters={filters} onChange={changeFilters} />
              <QueueList
                records={filteredQueue}
                loading={loading}
                syncing={syncing}
                onRemove={removeRecord}
                onAssign={handleAssign}
              />
            </section>

            <aside className="xl:sticky xl:top-6 xl:self-start">
              <div className="alx-card mb-6 rounded-[32px] border border-white/10 p-6 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.32em] text-[#38bdf8]">
                  Operacao
                </p>
                <h3 className="mt-3 text-xl font-semibold text-white">Analista</h3>
                <input
                  value={analystName}
                  onChange={(event) => setAnalystName(event.target.value)}
                  placeholder="Digite seu nome (analista)"
                  className="alx-field mt-5 w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#38bdf8]/60"
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
                onSubmit={createRecord}
              />
            </aside>
          </div>
        )}

        <footer className="mt-10 rounded-[32px] border border-white/10 bg-black/20 px-6 py-5 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-white">ALX Filas</p>
              <p className="mt-1 text-sm text-slate-400">
                Direitos reservados por TWINEX TECH.
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
