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
  const [dataFila, setDataFila] = useState(() => new Date().toISOString().slice(0, 10));

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
      data_fila: dataFila,
    });

    setCodigo("");
    setNome("");
    setTurno("Flexível");
    setDataFila(new Date().toISOString().slice(0, 10));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="alx-card rounded-[32px] border border-white/10 p-6 shadow-[0_24px_90px_rgba(2,6,23,0.48)] backdrop-blur"
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
            className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#2563eb]/60"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>Nome</span>
          <input
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Digite seu nome"
            className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#2563eb]/60"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>Cidade</span>
          <select
            value={activeCity}
            disabled
            className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none"
          >
            <option className="bg-slate-950 text-white">{activeCity}</option>
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>Hotzone</span>
          <select
            value={selectedHotzone}
            disabled
            className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none"
          >
            {cityHotzones.map((hotzone) => (
              <option key={hotzone} className="bg-slate-950 text-white">
                {hotzone}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>Turno desejado</span>
          <select
            value={turno}
            onChange={(event) => setTurno(event.target.value as Shift)}
            className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition focus:border-[#2563eb]/60"
          >
            {shiftOptions.map((shift) => (
              <option key={shift} className="bg-slate-950 text-white">
                {shift}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>Data da fila</span>
          <input
            type="date"
            value={dataFila}
            onChange={(event) => setDataFila(event.target.value)}
            className="alx-field w-full rounded-2xl border border-white/10 px-4 py-3 text-white outline-none transition focus:border-[#2563eb]/60"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={syncing}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] via-[#38bdf8] to-[#f97316] px-5 py-4 text-sm font-semibold text-slate-950 shadow-[0_20px_60px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
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
