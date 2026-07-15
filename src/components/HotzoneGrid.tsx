import { MapPinned } from "lucide-react";
import { hotzonesByCity } from "@/data/hotzones";
import { cn } from "@/lib/utils";
import type { City, Hotzone, QueueRecord } from "@/types/queue";

type HotzoneGridProps = {
  city: City;
  selectedHotzone: Hotzone;
  queue: QueueRecord[];
  onSelect: (hotzone: Hotzone) => void;
};

export function HotzoneGrid({
  city,
  selectedHotzone,
  queue,
  onSelect,
}: HotzoneGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {hotzonesByCity[city].map((hotzone) => {
        const count = queue.filter((item) => item.hotzone === hotzone).length;
        const active = selectedHotzone === hotzone;

        return (
          <button
            key={hotzone}
            type="button"
            onClick={() => onSelect(hotzone)}
            className={cn(
              "group rounded-[28px] border p-5 text-left transition duration-300",
              active
                ? "border-[#f97316] bg-[#f97316]/15 shadow-[0_18px_70px_rgba(249,115,22,0.18)]"
                : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]",
            )}
          >
            <div className="mb-8 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  Hotzone
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{hotzone}</h3>
              </div>
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  active
                    ? "border-[#fdba74]/40 bg-[#fdba74]/20 text-[#ffedd5]"
                    : "border-white/10 bg-black/20 text-slate-300",
                )}
              >
                {count} na fila
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <MapPinned className="h-4 w-4 text-[#f97316]" />
              <span>Toque para usar esta regiao no cadastro.</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
