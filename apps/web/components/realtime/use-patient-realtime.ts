"use client";

import { subscribeToPatientRealtime } from "@axyscare/core-db";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/providers";

export function usePatientRealtime(
  patientId: string | undefined,
  queryKeys: (readonly unknown[])[] = [],
) {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const keySignature = JSON.stringify(queryKeys);

  useEffect(() => {
    if (!patientId) return;

    const channel = subscribeToPatientRealtime(client, patientId, () => {
      for (const key of queryKeys) {
        queryClient.invalidateQueries({ queryKey: [...key] });
      }
    });

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, keySignature, patientId, queryClient]);
}
