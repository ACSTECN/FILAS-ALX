import { useState } from "react";
import type { CompanyUser, CompanyUserUpsertValues } from "@/types/company";

type Props = {
  initial?: CompanyUser | null;
  submitting: boolean;
  onSubmit: (values: CompanyUserUpsertValues) => Promise<void> | void;
  onCancel?: () => void;
  requirePassword?: boolean;
};

export function CompanyUserForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
  requirePassword = true,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [initials, setInitials] = useState(initial?.initials ?? "");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const payload: CompanyUserUpsertValues = {
          name,
          initials: initials.toUpperCase().slice(0, 3) || name.toUpperCase().slice(0, 2),
          is_active: isActive,
        };
        if (password) payload.password = password;
        if (requirePassword && !initial && !password) {
          alert("Senha obrigatoria para novo usuario.");
          return;
        }
        await onSubmit(payload);
      }}
      className="space-y-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block space-y-2 text-sm text-slate-300 sm:col-span-2">
          <span>Nome completo</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none focus:border-[#a78bfa]/60"
          />
        </label>
        <label className="block space-y-2 text-sm text-slate-300">
          <span>Iniciais (ate 3)</span>
          <input
            value={initials}
            onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 3))}
            maxLength={3}
            className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none focus:border-[#a78bfa]/60"
          />
        </label>
      </div>

      <label className="block space-y-2 text-sm text-slate-300">
        <span>Senha {initial ? "(deixe em branco para manter)" : ""}</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none focus:border-[#a78bfa]/60"
        />
      </label>

      <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Usuario ativo</p>
          <p className="text-xs text-slate-400">Desative para bloquear login.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`h-6 w-11 rounded-full border border-white/10 transition ${
            isActive ? "bg-gradient-to-r from-[#22c55e] to-[#38bdf8]" : "bg-white/10"
          }`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white shadow transition ${
              isActive ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#a78bfa] to-[#2563eb] px-5 py-3 text-sm font-semibold text-white shadow transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "Salvando..." : initial ? "Salvar alteracoes" : "Cadastrar usuario"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-200 hover:text-white"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
