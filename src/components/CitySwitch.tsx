import type { City } from "@/types/queue";
import { cityOptions } from "@/data/hotzones";
import { cn } from "@/lib/utils";

type CitySwitchProps = {
  activeCity: City;
  onChange: (city: City) => void;
};

export function CitySwitch({ activeCity, onChange }: CitySwitchProps) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur">
      {cityOptions.map((city) => (
        <button
          key={city}
          type="button"
          onClick={() => onChange(city)}
          className={cn(
            "rounded-full px-5 py-2 text-sm font-medium transition",
            activeCity === city
              ? "bg-[#f97316] text-slate-950 shadow-[0_12px_30px_rgba(249,115,22,0.35)]"
              : "text-slate-300 hover:bg-white/5 hover:text-white",
          )}
        >
          {city}
        </button>
      ))}
    </div>
  );
}
