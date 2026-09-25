import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { hotzonesByCity } from "@/data/hotzones";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
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

  const queueStore = stores?.queue ?? null;
  const authStore = stores?.auth.useCompanyAuthStore ?? null;

  const authUser = authStore ? authStore((s) => s.user) : null;
  const loginEntregador = authStore ? authStore((s) => s.loginEntregador) : null;
  const loginError = authStore ? authStore((s) => s.loginError) : null;

  const queue = queueStore ? queueStore((s) => s.queue) : [];
  const loading = queueStore ? queueStore((s) => s.loading) : true;
  const syncing = queueStore ? queueStore((s) => s.syncing) : false;
  const error = queueStore ? queueStore((s) => s.error) : null;
  const loadEntregadorQueue = queueStore
    ? queueStore((s) => s.loadEntregadorQueue)
    : null;
  const createRecord = queueStore ? queueStore((s) => s.createRecord) : null;

  const [cpf, setCpf] = useState("");
  const [cpfConfirmado, setCpfConfirmado] = useState<string | null>(
    authUser?.role === "entregador" ? authUser.identifier : null,
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
    if (cpfConfirmado && loadEntregadorQueue) {
      void loadEntregadorQueue(cpfConfirmado);
    }
  }, [cpfConfirmado, loadEntregadorQueue]);

  useEffect(() => {
    if (!company || !loadEntregadorQueue || !cpfConfirmado) return;
    if (!hasSupabaseConfig) return;
    if (!supabase) return;
    const suffix = company.id.slice(0, 8);
    const channel = supabase
      .channel(`fila-registros-entregador-${suffix}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fila_registros" },
        () => {
          void loadEntregadorQueue(cpfConfirmado);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [company, loadEntregadorQueue, cpfConfirmado]);

  const registros = useMemo(
    () =>
      [...queue]
        .filter((item) => item.cpf === cpfConfirmado)
        .sort((a, b) => b.criado_em.localeCompare(a.criado_em)),
    [cpfConfirmado, queue],
  );

  const pending = registros.filter((item) => item.status.startsWith("na_fila_"));
  const concluidos = registros.filter((item) => !item.status.startsWith("na_fila_"));

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

      if (loginEntregador) {
        const ok = loginEntregador(digits);
        if (!ok) {
          setFormError(loginError ?? "CPF invalido.");
          return;
        }
      }

      setCpfConfirmado(digits);
      if (loadEntregadorQueue) await loadEntregadorQueue(digits);
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

    if (createRecord) await createRecord(payload);

    if (queueStore && queueStore.getState().error) {
      setFormError(queueStore.getState().error);
      return;
    }

    setNome("");
    setContato("");
    setConfirmacaoOk(false);
    setFormSuccess("Interesse de agenda registrado. A equipe ira acompanhar.");
    if (cpfConfirmado && loadEntregadorQueue) {
      await loadEntregadorQueue(cpfConfirmado);
    }
  };

  if (scopedLoading || !company) {
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
                  O portal do entregador nao esta habilitado para {company.name} no momento.
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

  const companyName = company.name;
  const companyLogo = company.logo_url;

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
                  alt={companyName}
                  className="h-16 w-auto rounded-[20px] border border-white/10 bg-black/30 p-2.5 shadow-[0_18px_70px_rgba(0,0,0,0.45)]"
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-[20px] border border-white/10 bg-gradient-to-br from-[#f97316] to-[#a78bfa] p-2.5 shadow-[0_18px_70px_rgba(0,0,0,0.45)]">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
              )}
              <span className="inline-flex items-center gap-2 rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-[#ffedd5]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Area exclusiva do entregador · {companyName}
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
            interesse para a equipe {companyName}.
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
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f97316] via-[#fb923c] to-[#f97316] px-5 py-4 text-sm font-semibold text-slate-950 shadow-[0_20px_60px_rgba(249,115,22,0.3)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
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
                      na sua hotzone, a equipe {companyName} entrara em contato com voce
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
                        Tenho certeza do interesse informado e autorizo a equipe {companyName}
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

              {error ? (
                <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={syncing || loading || cityHotzones.length === 0}
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
                  authStore?.getState().logout?.();
                  navigate(`/c/${slug}/entregador`, { replace: true });
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
