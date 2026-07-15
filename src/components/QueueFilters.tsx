import { Filter } from "lucide-react";
import { hotzonesByCity, shiftOptions } from "@/data/hotzones";
import type { QueueFilters as QueueFiltersType } from "@/types/queue";

type QueueFiltersProps = {
  filters: QueueFiltersType;
  onChange: (filters: Partial<QueueFiltersType>) => void;
};

export function QueueFilters({ filters, onChange }: QueueFiltersProps) {
  const allHotzones = Array.from(
    new Set([...hotzonesByCity["Rio de Janeiro"], ...hotzonesByCity["São Paulo"]]),
  );

  return (
    <div className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-white/5 p-5 lg:flex-row lg:items-center">
      <div className="flex items-center gap-3 text-sm font-medium text-white">
        <Filter className="h-4 w-4 text-[#f97316]" />
        Filtros da fila
      </div>

      <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <select
          value={filters.cidade}
          onChange={(event) =>
            onChange({
              cidade: event.target.value as QueueFiltersType["cidade"],
              hotzone: "Todas",
            })
          }
          className="alx-field rounded-2xl border border-white/10 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="Todas" className="bg-slate-950 text-white">Todas as cidades</option>
          <option value="Rio de Janeiro" className="bg-slate-950 text-white">Rio de Janeiro</option>
          <option value="São Paulo" className="bg-slate-950 text-white">São Paulo</option>
        </select>

        <select
          value={filters.hotzone}
          onChange={(event) =>
            onChange({ hotzone: event.target.value as QueueFiltersType["hotzone"] })
          }
          className="alx-field rounded-2xl border border-white/10 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="Todas" className="bg-slate-950 text-white">Todas as hotzones</option>
          {allHotzones
            .filter((hotzone) =>
              filters.cidade === "Todas"
                ? true
                : hotzonesByCity[filters.cidade].includes(hotzone),
            )
            .map((hotzone) => (
              <option key={hotzone} value={hotzone} className="bg-slate-950 text-white">
                {hotzone}
              </option>
            ))}
        </select>

        <select
          value={filters.turno_desejado}
          onChange={(event) =>
            onChange({
              turno_desejado: event.target.value as QueueFiltersType["turno_desejado"],
            })
          }
          className="alx-field rounded-2xl border border-white/10 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="Todos" className="bg-slate-950 text-white">Todos os turnos</option>
          {shiftOptions.map((shift) => (
            <option key={shift} value={shift} className="bg-slate-950 text-white">
              {shift}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            value={filters.data_fila === "Todas" ? "" : filters.data_fila}
            onChange={(event) =>
              onChange({
                data_fila: event.target.value || "Todas",
              })
            }
            className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white outline-none"
          />
          <button
            type="button"
            onClick={() => onChange({ data_fila: "Todas" })}
            className="alx-field rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
}
