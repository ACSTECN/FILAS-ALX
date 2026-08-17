import { create } from "zustand";
import { canUseLocalFallback, supabase } from "@/lib/supabase";
import { getTodayKey, isExpiredQueueDate } from "@/lib/format";
import type { QueueFilters, QueueFormValues, QueueRecord } from "@/types/queue";
import type { AuthUser } from "@/types/auth";

const LOCAL_STORAGE_KEY = "alx-entregas-fila";
const ANALYST_STORAGE_KEY = "alx-entregas-analista";
const AUTH_STORAGE_KEY = "alx-auth-session";

const defaultFilters: QueueFilters = {
  cidade: "Todas",
  hotzone: "Todas",
  turno_desejado: "Todos",
  data_fila: "Todas",
  origem: "Todas",
  tipo: "Todas",
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
  loadEntregadorQueue: (cpf: string) => Promise<void>;
  createRecord: (values: QueueFormValues) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
  assignRecord: (id: string) => Promise<void>;
  replaceQueue: (records: QueueRecord[]) => void;
};

function readAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed?.role !== "operacional") return null;
    return parsed;
  } catch {
    return null;
  }
}

function readLocalAnalyst() {
  if (typeof window === "undefined") {
    return "";
  }

  const auth = readAuthUser();
  if (auth?.analystName) return auth.analystName;

  return window.localStorage.getItem(ANALYST_STORAGE_KEY) ?? "";
}

function writeLocalAnalyst(value: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ANALYST_STORAGE_KEY, value);
  }
}

function resolveCurrentAnalystName(): string | null {
  const auth = readAuthUser();
  if (auth?.analystName?.trim()) return auth.analystName.trim();
  const local = readLocalAnalyst();
  return local ? local.trim() : null;
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
  fallback: QueueRecord["status"] = "na_fila_fila",
): QueueRecord["status"] {
  const valid: QueueRecord["status"][] = [
    "na_fila_fila",
    "na_fila_tpr",
    "na_fila_entregador",
    "atribuido_fila",
    "atribuido_tpr",
    "atribuido_entregador",
    "retirado_fila",
    "retirado_tpr",
    "retirado_entregador",
  ];

  if (status === "na_fila") return "na_fila_fila";
  if (status === "atribuido") return "atribuido_fila";
  if (status === "retirado") return "retirado_fila";
  if (status && valid.includes(status as QueueRecord["status"])) {
    return status as QueueRecord["status"];
  }

  return fallback;
}

function normalizeOrigem(
  origem: QueueRecord["origem"] | string | null | undefined,
): QueueRecord["origem"] {
  return origem === "entregador" ? "entregador" : "operacional";
}

function normalizeTipo(
  tipo: QueueRecord["tipo"] | string | null | undefined,
  status: QueueRecord["status"] | string | null | undefined,
): QueueRecord["tipo"] {
  if (tipo === "FILA" || tipo === "TPR" || tipo === "ENTREGADOR") {
    return tipo;
  }
  const normalized = normalizeStatus(status, "na_fila_fila");
  if (normalized.endsWith("_tpr")) return "TPR";
  if (normalized.endsWith("_entregador")) return "ENTREGADOR";
  return "FILA";
}

function isQueueStatus(status: QueueRecord["status"] | string | null | undefined) {
  const normalized = normalizeStatus(status);
  return (
    normalized === "na_fila_fila" ||
    normalized === "na_fila_tpr" ||
    normalized === "na_fila_entregador"
  );
}

function isTprStatus(status: QueueRecord["status"] | string | null | undefined) {
  return normalizeStatus(status).endsWith("_tpr");
}

function isEntregadorStatus(status: QueueRecord["status"] | string | null | undefined) {
  return normalizeStatus(status).endsWith("_entregador");
}

function deriveNextStatus(
  current: QueueRecord["status"],
  target: "atribuido" | "retirado",
): QueueRecord["status"] {
  if (target === "atribuido") {
    if (isTprStatus(current)) return "atribuido_tpr";
    if (isEntregadorStatus(current)) return "atribuido_entregador";
    return "atribuido_fila";
  }
  if (isTprStatus(current)) return "retirado_tpr";
  if (isEntregadorStatus(current)) return "retirado_entregador";
  return "retirado_fila";
}

