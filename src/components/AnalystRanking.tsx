import { useCallback, useEffect, useMemo, useState } from "react";
import { Crown, Sparkles, UsersRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { City } from "@/types/queue";
import type { UnifiedItemKind } from "@/types/unified";
import { ANALYST_USERS, type AnalystUser } from "@/types/auth";

type RankingRow = {
  analista: string;
  total: number;
  initials: string;
  analystId: string;
};

function colorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }

  return {
    a: `hsl(${hash} 85% 60%)`,
    b: `hsl(${(hash + 40) % 360} 85% 55%)`,
  };
}

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

function buildRankingRows(counts: Map<string, number>): RankingRow[] {
  const normalized = new Map<string, number>();
  for (const [name, value] of counts.entries()) {
    const key = name.toLowerCase();
    normalized.set(key, (normalized.get(key) ?? 0) + value);
  }

  const rows = ANALYST_USERS.map((analyst: AnalystUser) => {
    const total = normalized.get(analyst.name.toLowerCase()) ?? 0;
    return {
      analista: analyst.name,
      initials: analyst.initials,
      analystId: analyst.id,
      total,
    };
  });

  for (const [name, total] of normalized.entries()) {
    const exists = ANALYST_USERS.some((item) => item.name.toLowerCase() === name);
    if (!exists) {
      rows.push({
        analista: name,
        initials: name.slice(0, 1).toUpperCase() || "?",
        analystId: `ext-${name}`,
        total,
      });
    }
  }

  return rows.sort((a, b) => b.total - a.total || a.analista.localeCompare(b.analista));
}

const STATUS_TODOS = ["atribuido_fila", "atribuido_tpr", "atribuido_entregador"] as const;

