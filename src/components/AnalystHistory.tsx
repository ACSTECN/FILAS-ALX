import { useCallback, useEffect, useMemo, useState } from "react";
import { History, MapPin, UsersRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { City, QueueRecord } from "@/types/queue";
import type { UnifiedItemKind } from "@/types/unified";
import { ANALYST_USERS, formatCPF } from "@/types/auth";

type CityFilter = City | "Todas";
type KindFilter = UnifiedItemKind | "Todas";

function monthOptions() {
  return [
    { value: "all", label: "Todos" },
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Marco" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];
}

function yearOptions() {
  const current = new Date().getFullYear();
  return [current - 1, current, current + 1].map((value) => String(value));
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildDateFilter(year: string, month: string, day: string) {
  if (day !== "all") {
    return { type: "eq", value: day } as const;
  }

  if (month === "all") {
    return { type: "year", value: year } as const;
  }

  const start = `${year}-${month}-01`;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  const end = endDate.toLocaleDateString("en-CA");

  return { type: "range", start, end } as const;
}

function tipoLabel(tipo: string) {
  if (tipo === "ENTREGADOR") return "Entregador";
  if (tipo === "TPR") return "TPR";
  return "Fila";
}

function statusLabel(status: string) {
  if (status.startsWith("atribuido_")) return "Atribuido";
  if (status.startsWith("retirado_")) return "Retirado";
  if (status.startsWith("na_fila_")) return "Na fila";
  return status;
}

function origemLabel(origem: string) {
  return origem === "entregador" ? "Entregador" : "Equipe";
}

function sortByLatest(list: QueueRecord[]) {
  return [...list].sort((a, b) => {
    const aDate = a.criado_em;
    const bDate = b.criado_em;
    return bDate.localeCompare(aDate);
  });
}

export function AnalystHistory() {
  const user = useAuthStore((state) => state.user);
  const today = new Date();
  const [city, setCity] = useState<CityFilter>("Todas");
  const [kind, setKind] = useState<KindFilter>("Todas");
  const [month, setMonth] = useState<string>("all");
  const [year, setYear] = useState(() => String(today.getFullYear()));
  const [day, setDay] = useState<string>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<QueueRecord[]>([]);

  const selectedAnalyst = useMemo(
    () => ANALYST_USERS.find((item) => item.id === user?.analystId) ?? null,
    [user],
  );

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!supabase) {
      setRows([]);
      setLoading(false);
      setError("Supabase nao configurado neste deploy.");
      return;
    }

    if (!selectedAnalyst) {
      setRows([]);
      setLoading(false);
      setError("Voce precisa estar logado como analista para ver o historico.");
      return;
    }

    const dateFilter = buildDateFilter(year, month, day);

    let query = supabase
      .from("fila_registros")
      .select("*")
      .eq("analista", selectedAnalyst.name)
      .in("status", [
        "atribuido_fila",
        "atribuido_tpr",
        "atribuido_entregador",
        "retirado_fila",
        "retirado_tpr",
        "retirado_entregador",
      ]);

    if (city !== "Todas") {
      query = query.eq("cidade", city);
    }

    if (kind === "FILA") {
      query = query.in("status", ["atribuido_fila", "retirado_fila"]);
    } else if (kind === "TPR") {
      query = query.in("status", ["atribuido_tpr", "retirado_tpr"]);
    } else if (kind === "ENTREGADOR") {
      query = query.in("status", ["atribuido_entregador", "retirado_entregador"]);
    }

    if (dateFilter.type === "range") {
      query = query.gte("data_fila", dateFilter.start).lt("data_fila", dateFilter.end);
    } else if (dateFilter.type === "year") {
      query = query.gte("data_fila", `${dateFilter.value}-01-01`).lt("data_fila", `${Number(dateFilter.value) + 1}-01-01`);
    } else if (dateFilter.type === "eq") {
      query = query.eq("data_fila", dateFilter.value);
    }

    const { data, error } = await query.order("criado_em", { ascending: false });

    if (error) {
      setLoading(false);
      setError("Nao foi possivel carregar o historico.");
      return;
    }

    setRows(sortByLatest((data ?? []) as QueueRecord[]));
    setLoading(false);
  }, [selectedAnalyst, city, kind, month, year, day]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel("fila-registros-history")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fila_registros" },
        () => {
          void loadHistory();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadHistory]);

  const totalRegistros = rows.length;
  const totalAtribuidos = rows.filter((item) => item.status.startsWith("atribuido_")).length;
  const totalRetirados = rows.filter((item) => item.status.startsWith("retirado_")).length;

  return (
    <section className="space-y-6">
      <div className="alx-card rounded-[32px] border border-white/10 p-6 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
              Historico
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Meu historico de atribuicoes
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {selectedAnalyst
                ? `${selectedAnalyst.name} · Somente os seus registros aparecem aqui.`
                : "Historico pessoal por analista."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <select
              value={city}
              onChange={(event) => setCity(event.target.value as CityFilter)}
              className="alx-field rounded-2xl border border-white/10 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="Todas" className="bg-slate-950 text-white">
                Todas
              </option>
              <option value="Rio de Janeiro" className="bg-slate-950 text-white">
                Rio de Janeiro
              </option>
              <option value="São Paulo" className="bg-slate-950 text-white">
                São Paulo
              </option>
            </select>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as KindFilter)}
              className="alx-field rounded-2xl border border-white/10 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="Todas" className="bg-slate-950 text-white">
                Todos os tipos
              </option>
              <option value="FILA" className="bg-slate-950 text-white">
                Fila
              </option>
              <option value="TPR" className="bg-slate-950 text-white">
                TPR
              </option>
              <option value="ENTREGADOR" className="bg-slate-950 text-white">
                Entregador
              </option>
            </select>
            <select
              value={day}
              onChange={(event) => setDay(event.target.value)}
              className="alx-field rounded-2xl border border-white/10 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="all" className="bg-slate-950 text-white">
                Todos os dias
              </option>
              <option value={todayISO()} className="bg-slate-950 text-white">
                Hoje
              </option>
              <optgroup label="Datas filtradas" className="bg-slate-950 text-white">
                <option value={todayISO()} className="bg-slate-950 text-white">
                  {new Date().toLocaleDateString("pt-BR")}
                </option>
              </optgroup>
            </select>
            <input
              type="date"
              value={day === "all" ? "" : day}
              onChange={(event) => {
                setDay(event.target.value || "all");
              }}
              className="alx-field rounded-2xl border border-white/10 px-4 py-3 text-sm text-white outline-none [color-scheme:dark]"
            />
            <select
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="alx-field rounded-2xl border border-white/10 px-4 py-3 text-sm text-white outline-none"
            >
              {monthOptions().map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-950 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="alx-field rounded-2xl border border-white/10 px-4 py-3 text-sm text-white outline-none"
            >
              {yearOptions().map((value) => (
                <option key={value} value={value} className="bg-slate-950 text-white">
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="alx-card rounded-[28px] border border-white/10 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-300">Total no periodo</p>
            <History className="h-5 w-5 text-[#38bdf8]" />
          </div>
          <p className="mt-5 text-3xl font-semibold text-white">{totalRegistros}</p>
          <p className="mt-2 text-sm text-slate-400">
            {selectedAnalyst ? selectedAnalyst.name : "Analista"}
          </p>
        </div>

        <div className="alx-card rounded-[28px] border border-white/10 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-300">Atribuidos</p>
            <UsersRound className="h-5 w-5 text-[#22c55e]" />
          </div>
          <p className="mt-5 text-3xl font-semibold text-white">{totalAtribuidos}</p>
          <p className="mt-2 text-sm text-slate-400">Status atual como Atribuido</p>
        </div>

        <div className="alx-card rounded-[28px] border border-white/10 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-300">Retirados / concluidos</p>
            <MapPin className="h-5 w-5 text-[#f97316]" />
          </div>
          <p className="mt-5 text-3xl font-semibold text-white">{totalRetirados}</p>
          <p className="mt-2 text-sm text-slate-400">Status atual como Retirado</p>
        </div>
      </div>

      <div className="alx-card rounded-[32px] border border-white/10 p-6 backdrop-blur">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Meus registros</p>
          <p className="text-sm text-slate-400">
            {loading ? "Carregando..." : `${rows.length} registros`}
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center text-slate-300">
            Carregando historico...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 p-8 text-center">
            <p className="text-lg font-medium text-white">Sem registros</p>
            <p className="mt-2 text-sm text-slate-400">
              Ainda nao houve atribuicoes nos filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((item) => (
              <article
                key={item.id}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-white uppercase tracking-wide">
                      {item.nome}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.cpf ? `CPF ${formatCPF(item.cpf)} · ` : ""}
                      {origemLabel(item.origem)} · {tipoLabel(item.tipo)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#38bdf8]/30 bg-[#38bdf8]/10 px-3 py-1 text-xs text-[#e0f2fe]">
                      {item.cidade}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                      {item.hotzone}
                    </span>
                    <span className="rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-3 py-1 text-xs text-[#ffedd5]">
                      {item.turno_desejado}
                    </span>
                    <span className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1 text-xs text-[#dcfce7]">
                      {statusLabel(item.status)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Data fila
                    </p>
                    <p className="mt-1 text-white">{item.data_fila}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Codigo pessoa
                    </p>
                    <p className="mt-1 text-white">{item.codigo_pessoa ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Criado em
                    </p>
                    <p className="mt-1 text-white">
                      {new Date(item.criado_em).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