function normalizeQueue(records: QueueRecord[]) {
  return [...records]
    .map((record) => ({
      ...record,
      origem: normalizeOrigem(record.origem),
      tipo: normalizeTipo(record.tipo, record.status),
      data_fila: record.data_fila ?? record.criado_em.slice(0, 10),
      status: normalizeStatus(record.status),
      analista: record.analista ?? null,
      codigo_pessoa: record.codigo_pessoa ?? null,
      cpf: record.cpf ?? null,
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
        .in("status", [
          "na_fila_fila",
          "na_fila_tpr",
          "na_fila_entregador",
          "na_fila",
        ])
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
  loadEntregadorQueue: async (cpf) => {
    set({ loading: true, error: null });

    if (supabase) {
      const todayKey = getTodayKey();

      const { data, error } = await supabase
        .from("fila_registros")
        .select("*")
        .gte("data_fila", todayKey)
        .eq("cpf", cpf)
        .order("criado_em", { ascending: true });

      if (error) {
        set({ loading: false, error: "Nao foi possivel carregar seus agendamentos." });
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
        error:
          "Supabase nao conectado neste deploy. Configure a URL e a anon key na Vercel.",
      });
      return;
    }

    const localQueue = readLocalQueue().filter((record) => record.cpf === cpf);
    set({ queue: localQueue, loading: false, error: null });
  },
  createRecord: async (values) => {
    set({ syncing: true, error: null });

    const currentAnalyst = resolveCurrentAnalystName();
    const { tipo_atribuicao, ...payload } = values;

    const origem = payload.origem ?? "operacional";
    const tipo =
      payload.tipo ??
      (origem === "entregador"
        ? "ENTREGADOR"
        : tipo_atribuicao === "TPR"
          ? "TPR"
          : "FILA");
    const status: QueueRecord["status"] =
      tipo === "TPR"
        ? "na_fila_tpr"
        : tipo === "ENTREGADOR"
          ? "na_fila_entregador"
          : "na_fila_fila";

    const analista =
      origem === "entregador"
        ? null
        : currentAnalyst ?? null;

    const insertPayload = {
      ...payload,
      origem,
      tipo,
      status,
      analista,
      codigo_pessoa: payload.codigo_pessoa ?? null,
      cpf: payload.cpf ?? null,
    };

    if (supabase) {
      const { error } = await supabase
        .from("fila_registros")
        .insert(insertPayload as never);

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
      origem: insertPayload.origem,
      tipo: insertPayload.tipo,
      codigo_pessoa: insertPayload.codigo_pessoa ?? null,
      cpf: insertPayload.cpf ?? null,
      nome: payload.nome,
      cidade: payload.cidade,
      hotzone: payload.hotzone,
      turno_desejado: payload.turno_desejado,
      data_fila: payload.data_fila,
      status,
      analista,
      entregador_contato: payload.entregador_contato ?? null,
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
      const status = current
        ? deriveNextStatus(current.status, "retirado")
        : "retirado_fila";

      const currentAnalyst = resolveCurrentAnalystName();
      const tipo = normalizeTipo(current?.tipo, current?.status);
      const origem = normalizeOrigem(current?.origem);
      const isEntregadorFlow = origem === "entregador" || tipo === "ENTREGADOR";

      const analystUpdate = isEntregadorFlow
        ? currentAnalyst ?? current?.analista ?? null
        : current?.analista ?? currentAnalyst ?? null;

      const { error } = await supabase
        .from("fila_registros")
        .update({
          status,
          analista: analystUpdate,
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
    const status = current
      ? deriveNextStatus(current.status, "retirado")
      : "retirado_fila";

    const currentAnalyst = resolveCurrentAnalystName();
    const tipo = normalizeTipo(current?.tipo, current?.status);
    const origem = normalizeOrigem(current?.origem);
    const isEntregadorFlow = origem === "entregador" || tipo === "ENTREGADOR";

    const analystUpdate = isEntregadorFlow
      ? currentAnalyst ?? current?.analista ?? null
      : current?.analista ?? currentAnalyst ?? null;

    const nextQueue = normalizeQueue(
      useQueueStore.getState().queue.map((record) =>
        record.id === id
          ? {
              ...record,
              status,
              analista: analystUpdate,
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
      const status = current
        ? deriveNextStatus(current.status, "atribuido")
        : "atribuido_fila";

      const currentAnalyst = resolveCurrentAnalystName();
      const tipo = normalizeTipo(current?.tipo, current?.status);
      const origem = normalizeOrigem(current?.origem);
      const isEntregadorFlow = origem === "entregador" || tipo === "ENTREGADOR";

      const analista = isEntregadorFlow
        ? currentAnalyst ?? current?.analista ?? null
        : current?.analista ?? currentAnalyst ?? null;

      const { error } = await supabase
        .from("fila_registros")
        .update({ status, analista } as never)
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
    const status = current
      ? deriveNextStatus(current.status, "atribuido")
      : "atribuido_fila";

    const currentAnalyst = resolveCurrentAnalystName();
    const tipo = normalizeTipo(current?.tipo, current?.status);
    const origem = normalizeOrigem(current?.origem);
    const isEntregadorFlow = origem === "entregador" || tipo === "ENTREGADOR";

    const analista = isEntregadorFlow
      ? currentAnalyst ?? current?.analista ?? null
      : current?.analista ?? currentAnalyst ?? null;

    const nextQueue = normalizeQueue(
      useQueueStore.getState().queue.map((record) =>
        record.id === id
          ? {
              ...record,
              status,
              analista,
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
