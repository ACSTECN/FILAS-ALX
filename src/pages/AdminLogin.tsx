import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LogIn, ShieldAlert } from "lucide-react";
import { usePlatformAuthStore } from "@/store/platformAuthStore";

export default function AdminLogin() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = usePlatformAuthStore((s) => s.user);
  const loginError = usePlatformAuthStore((s) => s.loginError);
  const loginPlatformAdmin = usePlatformAuthStore((s) => s.loginPlatformAdmin);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
    null;

  if (user?.role === "platform_admin") {
    return <Navigate to={from ?? "/admin"} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const ok = await loginPlatformAdmin(username, password);
    setSubmitting(false);
    if (ok) navigate(from ?? "/admin", { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[420px] w-[420px] rounded-full bg-[#a78bfa]/20 blur-3xl" />
        <div className="absolute right-10 top-24 h-[340px] w-[340px] rounded-full bg-[#f59e0b]/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-[#ef4444]/10 blur-3xl" />
      </div>

      <section className="mx-auto flex min-h-screen max-w-2xl items-center px-4 pb-10 pt-10 sm:px-6 lg:px-8">
        <div className="alx-panel alx-glow alx-sheen w-full rounded-[36px] border border-white/10 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-[28px] border border-white/10 bg-gradient-to-br from-[#2563eb] via-[#a78bfa] to-[#f59e0b] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.45)] sm:h-24 sm:w-24">
              <ShieldAlert className="h-10 w-10 text-white sm:h-12 sm:w-12" />
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#a78bfa]/30 bg-[#a78bfa]/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[#ddd6fe]">
              Acesso central
            </span>
          </div>

          <h1 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl">
            Painel Administrador · Plataforma
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Gerencie empresas, usuarios e configuracoes do sistema multi-tenant.
            Acesso exclusivo do dono da plataforma.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
          >
            <label className="block space-y-2 text-sm text-slate-300">
              <span>Usuario</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#a78bfa]/60"
              />
            </label>
            <label className="block space-y-2 text-sm text-slate-300">
              <span>Senha</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#a78bfa]/60"
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
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#a78bfa] via-[#2563eb] to-[#f59e0b] px-5 py-4 text-sm font-semibold text-slate-950 shadow-[0_20px_60px_rgba(124,58,237,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {submitting ? "Entrando..." : "Entrar como administrador"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
