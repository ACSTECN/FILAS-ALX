import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { hotzonesByCity, shiftOptions } from "@/data/hotzones";
import type { City, Hotzone, QueueFormValues, Shift } from "@/types/queue";

type QueueFormProps = {
  activeCity: City;
  selectedHotzone: Hotzone;
  syncing: boolean;
  onSubmit: (values: QueueFormValues) => Promise<void>;
};

export function QueueForm({
  activeCity,
  selectedHotzone,
  syncing,
  onSubmit,
}: QueueFormProps) {
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [turno, setTurno] = useState<Shift>("Flexível");

  const cityHotzones = useMemo(() => hotzonesByCity[activeCity], [activeCity]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!codigo.trim() || !nome.trim()) {
      return;
    }

    await onSubmit({
      codigo_pessoa: codigo.trim(),
      nome: nome.trim(),
      cidade: activeCity,
      hotzone: selectedHotzone,
      turno_desejado: turno,
    });

    setCodigo("");
    setNome("");
    setTurno("Flexível");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[32px] border border-white/10 bg-[#07111f]/90 p-6 shadow-[0_24px_90px_rgba(2,6,23,0.45)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-[#f97316]">
            Cadastro rapido
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Entrar na fila</h3>
        </div>
        <span className="rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-3 py-1 text-xs text-[#ffedd5]">
          Hotzone atual: {selectedHotzone}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          <span>ID</span>
          <input
            value={codigo}
            onChange={(event) => setCodigo(event.target.value)}
            placeholder="Digite seu identificador"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#f97316]/60"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>Nome</span>
          <input
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Digite seu nome"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#f97316]/60"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>Cidade</span>
          <select
            value={activeCity}
            disabled
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          >
            <option>{activeCity}</option>
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>Hotzone</span>
          <select
            value={selectedHotzone}
            disabled
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          >
            {cityHotzones.map((hotzone) => (
              <option key={hotzone}>{hotzone}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>Turno desejado</span>
          <select
            value={turno}
            onChange={(event) => setTurno(event.target.value as Shift)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#f97316]/60"
          >
            {shiftOptions.map((shift) => (
              <option key={shift}>{shift}</option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={syncing}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f97316] px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-[#fb923c] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {syncing ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Enviando para a fila
          </>
        ) : (
          <>
            Entrar agora
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
