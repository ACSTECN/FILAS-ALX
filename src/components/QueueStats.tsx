import { Activity, Building2, UsersRound } from "lucide-react";
import type { City, QueueRecord } from "@/types/queue";

type QueueStatsProps = {
  activeCity: City;
  queue: QueueRecord[];
};

export function QueueStats({ activeCity, queue }: QueueStatsProps) {
  const cityQueue = queue.filter((record) => record.cidade === activeCity);
  const busiestHotzone =
    cityQueue.reduce<{ name: string; count: number } | null>((top, record) => {
      const count = cityQueue.filter((item) => item.hotzone === record.hotzone).length;

      if (!top || count > top.count) {
        return { name: record.hotzone, count };
      }
      return top;
    }, null) ?? { name: "Sem fila", count: 0 };

  const cards = [
    {
      label: "Fila total",
      value: queue.length,
      detail: "Todos os participantes ativos",
      icon: UsersRound,
    },
    {
      label: activeCity,
      value: cityQueue.length,
      detail: "Pessoas aguardando nesta cidade",
      icon: Building2,
    },
    {
      label: "Mais movimentada",
      value: busiestHotzone.name,
      detail: `${busiestHotzone.count} registros no momento`,
      icon: Activity,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(2,6,23,0.35)] backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-300">{card.label}</p>
            <card.icon className="h-5 w-5 text-[#2563eb]" />
          </div>
          <p className="mt-5 text-3xl font-semibold text-white">{card.value}</p>
          <p className="mt-2 text-sm text-slate-400">{card.detail}</p>
        </article>
      ))}
    </div>
  );
}
