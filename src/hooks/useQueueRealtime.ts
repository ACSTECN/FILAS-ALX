import { useEffect } from "react";
import { LOCAL_STORAGE_KEY, useQueueStore } from "@/store/queueStore";
import { supabase } from "@/lib/supabase";

export function useQueueRealtime() {
  const loadQueue = useQueueStore((state) => state.loadQueue);
  const replaceQueue = useQueueStore((state) => state.replaceQueue);

  useEffect(() => {
    loadQueue();

    if (supabase) {
      const channel = supabase
        .channel("fila-registros-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "fila_registros",
          },
          () => {
            void loadQueue();
          },
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    }

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key !== LOCAL_STORAGE_KEY) {
        return;
      }

      try {
        replaceQueue(JSON.parse(event.newValue ?? "[]"));
      } catch {
        replaceQueue([]);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [loadQueue, replaceQueue]);
}
