"use client";

import { createWebBrowserClient } from "@axyscare/core-db";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

type AppSupabaseClient = ReturnType<typeof createWebBrowserClient>;

type AuthContextValue = {
  client: AppSupabaseClient;
  user: User | null;
  session: Session | null;
  loading: boolean;
};

type Toast = {
  id: number;
  tone: "success" | "error" | "info";
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

type UIContextValue = {
  notify: (toast: Omit<Toast, "id">) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const UIContext = createContext<UIContextValue | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [client] = useState(() => createWebBrowserClient());
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    client.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [client]);

  const notify = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const uiValue = useMemo(() => ({ notify }), [notify]);

  return (
    <QueryClientProvider client={queryClient}>
      <UIContext.Provider value={uiValue}>
        <AuthContext.Provider value={{ client, user, session, loading }}>
          {children}
          <div className="toast-stack" aria-live="polite" aria-atomic="true">
            {toasts.map((toast) => (
              <div key={toast.id} className={`toast toast--${toast.tone}`}>
                <span>{toast.message}</span>
                {toast.actionLabel ? (
                  toast.actionHref ? (
                    <a className="toast__action" href={toast.actionHref}>
                      {toast.actionLabel}
                    </a>
                  ) : (
                    <button type="button" className="toast__action" onClick={toast.onAction}>
                      {toast.actionLabel}
                    </button>
                  )
                ) : null}
              </div>
            ))}
          </div>
        </AuthContext.Provider>
      </UIContext.Provider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de Providers.");
  }
  return context;
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI debe usarse dentro de Providers.");
  }
  return context;
}
