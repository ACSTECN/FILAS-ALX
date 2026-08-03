import { CheckCircle2, LoaderCircle, Trash2 } from "lucide-react";
import { formatClock, formatDate, formatDateTime, formatPosition } from "@/lib/format";
import type { QueueRecord } from "@/types/queue";

type QueueListProps = {
  records: QueueRecord[];
  loading: boolean;
  syncing: boolean;
  onRemove: (id: string) => Promise<void>;
  onAssign: (id: string) => Promise<void>;
};

export function QueueList({
  records,
  loading,
  syncing,
  onRemove,
  onAssign,
}: QueueListProps) {
  const statusLabel = (status: QueueRecord["status"]) => {
    const kind = status.endsWith("_tpr") ? "TPR" : "FILA";
    if (status.startsWith("atribuido")) {
      return `Atribuido ${kind}`;
    }
    if (status.startsWith("retirado")) {
      return `Retirado ${kind}`;
    }
    return `Na fila ${kind}`;
  };

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
          className="alx-card grid gap-4 rounded-[28px] border border-white/10 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.28)] lg:grid-cols-[88px_1.4fr_1fr_160px]"
        >
          <div className="flex items-center gap-4 lg:block">
            <span className="inline-flex rounded-2xl bg-gradient-to-br from-[#2563eb]/25 to-[#f97316]/20 px-4 py-3 text-2xl font-semibold text-white">
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
            <span className="mt-2 inline-flex rounded-full border border-[#38bdf8]/30 bg-[#0f172a] px-3 py-1 text-sm font-medium text-[#dbeafe] shadow-[0_10px_30px_rgba(15,23,42,0.35)]">
              {record.turno_desejado}
            </span>
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-slate-500">
              Status
            </p>
            {record.status.startsWith("atribuido") ? (
              <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
                {statusLabel(record.status)} · Registrado por: {record.analista ?? "-"}
              </span>
            ) : (
              <span className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-slate-200">
                {statusLabel(record.status)}
              </span>
            )}
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
            {record.status.startsWith("atribuido") ? (
              <span className="text-sm text-slate-400">Finalizado</span>
            ) : (
              <div className="flex flex-col gap-3 lg:items-end">
                <button
                  type="button"
                  disabled={syncing}
                  onClick={() => onAssign(record.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#38bdf8]/30 bg-[#38bdf8]/15 px-4 py-3 text-sm font-semibold text-[#e0f2fe] transition hover:bg-[#38bdf8]/20 hover:shadow-[0_18px_60px_rgba(56,189,248,0.15)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Atribuir
                </button>
                <button
                  type="button"
                  disabled={syncing}
                  onClick={() => onRemove(record.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20 hover:shadow-[0_18px_60px_rgba(244,63,94,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Retirar
                </button>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
