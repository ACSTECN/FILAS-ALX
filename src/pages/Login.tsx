import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { RadioTower, LogIn } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const loginError = useAuthStore((state) => state.loginError);
  const loginOperacional = useAuthStore((state) => state.loginOperacional);

  const [password, setPassword] = useState("");

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
    null;

  if (user?.role === "operacional") {
    return <Navigate to={from ?? "/"} replace />;
  }

  if (user?.role === "entregador") {
    return <Navigate to="/entregador" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ok = loginOperacional(password);
    if (!ok) return;
    navigate(from ?? "/", { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[420px] w-[420px] rounded-full bg-[#0f766e]/20 blur-3xl" />
        <div className="absolute right-10 top-24 h-[340px] w-[340px] rounded-full bg-[#2563eb]/25 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-[#f97316]/15 blur-3xl" />
      </div>

      <section className="mx-auto flex min-h-screen max-w-2xl items-center px-4 pb-10 pt-10 sm:px-6 lg:px-8">
        <div className="alx-panel alx-glow alx-sheen w-full rounded-[36px] border border-white/10 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <img
              src="/logofilas.png"
              alt="ALX Filas"
              className="h-20 w-auto rounded-[28px] border border-white/10 bg-black/30 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.45)] sm:h-24"
            />
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2563eb]/30 bg-[#2563eb]/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[#dbeafe]">
              <RadioTower className="h-4 w-4" />
              Acesso restrito a equipe
            </span>
          </div>

          <h1 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl">
            ALX Filas - Painel operacional
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Entrada exclusiva para a equipe de operacao. Entregadores utilizam o link
            separado.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
          >
            <input type="hidden" name="mode" value="operacional" />
            <label className="block space-y-2 text-sm text-slate-300">
              <span>Senha operacional</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite a senha da operacao"
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
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] via-[#38bdf8] to-[#f97316] px-5 py-4 text-sm font-semibold text-slate-950 shadow-[0_20px_60px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:brightness-110"
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
