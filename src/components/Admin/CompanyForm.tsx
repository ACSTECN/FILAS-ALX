import { useState } from "react";
import type { Hotzone } from "@/types/queue";
import type { Company, CompanyUpsertValues } from "@/types/company";
import { cityOptions, hotzonesByCity } from "@/data/hotzones";

type Props = {
  initial?: Company | null;
  submitting: boolean;
  onSubmit: (values: CompanyUpsertValues) => Promise<void> | void;
  onCancel?: () => void;
};

const ALL_HOTZONES = hotzonesByCity[cityOptions[0]].concat(hotzonesByCity[cityOptions[1]]);

export function CompanyForm({ initial, submitting, onSubmit, onCancel }: Props) {
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [maxUsers, setMaxUsers] = useState(String(initial?.max_users ?? 5));
  const [enableFila, setEnableFila] = useState(initial?.enable_fila ?? true);
  const [enableRanking, setEnableRanking] = useState(initial?.enable_ranking ?? true);
  const [enableHistorico, setEnableHistorico] = useState(initial?.enable_historico ?? true);
  const [enableEntregador, setEnableEntregador] = useState(
    initial?.enable_entregador_portal ?? true,
  );
  const [allowedHotzones, setAllowedHotzones] = useState<Hotzone[]>(
    initial?.allowed_hotzones ?? [],
  );

  const toggleHotzone = (hz: Hotzone) => {
    setAllowedHotzones((prev) =>
      prev.includes(hz) ? prev.filter((x) => x !== hz) : [...prev, hz],
    );
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({
          slug,
          name,
          logo_url: logoUrl || null,
          is_active: isActive,
          max_users: Number(maxUsers) || 0,
          enable_fila: enableFila,
          enable_ranking: enableRanking,
          enable_historico: enableHistorico,
          enable_entregador_portal: enableEntregador,
          allowed_hotzones: allowedHotzones,
        });
      }}
      className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-sm text-slate-300">
          <span>Nome da empresa</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none focus:border-[#a78bfa]/60"
          />
        </label>
        <label className="block space-y-2 text-sm text-slate-300">
          <span>Slug (URL única) · letras / numeros / hifen</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            required
            className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none focus:border-[#a78bfa]/60"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-sm text-slate-300">
          <span>Logo URL (opcional)</span>
          <input
            value={logoUrl ?? ""}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none focus:border-[#a78bfa]/60"
          />
        </label>
        <label className="block space-y-2 text-sm text-slate-300">
          <span>Limite max. de usuarios (analistas)</span>
          <input
            type="number"
            min={0}
            value={maxUsers}
            onChange={(e) => setMaxUsers(e.target.value)}
            className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none focus:border-[#a78bfa]/60"
          />
        </label>
      </div>

      <div className="rounded-[20px] border border-white/10 bg-black/15 p-4">
        <p className="mb-3 text-xs uppercase tracking-[0.22em] text-slate-400">
          Features habilitadas
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Fila operacional", value: enableFila, set: setEnableFila },
            { label: "Ranking", value: enableRanking, set: setEnableRanking },
            { label: "Historico", value: enableHistorico, set: setEnableHistorico },
            { label: "Portal Entregador", value: enableEntregador, set: setEnableEntregador },
          ].map((f) => (
            <label
              key={f.label}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <span className="text-sm text-white">{f.label}</span>
              <button
                type="button"
                onClick={() => f.set(!f.value)}
                className={`h-6 w-11 rounded-full border border-white/10 transition ${
                  f.value
                    ? "bg-gradient-to-r from-[#22c55e] to-[#38bdf8]"
                    : "bg-white/10"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white shadow transition ${
                    f.value ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-[20px] border border-white/10 bg-black/15 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Pracas (hotzones) permitidas
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAllowedHotzones([...ALL_HOTZONES])}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setAllowedHotzones([])}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
            >
              Limpar
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cityOptions.map((city) => (
            <div key={city} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-500">{city}</p>
              <div className="space-y-2">
                {hotzonesByCity[city].map((hz) => {
                  const checked = allowedHotzones.includes(hz);
                  return (
                    <button
                      type="button"
                      key={hz}
                      onClick={() => toggleHotzone(hz)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                        checked
                          ? "border-[#38bdf8]/40 bg-[#38bdf8]/10 text-white"
                          : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span>{hz}</span>
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-md border text-[10px] font-bold ${
                          checked
                            ? "border-[#38bdf8] bg-[#38bdf8] text-[#0f172a]"
                            : "border-white/10"
                        }`}
                      >
                        {checked ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Empresa ativa</p>
          <p className="text-xs text-slate-400">
            Desative para bloquear login e portais dessa empresa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`h-6 w-11 rounded-full border border-white/10 transition ${
            isActive
              ? "bg-gradient-to-r from-[#22c55e] to-[#38bdf8]"
              : "bg-white/10"
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
          {submitting
            ? "Salvando..."
            : initial
              ? "Salvar alteracoes"
              : "Cadastrar empresa"}
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