export function AnalystRanking() {
  const [city, setCity] = useState<City | "Todas">("Todas");
  const [kind, setKind] = useState<UnifiedItemKind | "Todas">("Todas");
  const [month, setMonth] = useState(() => new Date().toLocaleDateString("en-CA").slice(5, 7));
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [day, setDay] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<RankingRow[]>(() => buildRankingRows(new Map()));

  const loadRanking = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!supabase) {
      setRows(buildRankingRows(new Map()));
      setLoading(false);
      setError("Supabase nao configurado neste deploy.");
      return;
    }

    const dateFilter = buildDateFilter(year, month, day);

    const statusList =
      kind === "FILA"
        ? ["atribuido_fila"]
        : kind === "TPR"
        ? ["atribuido_tpr"]
        : kind === "ENTREGADOR"
        ? ["atribuido_entregador"]
        : STATUS_TODOS;

    let query = supabase
      .from("fila_registros")
      .select("analista")
      .not("analista", "is", null)
      .in("status", statusList);

    if (city !== "Todas") {
      query = query.eq("cidade", city);
    }

    if (dateFilter.type === "range") {
      query = query.gte("data_fila", dateFilter.start).lt("data_fila", dateFilter.end);
    } else if (dateFilter.type === "year") {
      query = query.gte("data_fila", `${dateFilter.value}-01-01`).lt("data_fila", `${Number(dateFilter.value) + 1}-01-01`);
    } else if (dateFilter.type === "eq") {
      query = query.eq("data_fila", dateFilter.value);
    }

    const { data, error } = await query;

    if (error) {
      setLoading(false);
      setError("Nao foi possivel carregar o ranking.");
      return;
    }

    const counts = new Map<string, number>();
    (data ?? []).forEach((item) => {
      const name = String(item.analista ?? "").trim();
      if (!name) {
        return;
      }
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });

    setRows(buildRankingRows(counts));
    setLoading(false);
  }, [city, kind, month, year, day]);

  useEffect(() => {
    void loadRanking();
  }, [loadRanking]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel("fila-registros-ranking")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fila_registros" },
        () => {
          void loadRanking();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadRanking]);

  const totalAtribuidos = useMemo(
    () => rows.reduce((sum, row) => sum + row.total, 0),
    [rows],
  );

  const top3 = rows.slice(0, 3);
  const topValue = top3[0]?.total ?? 0;

  return (
    <section className="space-y-6">
      <div className="alx-card rounded-[32px] border border-white/10 p-6 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
              Ranking
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Analistas com mais entregadores atribuidos
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              FILA / TPR contam para quem registrou a entrada; Entregador conta para quem
              atribuir o interesse.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <select
              value={city}
              onChange={(event) => setCity(event.target.value as City | "Todas")}
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
              onChange={(event) => setKind(event.target.value as UnifiedItemKind | "Todas")}
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
            <div className="grid grid-cols-2 gap-3">
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
      </div>

      {error ? (
        <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="alx-card rounded-[28px] border border-white/10 p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-300">Total atribuidos</p>
                <UsersRound className="h-5 w-5 text-[#38bdf8]" />
              </div>
              <p className="mt-5 text-3xl font-semibold text-white">{totalAtribuidos}</p>
              <p className="mt-2 text-sm text-slate-400">No periodo selecionado</p>
            </div>

            <div className="alx-card rounded-[28px] border border-white/10 p-5 backdrop-blur lg:col-span-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-300">Top 3</p>
                <Sparkles className="h-5 w-5 text-[#f97316]" />
              </div>
              <p className="mt-5 text-2xl font-semibold text-white">
                {top3.some((row) => row.total > 0)
                  ? "Podio de atribuicoes"
                  : "Sem dados"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {top3.some((row) => row.total > 0)
                  ? "Os 3 analistas mais ativos no periodo."
                  : "Ainda nao houve atribuicoes"}
              </p>
            </div>
          </div>

          <div className="alx-card relative overflow-hidden rounded-[36px] border border-white/10 p-6 backdrop-blur">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Podio
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Top 3 analistas
                </p>
              </div>
              <Crown className="h-6 w-6 text-[#f59e0b]" />
            </div>

            <div className="absolute left-[-120px] top-[-120px] h-[340px] w-[340px] rounded-full bg-[#38bdf8]/15 blur-3xl" />
            <div className="absolute right-[-120px] top-[40px] h-[360px] w-[360px] rounded-full bg-[#f97316]/12 blur-3xl" />
            <div className="absolute bottom-[-140px] left-[20%] h-[420px] w-[420px] rounded-full bg-[#a78bfa]/10 blur-3xl" />

            {loading ? (
              <div className="flex min-h-[420px] items-center justify-center text-slate-300">
                Carregando ranking...
              </div>
            ) : !top3.some((row) => row.total > 0) ? (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 p-8 text-center">
                <p className="text-lg font-medium text-white">Sem atribuicoes</p>
                <p className="mt-2 text-sm text-slate-400">
                  Assim que voce usar “Atribuir”, o ranking aparece aqui.
                </p>
              </div>
            ) : (
              <div className="relative min-h-[420px]">
                <div className="absolute inset-x-0 top-10 mx-auto h-[320px] w-[320px]">
                  <div
                    className="alx-rotate-slow absolute inset-0 rounded-full opacity-70"
                    style={{
                      background:
                        "conic-gradient(from 90deg, rgba(56,189,248,0.0), rgba(56,189,248,0.55), rgba(249,115,22,0.55), rgba(56,189,248,0.0))",
                      filter: "blur(0px)",
                    }}
                  />
                  <div className="alx-pulse absolute inset-8 rounded-full border border-white/10 bg-white/5" />
                  <div className="absolute inset-12 rounded-full border border-white/10 bg-[#020617]/40 backdrop-blur" />
                </div>

                {(() => {
                  const first = top3[0] as RankingRow;
                  const second = top3[1] as RankingRow | undefined;
                  const third = top3[2] as RankingRow | undefined;

                  const firstAvatar = colorFromName(first.analista);
                  const secondAvatar = second ? colorFromName(second.analista) : null;
                  const thirdAvatar = third ? colorFromName(third.analista) : null;

                  return (
                    <div className="relative z-10 mx-auto flex max-w-4xl items-end justify-center gap-6 pt-6">
                      {second ? (
                        <div
                          className="alx-float-slow w-[260px] rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_rgba(2,6,23,0.55)]"
                          style={{
                            backgroundImage:
                              "radial-gradient(circle at 30% 10%, rgba(56,189,248,0.28), transparent 55%), linear-gradient(180deg, rgba(7,17,31,0.92), rgba(2,6,23,0.92))",
                            transform: "perspective(1000px) rotateY(10deg)",
                            animationDelay: "0.6s",
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white">
                              #2
                            </span>
                            <span className="text-xs uppercase tracking-[0.22em] text-slate-400">
                              Prata
                            </span>
                          </div>

                          <div className="mt-6 flex items-center gap-4">
                            <div
                              className="grid h-16 w-16 place-items-center rounded-full border border-white/10 text-lg font-bold text-white shadow-[0_18px_70px_rgba(0,0,0,0.35)]"
                              style={{
                                backgroundImage: secondAvatar
                                  ? `linear-gradient(135deg, ${secondAvatar.a}, ${secondAvatar.b})`
                                  : "linear-gradient(135deg, #38bdf8, #a78bfa)",
                              }}
                            >
                              {second.initials}
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-white uppercase tracking-wide">
                                {second.analista}
                              </p>
                              <p className="mt-1 text-sm text-slate-400">Analista</p>
                            </div>
                          </div>

                          <div className="mt-6">
                            <p className="text-3xl font-semibold text-white">{second.total}</p>
                            <p className="mt-1 text-sm text-slate-400">Atribuicoes</p>
                          </div>
                        </div>
                      ) : (
                        <div className="hidden w-[260px] xl:block" />
                      )}

                      <div
                        className="alx-float w-[300px] rounded-[38px] border border-white/10 bg-white/5 p-7 shadow-[0_40px_160px_rgba(2,6,23,0.62)]"
                        style={{
                          backgroundImage:
                            "radial-gradient(circle at 50% 10%, rgba(245,158,11,0.33), transparent 60%), radial-gradient(circle at 70% 90%, rgba(249,115,22,0.22), transparent 58%), linear-gradient(180deg, rgba(7,17,31,0.94), rgba(2,6,23,0.92))",
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white">
                            #1
                          </span>
                          <Crown className="h-5 w-5 text-[#f59e0b]" />
                        </div>

                        <div className="mt-7 flex items-center gap-4">
                          <div
                            className="relative grid h-20 w-20 place-items-center rounded-full border border-white/10 text-xl font-bold text-white shadow-[0_22px_90px_rgba(0,0,0,0.42)]"
                            style={{
                              backgroundImage: `linear-gradient(135deg, ${firstAvatar.a}, ${firstAvatar.b})`,
                            }}
                          >
                            <div className="alx-pulse absolute -inset-2 rounded-full border border-[#f59e0b]/25" />
                            <span className="relative z-10">{first.initials}</span>
                          </div>
                          <div>
                            <p className="text-xl font-semibold text-white uppercase tracking-wide">
                              {first.analista}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">Analista</p>
                          </div>
                        </div>

                        <div className="mt-7">
                          <p className="text-4xl font-semibold text-white">{first.total}</p>
                          <p className="mt-1 text-sm text-slate-400">Atribuicoes</p>
                        </div>
                      </div>

                      {third ? (
                        <div
                          className="alx-float-slow w-[260px] rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_rgba(2,6,23,0.55)]"
                          style={{
                            backgroundImage:
                              "radial-gradient(circle at 30% 10%, rgba(249,115,22,0.26), transparent 55%), linear-gradient(180deg, rgba(7,17,31,0.92), rgba(2,6,23,0.92))",
                            transform: "perspective(1000px) rotateY(-10deg)",
                            animationDelay: "1.1s",
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white">
                              #3
                            </span>
                            <span className="text-xs uppercase tracking-[0.22em] text-slate-400">
                              Bronze
                            </span>
                          </div>

                          <div className="mt-6 flex items-center gap-4">
                            <div
                              className="grid h-16 w-16 place-items-center rounded-full border border-white/10 text-lg font-bold text-white shadow-[0_18px_70px_rgba(0,0,0,0.35)]"
                              style={{
                                backgroundImage: thirdAvatar
                                  ? `linear-gradient(135deg, ${thirdAvatar.a}, ${thirdAvatar.b})`
                                  : "linear-gradient(135deg, #f97316, #22c55e)",
                              }}
                            >
                              {third.initials}
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-white uppercase tracking-wide">
                                {third.analista}
                              </p>
                              <p className="mt-1 text-sm text-slate-400">Analista</p>
                            </div>
                          </div>

                          <div className="mt-6">
                            <p className="text-3xl font-semibold text-white">{third.total}</p>
                            <p className="mt-1 text-sm text-slate-400">Atribuicoes</p>
                          </div>
                        </div>
                      ) : (
                        <div className="hidden w-[260px] xl:block" />
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        <div className="alx-card rounded-[32px] border border-white/10 p-6 backdrop-blur">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Ranking completo</p>
            <p className="text-sm text-slate-400">
              {loading ? "Carregando..." : `${rows.length} analistas`}
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center text-slate-300">
              Carregando...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-6 text-center text-slate-300">
              Sem dados para os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row, idx) => {
                const percentage = topValue > 0 ? (row.total / topValue) * 100 : 0;
                const avatar = colorFromName(row.analista);
                return (
                  <div
                    key={row.analystId}
                    className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-sm font-bold text-white" style={{ backgroundImage: `linear-gradient(135deg, ${avatar.a}, ${avatar.b})` }}>
                          {row.initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white uppercase tracking-wide">
                            {row.analista}
                          </p>
                          <p className="text-xs text-slate-400">Analista</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-white">#{idx + 1}</p>
                        <p className="text-xs text-slate-400">
                          {row.total} · {topValue > 0 ? Math.round(percentage) : 0}% do top
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full transition-[width] duration-700"
                        style={{
                          width: `${percentage}%`,
                          backgroundImage: `linear-gradient(90deg, ${avatar.a}, ${avatar.b})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
