"use client";

import { isSupabaseConfigured } from "@axyscare/core-db";
import { LoadingStateCard } from "@axyscare/ui-shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/providers";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && isSupabaseConfigured()) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="auth-shell">
        <LoadingStateCard
          title="Cargando sesión clínica"
          description="Estamos validando tu acceso y restaurando el contexto de trabajo."
        />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
