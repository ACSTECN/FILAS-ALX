import { LoaderCircle, Trash2 } from "lucide-react";
import { formatClock, formatDate, formatDateTime, formatPosition } from "@/lib/format";
import type { QueueRecord } from "@/types/queue";

type QueueListProps = {
  records: QueueRecord[];
  loading: boolean;
  syncing: boolean;
  onRemove: (id: string) => Promise<void>;
};

export function QueueList({
  records,
  loading,
  syncing,
  onRemove,
}: QueueListProps) {
  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-[32px] border border-white/10 bg-white/5">
        <div className="flex items-center gap-3 text-slate-300">
          <LoaderCircle className="h-5 w-5 animate-spin text-[#f97316]" />
          Carregando fila ao vivo...
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="rounded-[32px] border border-dashed border-white/10 bg-white/5 p-8 text-center">
        <p className="text-lg font-medium text-white">Fila vazia no momento</p>
        <p className="mt-2 text-sm text-slate-400">
          O primeiro cadastro aparece aqui assim que entrar na lista.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {records.map((record, index) => (
        <article
          key={record.id}
          className="grid gap-4 rounded-[28px] border border-white/10 bg-[#07111f]/90 p-5 lg:grid-cols-[88px_1.4fr_1fr_160px]"
        >
          <div className="flex items-center gap-4 lg:block">
            <span className="inline-flex rounded-2xl bg-[#f97316]/15 px-4 py-3 text-2xl font-semibold text-[#ffedd5]">
              {formatPosition(index)}
            </span>
            <div className="lg:mt-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Entrada
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                {formatClock(record.criado_em)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-lg font-semibold text-white">{record.nome}</p>
            <p className="mt-1 text-sm text-slate-300">ID: {record.codigo_pessoa}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">
              Hotzone
            </p>
            <p className="mt-1 text-sm text-slate-200">
              {record.cidade} · {record.hotzone}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              Turno desejado
            </p>
            <p className="mt-1 text-sm text-slate-200">{record.turno_desejado}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-slate-500">
              Data da fila
            </p>
            <p className="mt-1 text-sm text-slate-200">{formatDate(record.data_fila)}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-slate-500">
              Registrado em
            </p>
            <p className="mt-1 text-sm text-slate-400">{formatDateTime(record.criado_em)}</p>
          </div>

          <div className="flex items-center justify-start lg:justify-end">
            <button
              type="button"
              disabled={syncing}
              onClick={() => onRemove(record.id)}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20 hover:shadow-[0_18px_60px_rgba(244,63,94,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Retirar da fila
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
