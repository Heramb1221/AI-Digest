"use client";
// hooks/use-digest-status.ts
// Polls /api/digest/status while a run is in progress.
// Stops polling once the run completes or fails.

import { useState, useEffect, useCallback, useRef } from "react";

interface DigestStatus {
  lastRun: {
    id:           string;
    status:       string;
    startedAt:    string;
    completedAt:  string | null;
    articlesNew:  number;
    articlesSeen: number;
  } | null;
  isRunning:  boolean;
  nextRunAt:  string;
}

const POLL_INTERVAL_MS = 3_000;

export function useDigestStatus() {
  const [status,    setStatus]    = useState<DigestStatus | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res  = await fetch("/api/digest/status");
      if (!res.ok) return;
      const data: DigestStatus = await res.json();
      setStatus(data);
      return data;
    } catch {
      // Silently ignore network errors during polling
    }
  }, []);

  // Start/stop polling based on whether a run is active
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      const data = await fetchStatus();
      if (data && !data.isRunning) {
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }, [fetchStatus]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus().then((data) => {
      if (data?.isRunning) startPolling();
    });
    return stopPolling;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerRefresh = useCallback(async (): Promise<boolean> => {
    setTriggering(true);
    setError(null);
    try {
      const res  = await fetch("/api/digest/run", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not start refresh.");
        return false;
      }

      // Optimistically mark as running, then start polling
      setStatus((prev) => prev ? { ...prev, isRunning: true } : null);
      startPolling();
      return true;
    } catch {
      setError("Network error.");
      return false;
    } finally {
      setTriggering(false);
    }
  }, [startPolling]);

  return { status, triggering, error, triggerRefresh, refetch: fetchStatus };
}
