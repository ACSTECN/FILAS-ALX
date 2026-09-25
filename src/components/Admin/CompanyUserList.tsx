import { Pencil, Power } from "lucide-react";
import type { CompanyUser } from "@/types/company";

type Props = {
  users: CompanyUser[];
  loading?: boolean;
  onEdit: (u: CompanyUser) => void;
  onToggleActive: (id: string) => void;
};

function colorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  return {
    a: `hsl(${hash} 85% 60%)`,
    b: `hsl(${(hash + 40) % 360} 85% 55%)`,
  };
}

export function CompanyUserList({ users, loading, onEdit, onToggleActive }: Props) {
  if (loading) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/5 text-slate-300">
        Carregando usuarios...
      </div>
    );
  }
  if (users.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-8 text-center text-slate-300">
        Nenhum usuario cadastrado nesta empresa.
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {users.map((u) => {
        const avatar = colorFromName(u.name);
        return (
          <div
            key={u.id}
            className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 text-sm font-bold text-white"
                  style={{ backgroundImage: `linear-gradient(135deg, ${avatar.a}, ${avatar.b})` }}
                >
                  {u.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{u.name}</p>
                  <p className="text-xs text-slate-400">
                    {u.is_active ? "Ativo" : "Inativo"} · criado em{" "}
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(u)}
                  className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:text-white"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleActive(u.id)}
                  className={`grid h-8 w-8 place-items-center rounded-xl border text-white ${
                    u.is_active
                      ? "border-[#22c55e]/30 bg-[#22c55e]/10 hover:bg-[#22c55e]/20"
                      : "border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20"
                  }`}
                  title={u.is_active ? "Desativar" : "Ativar"}
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
