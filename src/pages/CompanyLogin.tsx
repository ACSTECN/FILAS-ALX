import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { LogIn, LoaderCircle, RadioTower, ShieldAlert, UserRound } from "lucide-react";
import { useCompanyScoped } from "@/hooks/useCompanyScoped";
import { Building2 } from "lucide-react";

export default function CompanyLogin() {
  const { slug = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, error: companyErr, company, stores } = useCompanyScoped(slug);

  const authStore = stores?.auth.useCompanyAuthStore;
  const user = authStore ? authStore((s) => s.user) : null;
  const loginError = authStore ? authStore((s) => s.loginError) : null;
  const loginOperacional = authStore ? authStore((s) => s.loginOperacional) : null;

  const [analystName, setAnalystName] = useState<string>("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const usersList = useCompanyScoped(slug);
  const analysts = usersList.analystUsers;

  useEffect(() => {
    if (analysts.length > 0 && !analystName) {
      setAnalystName(analysts[0].name);
    }
  }, [analysts, analystName]);

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
    null;

  const homePath = useMemo(() => (slug ? `/c/${slug}/` : "/"), [slug]);
  const entregadorPath = useMemo(
    () => (slug ? `/c/${slug}/entregador` : "/entregador"),
    [slug],
  );

  if (user?.role === "operacional") {
    return <Navigate to={from ?? homePath} replace />;
  }
  if (user?.role === "entregador") {
    return <Navigate to={entregadorPath} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loginOperacional) return;
    setSubmitting(true);
    try {
      const ok = await loginOperacional(analystName, password);
      if (ok) navigate(from ?? homePath, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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

  if (!company || companyErr) {
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
                <p className="mt-2 text-sm text-slate-300">
                  {companyErr ||
                    "Nao foi possivel localizar esta empresa. Verifique o link ou contate o administrador."}
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/login", { replace: true })}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:text-white"
                >
                  Voltar para o painel da ALX
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const companyLogo = company.logo_url;
  const companyName = company.name;

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[420px] w-[420px] rounded-full bg-[#a78bfa]/20 blur-3xl" />
        <div className="absolute right-10 top-24 h-[340px] w-[340px] rounded-full bg-[#2563eb]/25 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-[#f97316]/15 blur-3xl" />
      </div>

      <section className="mx-auto flex min-h-screen max-w-2xl items-center px-4 pb-10 pt-10 sm:px-6 lg:px-8">
        <div className="alx-panel alx-glow alx-sheen w-full rounded-[36px] border border-white/10 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="h-20 w-auto rounded-[28px] border border-white/10 bg-black/30 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.45)] sm:h-24"
              />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-[28px] border border-white/10 bg-gradient-to-br from-[#2563eb] to-[#a78bfa] shadow-[0_18px_70px_rgba(0,0,0,0.45)] sm:h-24 sm:w-24">
                <Building2 className="h-9 w-9 text-white sm:h-11 sm:w-11" />
              </div>
            )}
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2563eb]/30 bg-[#2563eb]/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[#dbeafe]">
              <RadioTower className="h-4 w-4" />
              Acesso restrito a equipe
            </span>
          </div>

          <h1 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl">
            {companyName} - Painel operacional
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Entrada exclusiva para analistas da empresa {companyName}. Cada usuario
            acompanha suas proprias atribuicoes no ranking.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
          >
            <label className="block space-y-2 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <UserRound className="h-3.5 w-3.5 text-[#38bdf8]" />
                Analista
              </span>
              {analysts.length > 0 ? (
                <select
                  value={analystName}
                  onChange={(event) => setAnalystName(event.target.value)}
                  className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition focus:border-[#38bdf8]/60"
                >
                  <option value="" className="bg-slate-950 text-slate-300">
                    Selecione seu nome
                  </option>
                  {analysts.map((analyst) => (
                    <option
                      key={analyst.id}
                      value={analyst.name}
                      className="bg-slate-950 text-white"
                    >
                      {analyst.initials} · {analyst.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={analystName}
                  onChange={(event) => setAnalystName(event.target.value)}
                  placeholder="Digite seu nome de usuario"
                  className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#38bdf8]/60"
                />
              )}
            </label>

            <label className="block space-y-2 text-sm text-slate-300">
              <span>Senha</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha de analista"
                className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#38bdf8]/60"
              />
            </label>

            {loginError ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {loginError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] via-[#38bdf8] to-[#a78bfa] px-5 py-4 text-sm font-semibold text-slate-950 shadow-[0_20px_60px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Entrar como analista
                </>
              )}
            </button>

            {company.enable_entregador_portal ? (
              <button
                type="button"
                onClick={() => navigate(entregadorPath, { replace: true })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                Sou entregador · acessar portal
              </button>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
