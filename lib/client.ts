"use client";

import useSWR from "swr";
import type { Session } from "./types";

export async function api<T>(
  path: string,
  {
    method = "GET",
    body,
    signal,
  }: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const response = await fetch(path, {
    method,
    signal,
    cache: "no-store",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => {
    throw new Error(
      "The server returned an unreadable response. Please try again.",
    );
  });
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data as T;
}

export function useApi<T>(path: string) {
  const { data, error, mutate } = useSWR<T, Error>(path, api<T>, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
    shouldRetryOnError: false,
  });
  return { data, error: error?.message, refresh: mutate };
}

export function useSession() {
  const { data, error } = useApi<Session>("/api/session");
  return { session: data ?? null, error: error ?? "" };
}

export const num = (value?: number) => (value ?? 0).toLocaleString("en-GB");
export function formatDate(value?: string | null) {
  if (!value) return "No date available";
  const date = new Date(value);
  return Number.isNaN(+date)
    ? "No date available"
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
}
