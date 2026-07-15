import { create } from "zustand";
import { canUseLocalFallback, supabase } from "@/lib/supabase";
import { getTodayKey, isExpiredQueueDate } from "@/lib/format";
import type { QueueFilters, QueueFormValues, QueueRecord } from "@/types/queue";

const LOCAL_STORAGE_KEY = "alx-entregas-fila";

const defaultFilters: QueueFilters = {
  cidade: "Todas",
  hotzone: "Todas",
  turno_desejado: "Todos",
  data_fila: "Todas",
};

type QueueStore = {
  queue: QueueRecord[];
  filters: QueueFilters;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  setFilters: (filters: Partial<QueueFilters>) => void;
  loadQueue: () => Promise<void>;
  createRecord: (values: QueueFormValues) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
  replaceQueue: (records: QueueRecord[]) => void;
};

function readLocalQueue() {
  if (typeof window === "undefined") {
    return [] as QueueRecord[];
  }

  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    return [] as QueueRecord[];
  }

  try {
    const parsed = JSON.parse(raw) as QueueRecord[];
    return parsed.sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  } catch {
    return [] as QueueRecord[];
  }
}

function writeLocalQueue(records: QueueRecord[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  }
}

function normalizeQueue(records: QueueRecord[]) {
  return [...records]
    .map((record) => ({
      ...record,
      data_fila: record.data_fila ?? record.criado_em.slice(0, 10),
    }))
    .filter((record) => !isExpiredQueueDate(record.data_fila))
    .sort((a, b) => a.criado_em.localeCompare(b.criado_em));
}

export const useQueueStore = create<QueueStore>((set) => ({
  queue: [],
  filters: defaultFilters,
  loading: true,
  syncing: false,
  error: null,
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  loadQueue: async () => {
    set({ loading: true, error: null });

    if (supabase) {
      const todayKey = getTodayKey();

      // Limpa automaticamente registros vencidos assim que o painel abre.
      await supabase.from("fila_registros").delete().lt("data_fila", todayKey);

      const { data, error } = await supabase
        .from("fila_registros")
        .select("*")
        .gte("data_fila", todayKey)
        .order("criado_em", { ascending: true });

      if (error) {
        set({ loading: false, error: "Nao foi possivel carregar a fila." });
        return;
      }

      set({
        queue: normalizeQueue((data ?? []) as QueueRecord[]),
        loading: false,
        error: null,
      });
      return;
    }

    if (!canUseLocalFallback) {
      set({
        queue: [],
        loading: false,
        error: "Supabase nao conectado neste deploy. Configure a URL e a anon key na Vercel.",
      });
      return;
    }

    const localQueue = readLocalQueue();
    writeLocalQueue(localQueue);
    set({ queue: localQueue, loading: false, error: null });
  },
  createRecord: async (values) => {
    set({ syncing: true, error: null });

    if (supabase) {
      const { error } = await supabase.from("fila_registros").insert(values as never);

      if (error) {
        set({ syncing: false, error: "Nao foi possivel entrar na fila." });
        return;
      }

      await useQueueStore.getState().loadQueue();
      set({ syncing: false });
      return;
    }

    if (!canUseLocalFallback) {
      set({
        syncing: false,
        error: "Nao foi possivel entrar na fila sem Supabase configurado no deploy.",
      });
      return;
    }

    const nextRecord: QueueRecord = {
      id: crypto.randomUUID(),
      ...values,
      criado_em: new Date().toISOString(),
    };
    const nextQueue = normalizeQueue([...useQueueStore.getState().queue, nextRecord]);

    writeLocalQueue(nextQueue);
    set({ queue: nextQueue, syncing: false });
  },
  removeRecord: async (id) => {
    set({ syncing: true, error: null });

    if (supabase) {
      const { error } = await supabase.from("fila_registros").delete().eq("id", id);

      if (error) {
        set({ syncing: false, error: "Nao foi possivel retirar da fila." });
        return;
      }

      await useQueueStore.getState().loadQueue();
      set({ syncing: false });
      return;
    }

    if (!canUseLocalFallback) {
      set({
        syncing: false,
        error: "Nao foi possivel retirar da fila sem Supabase configurado no deploy.",
      });
      return;
    }

    const nextQueue = useQueueStore.getState().queue.filter((record) => record.id !== id);
    writeLocalQueue(nextQueue);
    set({ queue: nextQueue, syncing: false });
  },
  replaceQueue: (records) =>
    set({
      queue: normalizeQueue(records),
      loading: false,
      error: null,
    }),
}));

export { LOCAL_STORAGE_KEY };
