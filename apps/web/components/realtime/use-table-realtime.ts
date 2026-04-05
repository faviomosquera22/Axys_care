"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/providers";

export function useTableRealtime(
  channelName: string,
  tables: string[],
  queryKeys: (readonly unknown[])[],
) {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const signature = JSON.stringify({ channelName, tables, queryKeys });

  useEffect(() => {
    const channel = client.channel(channelName);

    for (const table of tables) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        for (const queryKey of queryKeys) {
          queryClient.invalidateQueries({ queryKey: [...queryKey] });
        }
      });
    }

    channel.subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [channelName, client, queryClient, signature]);
}

