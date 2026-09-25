import { useState } from "react";
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  Pencil,
  Power,
  Users,
} from "lucide-react";
import type { Company, CompanyUser } from "@/types/company";
import { ANALYST_USERS } from "@/types/auth";

const ALX_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

type Props = {
  company: Company;
  users?: CompanyUser[];
  isALXLegacy?: boolean;
  onEdit: (c: Company) => void;
  onToggleActive: (id: string) => void;
  onManageUsers: (c: Company) => void;
};

function CopyButton({ href, label }: { href: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const full = `${window.location.origin}${href}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copie o link:", full);
    }
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="flex min-w-0 flex-col">
      <span className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
      <span className="truncate text-xs text-white">{href}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => window.open(full, "_blank", "noopener,noreferrer")}
          title="Abrir em nova aba"
          className="grid h-7 w-7 place-items-center rounded-xl rounded-xl border border-white/10 text-slate-300 hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={copy}
          title="Copiar link completo"
          className="grid h-7 w-7 place-items-center rounded-xl border border-white/10 text-slate-300 hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[#22c55e]" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

export function CompanyCard({
  company,
  users,
  isALXLegacy,
  onEdit,
  onToggleActive,
  onManageUsers,
}: Props) {
  const isAlx = isALXLegacy || company.id === ALX_COMPANY_ID;
  const userCount = users?.length ?? 0;
  const displayedCount = isAlx ? ANALYST_USERS.length : userCount;
  return (
    <div
      className="alx-card rounded-[32px] border border-white/10 p-6 backdrop-blur"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.name}
              className="h-14 w-14 rounded-2xl border border-white/10 bg-white/5 object-contain p-1"
            />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#2563eb] to-[#f97316] text-white">
              <Building2 className="h-7 w-7" />
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold text-white">{company.name}</h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 px-3 py-0.5 text-[10px] uppercase tracking-[0.22em] ${
                  company.is_active
                    ? "border-[#22c55e]/30 bg-[#22c55e]/10 text-[#bbf7d0]"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-200"
                }`}
              >
                {company.is_active ? "Ativa" : "Inativa"}
              </span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.22em] text-slate-300">
                /{company.slug}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Usuarios: {displayedCount} / {company.max_users} ·{" "}
              {isAlx ? (
                <span className="text-[#fbbf24]">(Fluxo legado hardcoded · 8 analistas ALX</span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEdit(company)}
            className="grid h-9 w-9 place-items-center rounded-xl rounded-2xl border border-white/10 bg-white/5 text-slate-200 hover:text-white"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onToggleActive(company.id)}
            className={`grid h-9 w-9 place-items-center rounded-2xl border text-white ${
              company.is_active
                ? "border-[#22c55e]/30 bg-[#22c55e]/10 hover:bg-[#22c55e]/20"
                : "border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20"
            }`}
            title={company.is_active ? "Desativar" : "Ativar"}
          >
            <Power className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onManageUsers(company)}
            className="inline-flex h-9 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200 hover:text-white"
            title="Gerenciar usuarios"
            disabled={isAlx}
          >
            <Users className="h-4 w-4" />
            Usuarios
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Fila", on: company.enable_fila },
          { label: "Ranking", on: company.enable_ranking },
          { label: "Historico", on: company.enable_historico },
          { label: "Portal Entregador", on: company.enable_entregador_portal },
        ].map((f) => (
          <div
            key={f.label}
            className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-xs ${
              f.on
                ? "border-[#22c55e]/30 bg-[#22c55e]/10 text-[#bbf7d0]"
                : "border-white/10 bg-white/5 text-slate-400"
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`h-5 w-5 rounded-md border ${
                f.on ? "border-[#22c55e] bg-[#22c55e] text-[#0f172a]" : "border-white/10"
              } grid place-items-center text-[10px] font-bold`}
            >
              {f.on ? "✓" : ""}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-slate-400" />
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Links da empresa
          </p>
        </div>
        <CopyButton label="Login equipe" href={`/c/${company.slug}/login`} />
        <CopyButton label="Painel equipe" href={`/c/${company.slug}/`} />
        <CopyButton label="Portal entregador" href={`/c/${company.slug}/entregador`} />
      </div>

      {company.allowed_hotzones.length > 0 ? (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-400">
            Pracas permitidas
          </p>
          <div className="flex flex-wrap gap-2">
            {company.allowed_hotzones.map((hz) => (
              <span
                key={hz}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
              >
                {hz}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
