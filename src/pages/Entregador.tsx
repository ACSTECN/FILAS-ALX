import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarCheck, LoaderCircle, ShieldCheck } from "lucide-react";
import { hotzonesByCity, shiftOptions } from "@/data/hotzones";
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
  const queue = useQueueStore((state) => state.queue);
  const loading = useQueueStore((state) => state.loading);
  const syncing = useQueueStore((state) => state.syncing);
  const error = useQueueStore((state) => state.error);
  const loadEntregadorQueue = useQueueStore((state) => state.loadEntregadorQueue);
  const createRecord = useQueueStore((state) => state.createRecord);

  const [cpf, setCpf] = useState("");
  const [cpfConfirmado, setCpfConfirmado] = useState<string | null>(null);
  const [cidade, setCidade] = useState<City>("Rio de Janeiro");
  const [hotzone, setHotzone] = useState<Hotzone>(hotzonesByCity["Rio de Janeiro"][0]);
  const [turno, setTurno] = useState<Shift>("Manhã");
  const [dataFila, setDataFila] = useState(() => new Date().toISOString().slice(0, 10));
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [confirmacaoOk, setConfirmacaoOk] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const cityHotzones = useMemo(() => hotzonesByCity[cidade], [cidade]);

  useEffect(() => {
    if (cpfConfirmado) {
      void loadEntregadorQueue(cpfConfirmado);
    }
  }, [cpfConfirmado, loadEntregadorQueue]);

  const registros = useMemo(
    () =>
      [...queue]
        .filter((item) => item.cpf === cpfConfirmado)
        .sort((a, b) => b.criado_em.localeCompare(a.criado_em)),
    [cpfConfirmado, queue],
  );

  const pending = registros.filter((item) => item.status.startsWith("na_fila_"));
  const concluidos = registros.filter((item) => !item.status.startsWith("na_fila_"));

  const handleIdentificar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const digits = normalizeCPF(cpf);
    if (!isValidCPF(digits)) {
      setFormError("Informe um CPF valido para continuar.");
      return;
    }

    setCpfConfirmado(digits);
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

    await createRecord(payload);

    if (useQueueStore.getState().error) {
      setFormError(useQueueStore.getState().error);
      return;
    }

    setNome("");
    setContato("");
    setConfirmacaoOk(false);
    setFormSuccess("Interesse de agenda registrado. A equipe ira acompanhar.");
    if (cpfConfirmado) {
      await loadEntregadorQueue(cpfConfirmado);
    }
  };

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
              <img
                src="/logofilas.png"
                alt="ALX Filas"
                className="h-16 w-auto rounded-[20px] border border-white/10 bg-black/30 p-2.5 shadow-[0_18px_70px_rgba(0,0,0,0.45)]"
              />
              <span className="inline-flex items-center gap-2 rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-[#ffedd5]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Area exclusiva do entregador
              </span>
            </div>
          </div>
          <h1 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl">
            Agende sua data de interesse.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Informe seu CPF para visualizar seus agendamentos e cadastrar novas datas de
            interesse para a equipe ALX.
          </p>
        </header>

        {cpfConfirmado ? (
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

              <div className="mt-6 rounded-[28px] border border-[#f59e0b]/25 bg-gradient-to-br from-[#f59e0b]/10 via-[#f97316]/10 to-transparent p-5">
                <div className="flex items-start gap-4">
                  <div className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-[#f59e0b]/20 text-[#f59e0b]">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="space-y-3 text-sm leading-7">
                    <p className="font-semibold text-[#fde68a]">
                      Atenção: precisamos de certeza sobre o seu interesse.
                    </p>
                    <p className="text-slate-200">
                      Ao cadastrar este interesse de agenda, você confirma que está de
                      acordo com a data e o turno informados. Caso surja uma oportunidade
                      na sua hotzone, a nossa equipe entrará em contato com você para
                      confirmar e seguir com o atendimento.
                    </p>
                    <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-slate-200">
                      <input
                        type="checkbox"
                        checked={confirmacaoOk}
                        onChange={(event) => setConfirmacaoOk(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 text-[#f97316] focus:ring-[#f97316]"
                      />
                      <span>
                        Tenho certeza do interesse informado e autorizo a equipe ALX a
                        entrar em contato caso haja oportunidade nesta data.
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

              {error ? (
                <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={syncing || loading}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f97316] via-[#fb923c] to-[#f97316] px-5 py-4 text-sm font-semibold text-slate-950 shadow-[0_20px_60px_rgba(249,115,22,0.3)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
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

              <button
                type="button"
                onClick={() => {
                  setCpfConfirmado(null);
                  setCpf("");
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                Usar outro CPF
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
                        className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{item.nome}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {item.cidade} · {item.hotzone} · {item.turno_desejado}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-2 rounded-full border border-[#fb923c]/30 bg-[#fb923c]/10 px-3 py-1 text-xs text-[#fff7ed]">
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
                          {item.cidade} · {item.hotzone} · {item.turno_desejado} ·{" "}
                          {item.data_fila}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="alx-card mt-8 rounded-[32px] border border-white/10 p-6 backdrop-blur sm:p-8">
            <div className="grid gap-8 md:grid-cols-[1.05fr_0.95fr] md:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-[#fb923c]">
                  Acesso rapido
                </p>
                <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
                  Digite seu CPF para entrar no painel do entregador.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                  Essa tela é 100% voltada para entregadores. Com seu CPF você cadastra
                  interesses de agenda e acompanha seu proprio historico.
                </p>
              </div>

              <form
                onSubmit={handleIdentificar}
                className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
              >
                <label className="block space-y-2 text-sm text-slate-300">
                  <span>CPF</span>
                  <input
                    value={cpf}
                    onChange={(event) => setCpf(formatCPF(normalizeCPF(event.target.value)))}
                    placeholder="Digite seu CPF"
                    className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#fb923c]/60"
                  />
                </label>

                {formError ? (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {formError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f97316] via-[#fb923c] to-[#f97316] px-5 py-4 text-sm font-semibold text-slate-950 shadow-[0_20px_60px_rgba(249,115,22,0.3)] transition hover:-translate-y-0.5 hover:brightness-110"
                >
                  Continuar
                  <CalendarCheck className="h-4 w-4" />
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
