"use client";

export type AnalyticsEvent = {
  type: string;
  detail: string;
  createdAt: string;
};

const STORAGE_KEY = "axyscare.analytics.events";
const MAX_EVENTS = 120;

export function trackUIEvent(type: string, detail: string) {
  if (typeof window === "undefined") return;

  const nextEvent: AnalyticsEvent = {
    type,
    detail,
    createdAt: new Date().toISOString(),
  };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const current = raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
    const next = [nextEvent, ...current].slice(0, MAX_EVENTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return;
  }
}

export function readTrackedEvents() {
  if (typeof window === "undefined") return [] as AnalyticsEvent[];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}
