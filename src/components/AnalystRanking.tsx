import { useEffect, useMemo, useState } from "react";
import { Crown, Sparkles, UsersRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

type RankingRow = {
  analista: string;
  total: number;
};

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  const letters = parts.map((part) => part.slice(0, 1).toUpperCase()).join("");
  return letters || name.trim().slice(0, 2).toUpperCase() || "?";
}

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

function getMonthRange(year: string, month: string) {
  if (month === "all") {
    return null;
  }

  const start = `${year}-${month}-01`;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  const end = endDate.toLocaleDateString("en-CA");

  return { start, end };
}

export function AnalystRanking() {
  const [month, setMonth] = useState(() => new Date().toLocaleDateString("en-CA").slice(5, 7));
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<RankingRow[]>([]);

  const loadRanking = async () => {
    setLoading(true);
    setError(null);

    if (!supabase) {
      setRows([]);
      setLoading(false);
      setError("Supabase nao configurado neste deploy.");
      return;
    }

    const range = getMonthRange(year, month);

    let query = supabase
      .from("fila_registros")
      .select("analista,data_fila")
      .eq("status", "atribuido")
      .not("analista", "is", null);

    if (range) {
      query = query.gte("data_fila", range.start).lt("data_fila", range.end);
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

    const nextRows = Array.from(counts.entries())
      .map(([analista, total]) => ({ analista, total }))
      .sort((a, b) => b.total - a.total || a.analista.localeCompare(b.analista));

    setRows(nextRows);
    setLoading(false);
  };

  useEffect(() => {
    void loadRanking();
  }, [month, year]);

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
  }, [month, year]);

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
              Analistas com mais atribuicoes
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Conta quantos entregadores foram marcados como atribuidos.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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
                {top3.length ? "Podio de atribuicoes" : "Sem dados"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {top3.length ? "Os 3 analistas mais ativos no periodo." : "Ainda nao houve atribuicoes"}
              </p>
            </div>
          </div>

          <div className="alx-card rounded-[32px] border border-white/10 p-6 backdrop-blur">
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

            {loading ? (
              <div className="flex min-h-[240px] items-center justify-center text-slate-300">
                Carregando ranking...
              </div>
            ) : top3.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 p-8 text-center">
                <p className="text-lg font-medium text-white">Sem atribuicoes</p>
                <p className="mt-2 text-sm text-slate-400">
                  Assim que voce usar “Atribuir”, o ranking aparece aqui.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-3">
                {[top3[1], top3[0], top3[2]].filter(Boolean).map((item, idx) => {
                  const row = item as RankingRow;
                  const rank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
                  const palette =
                    rank === 1
                      ? { a: "#f59e0b", b: "#fb7185" }
                      : rank === 2
                        ? { a: "#38bdf8", b: "#a78bfa" }
                        : { a: "#f97316", b: "#22c55e" };

                  const bg = {
                    backgroundImage: `radial-gradient(circle at 30% 20%, ${palette.a}33, transparent 55%), radial-gradient(circle at 75% 80%, ${palette.b}2b, transparent 55%), linear-gradient(180deg, rgba(7,17,31,0.92), rgba(2,6,23,0.92))`,
                  } as const;

                  const avatar = colorFromName(row.analista);

                  return (
                    <div
                      key={row.analista}
                      style={bg}
                      className={[
                        "rounded-[30px] border border-white/10 p-6 shadow-[0_22px_90px_rgba(2,6,23,0.42)]",
                        rank === 1 ? "md:-translate-y-3" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between">
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white">
                          #{rank}
                        </span>
                        {rank === 1 ? (
                          <Crown className="h-5 w-5 text-[#f59e0b]" />
                        ) : (
                          <span className="text-xs uppercase tracking-[0.22em] text-slate-400">
                            Top
                          </span>
                        )}
                      </div>

                      <div className="mt-6 flex items-center gap-4">
                        <div
                          className="grid h-16 w-16 place-items-center rounded-full border border-white/10 text-lg font-bold text-white shadow-[0_18px_70px_rgba(0,0,0,0.35)]"
                          style={{
                            backgroundImage: `linear-gradient(135deg, ${avatar.a}, ${avatar.b})`,
                          }}
                        >
                          {initials(row.analista)}
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-white">{row.analista}</p>
                          <p className="mt-1 text-sm text-slate-400">Analista</p>
                        </div>
                      </div>

                      <div className="mt-6">
                        <p className="text-3xl font-semibold text-white">{row.total}</p>
                        <p className="mt-1 text-sm text-slate-400">Atribuicoes</p>
                      </div>
                    </div>
                  );
                })}
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
            <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 p-8 text-center">
              <p className="text-lg font-medium text-white">Sem atribuicoes</p>
              <p className="mt-2 text-sm text-slate-400">
                Assim que voce usar “Atribuir”, o ranking aparece aqui.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {rows.map((row, index) => {
                const progress = topValue ? Math.round((row.total / topValue) * 100) : 0;
                const avatar = colorFromName(row.analista);

                return (
                  <div
                    key={row.analista}
                    className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-sm font-semibold text-white">
                          {index + 1}
                        </span>
                        <div
                          className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-xs font-bold text-white"
                          style={{
                            backgroundImage: `linear-gradient(135deg, ${avatar.a}, ${avatar.b})`,
                          }}
                        >
                          {initials(row.analista)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{row.analista}</p>
                          <p className="mt-1 text-xs text-slate-400">Analista</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-white">{row.total}</p>
                        <p className="mt-1 text-xs text-slate-400">{progress}% do top</p>
                      </div>
                    </div>

                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2563eb] via-[#38bdf8] to-[#f97316]"
                        style={{ width: `${Math.min(100, progress)}%` }}
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
