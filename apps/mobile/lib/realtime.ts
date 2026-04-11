import { subscribeToPatientRealtime } from "@axyscare/core-db";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "./client";

function invalidateQueryKeys(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKeys: (readonly unknown[])[],
) {
  for (const queryKey of queryKeys) {
    queryClient.invalidateQueries({ queryKey: [...queryKey] });
  }
}

export function useMobileTableRealtime(
  channelName: string,
  tables: string[],
  queryKeys: (readonly unknown[])[],
) {
  const queryClient = useQueryClient();
  const signature = JSON.stringify({ channelName, tables, queryKeys });

  useEffect(() => {
    const channel = supabase.channel(channelName);

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => invalidateQueryKeys(queryClient, queryKeys),
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, signature]);
}

export function useMobilePatientRealtime(
  patientId: string | undefined,
  queryKeys: (readonly unknown[])[],
) {
  const queryClient = useQueryClient();
  const keySignature = JSON.stringify(queryKeys);

  useEffect(() => {
    if (!patientId) return;

    const channel = subscribeToPatientRealtime(supabase, patientId, () => {
      invalidateQueryKeys(queryClient, queryKeys);
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [keySignature, patientId, queryClient]);
}
