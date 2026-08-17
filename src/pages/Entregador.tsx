import { FormEvent, useMemo, useState } from "react";
import { CalendarCheck, LoaderCircle, LogOut, User } from "lucide-react";
import { hotzonesByCity, shiftOptions } from "@/data/hotzones";
import { useAuthStore } from "@/store/authStore";
import { useQueueStore } from "@/store/queueStore";
import type { City, Hotzone, QueueFormValues, Shift } from "@/types/queue";
import { formatCPF, isValidCPF, normalizeCPF } from "@/types/auth";

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

export default function EntregadorPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const cpf = user?.identifier ?? "";

  const queue = useQueueStore((state) => state.queue);
  const loading = useQueueStore((state) => state.loading);
  const syncing = useQueueStore((state) => state.syncing);
  const error = useQueueStore((state) => state.error);
  const loadEntregadorQueue = useQueueStore((state) => state.loadEntregadorQueue);
  const createRecord = useQueueStore((state) => state.createRecord);

  const [cidade, setCidade] = useState<City>("Rio de Janeiro");
  const [hotzone, setHotzone] = useState<Hotzone>(hotzonesByCity["Rio de Janeiro"][0]);
  const [turno, setTurno] = useState<Shift>("Flexível");
  const [dataFila, setDataFila] = useState(() => new Date().toISOString().slice(0, 10));
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const cityHotzones = useMemo(() => hotzonesByCity[cidade], [cidade]);

  void loadEntregadorQueue;

  const registros = useMemo(() => [...queue].sort((a, b) => b.criado_em.localeCompare(a.criado_em)), [queue]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!isValidCPF(cpf)) {
      setFormError("CPF invalido para agendar interesse.");
      return;
    }

    if (!nome.trim()) {
      setFormError("Informe seu nome para agendar.");
      return;
    }

    const payload: QueueFormValues = {
      origem: "entregador",
      tipo: "ENTREGADOR",
      codigo_pessoa: null,
      cpf: normalizeCPF(cpf),
      nome: nome.trim(),
      cidade,
      hotzone,
      turno_desejado: turno,
      data_fila: dataFila,
      entregador_contato: contato.trim() || null,
    };

    await createRecord(payload);

    if (useQueueStore.getState().error) {
      setFormError(useQueueStore.getState().error);
      return;
    }

    setNome("");
    setContato("");
    setFormSuccess("Interesse de agenda registrado. A equipe ira acompanhar.");
    await loadEntregadorQueue(cpf);
  };

  const pending = registros.filter((item) => item.status.startsWith("na_fila_"));
  const concluidos = registros.filter((item) => !item.status.startsWith("na_fila_"));

  return (
    <main className="min-h-screen bg-[#020617] pb-20 pt-12 text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[420px] w-[420px] rounded-full bg-[#f97316]/15 blur-3xl" />
        <div className="absolute right-10 top-24 h-[340px] w-[340px] rounded-full bg-[#2563eb]/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[32px] border border-white/10 bg-white/5 px-6 py-5 backdrop-blur">
          <div className="flex flex-wrap items-center gap-4">
            <img
              src="/logofilas.png"
              alt="ALX Filas"
              className="h-16 w-auto rounded-[20px] border border-white/10 bg-black/30 p-2.5 shadow-[0_18px_70px_rgba(0,0,0,0.45)]"
            />
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[#ffedd5]">
                <User className="h-3.5 w-3.5" />
                Perfil entregador
              </span>
              <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
                Meu interesse de agenda
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-7 text-slate-300">
                Escolha data, cidade, hotzone e turno. Quando abrir agenda, sua solicitacao
                ja aparece para a equipe.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-200">
              CPF: {formatCPF(cpf)}
            </span>
            <button
              type="button"
              onClick={() => {
                logout();
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <form
            onSubmit={handleSubmit}
            className="alx-card rounded-[32px] border border-white/10 p-6 shadow-[0_24px_90px_rgba(2,6,23,0.48)] backdrop-blur"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-[#f97316]">
                  Interesse de agenda
                </p>
                <h3 className="mt-3 text-2xl font-semibold">Cadastrar data de interesse</h3>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#38bdf8]/30 bg-[#38bdf8]/10 px-3 py-1 text-xs text-[#e0f2fe]">
                <CalendarCheck className="h-3.5 w-3.5" />
                Somente para entregadores
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
                    setHotzone(hotzonesByCity[next][0]);
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
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span>Turno desejado</span>
                <select
                  value={turno}
                  onChange={(event) => setTurno(event.target.value as Shift)}
                  className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none"
                >
                  {shiftOptions.map((item) => (
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

            {error ? (
              <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={syncing || loading}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f97316] via-[#fb923c] to-[#2563eb] px-5 py-4 text-sm font-semibold text-slate-950 shadow-[0_20px_60px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {syncing ? (
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
          </form>

          <div className="space-y-6">
            <div className="alx-card rounded-[32px] border border-white/10 p-6 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">Interesses aguardando</h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Registros em aberto que a equipe operacional analisa.
                  </p>
                </div>
                <span className="rounded-full border border-[#38bdf8]/30 bg-[#38bdf8]/10 px-4 py-2 text-sm text-[#e0f2fe]">
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
                      className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.nome}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.cidade} · {item.hotzone} · {item.turno_desejado}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#38bdf8]/30 bg-[#38bdf8]/10 px-3 py-1 text-xs text-[#e0f2fe]">
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-3">
                        <span>Data: {item.data_fila}</span>
                        <span>Tipo: {tipoLabel(item.tipo)}</span>
                        <span>CPF: {item.cpf ? formatCPF(item.cpf) : "-"}</span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="alx-card rounded-[32px] border border-white/10 p-6 backdrop-blur">
              <h3 className="text-xl font-semibold">Historico</h3>
              <p className="mt-2 text-sm text-slate-300">
                Atribuidas ou retiradas pela operacao.
              </p>

              <div className="mt-5 space-y-4">
                {concluidos.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-slate-400">
                    Nao ha historico para este CPF ainda.
                  </p>
                ) : (
                  concluidos.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{item.nome}</p>
                        <span
                          className={
                            item.status.startsWith("atribuido_")
                              ? "inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100"
                              : "inline-flex items-center gap-2 rounded-full border border-slate-400/30 bg-slate-400/10 px-3 py-1 text-xs text-slate-200"
                          }
                        >
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-slate-400">
                        {item.cidade} · {item.hotzone} · {item.turno_desejado} · {item.data_fila}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
