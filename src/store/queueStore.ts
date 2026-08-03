import { create } from "zustand";
import { canUseLocalFallback, supabase } from "@/lib/supabase";
import { getTodayKey, isExpiredQueueDate } from "@/lib/format";
import type { QueueFilters, QueueFormValues, QueueRecord } from "@/types/queue";

const LOCAL_STORAGE_KEY = "alx-entregas-fila";
const ANALYST_STORAGE_KEY = "alx-entregas-analista";

const defaultFilters: QueueFilters = {
  cidade: "Todas",
  hotzone: "Todas",
  turno_desejado: "Todos",
  data_fila: "Todas",
};

type QueueStore = {
  queue: QueueRecord[];
  filters: QueueFilters;
  analystName: string;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  setFilters: (filters: Partial<QueueFilters>) => void;
  setAnalystName: (value: string) => void;
  loadQueue: () => Promise<void>;
  createRecord: (values: QueueFormValues) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
  assignRecord: (id: string) => Promise<void>;
  replaceQueue: (records: QueueRecord[]) => void;
};

function readLocalAnalyst() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(ANALYST_STORAGE_KEY) ?? "";
}

function writeLocalAnalyst(value: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ANALYST_STORAGE_KEY, value);
  }
}

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

function normalizeStatus(
  status: QueueRecord["status"] | string | null | undefined,
): QueueRecord["status"] {
  if (status === "na_fila") {
    return "na_fila_fila";
  }

  if (status === "atribuido") {
    return "atribuido_fila";
  }

  if (status === "retirado") {
    return "retirado_fila";
  }

  if (
    status === "na_fila_fila" ||
    status === "na_fila_tpr" ||
    status === "atribuido_fila" ||
    status === "atribuido_tpr" ||
    status === "retirado_fila" ||
    status === "retirado_tpr"
  ) {
    return status;
  }

  return "na_fila_fila";
}

function isQueueStatus(status: QueueRecord["status"] | string | null | undefined) {
  const normalized = normalizeStatus(status);
  return normalized === "na_fila_fila" || normalized === "na_fila_tpr";
}

function isTprStatus(status: QueueRecord["status"] | string | null | undefined) {
  return normalizeStatus(status).endsWith("_tpr");
}

function normalizeQueue(records: QueueRecord[]) {
  return [...records]
    .map((record) => ({
      ...record,
      data_fila: record.data_fila ?? record.criado_em.slice(0, 10),
      status: normalizeStatus(record.status),
      analista: record.analista ?? null,
    }))
    .filter((record) => !isExpiredQueueDate(record.data_fila))
    .filter((record) => isQueueStatus(record.status))
    .sort((a, b) => a.criado_em.localeCompare(b.criado_em));
}

export const useQueueStore = create<QueueStore>((set) => ({
  queue: [],
  filters: defaultFilters,
  analystName: readLocalAnalyst(),
  loading: true,
  syncing: false,
  error: null,
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  setAnalystName: (value) => {
    const nextValue = value.trimStart();
    writeLocalAnalyst(nextValue);
    set({ analystName: nextValue });
  },
  loadQueue: async () => {
    set({ loading: true, error: null });

    if (supabase) {
      const todayKey = getTodayKey();

      const { data, error } = await supabase
        .from("fila_registros")
        .select("*")
        .gte("data_fila", todayKey)
        .in("status", ["na_fila_fila", "na_fila_tpr", "na_fila"])
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

    const analystName = useQueueStore.getState().analystName.trim();
    const { tipo_atribuicao, ...payload } = values;
    const status = tipo_atribuicao === "TPR" ? "na_fila_tpr" : "na_fila_fila";

    if (supabase) {
      const { error } = await supabase.from("fila_registros").insert({
        ...payload,
        status,
        analista: analystName ? analystName : null,
      } as never);

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
      ...payload,
      status,
      analista: analystName ? analystName : null,
      criado_em: new Date().toISOString(),
    };
    const nextQueue = normalizeQueue([...useQueueStore.getState().queue, nextRecord]);

    writeLocalQueue(nextQueue);
    set({ queue: nextQueue, syncing: false });
  },
  removeRecord: async (id) => {
    set({ syncing: true, error: null });

    if (supabase) {
      const current = useQueueStore.getState().queue.find((record) => record.id === id);
      const status = isTprStatus(current?.status) ? "retirado_tpr" : "retirado_fila";
      const analystName = useQueueStore.getState().analystName.trim();
      const { error } = await supabase
        .from("fila_registros")
        .update({
          status,
          analista: analystName ? analystName : null,
        } as never)
        .eq("id", id);

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

    const current = useQueueStore.getState().queue.find((record) => record.id === id);
    const status = isTprStatus(current?.status) ? "retirado_tpr" : "retirado_fila";
    const analystName = useQueueStore.getState().analystName.trim();
    const nextQueue = normalizeQueue(
      useQueueStore.getState().queue.map((record) =>
        record.id === id
          ? {
              ...record,
              status,
              analista: analystName ? analystName : null,
            }
          : record,
      ),
    );
    writeLocalQueue(nextQueue);
    set({ queue: nextQueue, syncing: false });
  },
  assignRecord: async (id) => {
    set({ syncing: true, error: null });

    if (supabase) {
      const current = useQueueStore.getState().queue.find((record) => record.id === id);
      const status = isTprStatus(current?.status) ? "atribuido_tpr" : "atribuido_fila";
      const { error } = await supabase
        .from("fila_registros")
        .update({ status } as never)
        .eq("id", id);

      if (error) {
        set({ syncing: false, error: "Nao foi possivel atribuir esse entregador." });
        return;
      }

      await useQueueStore.getState().loadQueue();
      set({ syncing: false });
      return;
    }

    if (!canUseLocalFallback) {
      set({
        syncing: false,
        error: "Nao foi possivel atribuir sem Supabase configurado no deploy.",
      });
      return;
    }

    const current = useQueueStore.getState().queue.find((record) => record.id === id);
    const status = isTprStatus(current?.status) ? "atribuido_tpr" : "atribuido_fila";
    const nextQueue = normalizeQueue(
      useQueueStore.getState().queue.map((record) =>
        record.id === id
          ? {
              ...record,
              status,
            }
          : record,
      ),
    );

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
