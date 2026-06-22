import { useState, useEffect } from "react";

const API_BASE = "/api";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT_MS = 30000;
const RETRY_503_DELAY_MS = 3000;

const cache = new Map();

function getCacheKey(endpoint) {
  return endpoint;
}

function getCacheEntry(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCacheEntry(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

export function useApi(endpoint, deps = [], options = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled && endpoint));
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const cacheKey = getCacheKey(endpoint);

  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;

    if (!enabled || !endpoint) {
      setLoading(false);
      setError(null);
      if (!endpoint) setData(null);
      return () => {
        cancelled = true;
      };
    }

    const cached = getCacheEntry(cacheKey);
    if (cached && refreshKey === 0) {
      setData(cached);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    fetch(`${API_BASE}${endpoint}`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 503) {
          const err = new Error("System initializing");
          err.status = 503;
          throw err;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setCacheEntry(cacheKey, json);
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;

        if (err.status === 503) {
          setLoading(true);
          retryTimer = setTimeout(() => {
            if (!cancelled) setRefreshKey((k) => k + 1);
          }, RETRY_503_DELAY_MS);
          return;
        }

        setError(err.name === "AbortError" ? "Request timed out" : err.message);
        setLoading(false);
      })
      .finally(() => {
        clearTimeout(timeout);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (retryTimer) clearTimeout(retryTimer);
      controller.abort();
    };
  }, [endpoint, enabled, refreshKey, cacheKey, ...deps]);

  const refetch = () => {
    if (cacheKey) cache.delete(cacheKey);
    setRefreshKey((k) => k + 1);
  };

  return { data, loading, error, refetch };
}

export function formatNumber(n) {
  if (n >= 100000) return (n / 100000).toFixed(1) + "L";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export function formatDelay(minutes) {
  if (minutes >= 1440) return (minutes / 1440).toFixed(1) + " days";
  if (minutes >= 60) return (minutes / 60).toFixed(1) + " hrs";
  return Math.round(minutes) + " min";
}

export function tierColor(tier) {
  const colors = {
    CRITICAL: "#FF3366",
    HIGH: "#FF6B35",
    MEDIUM: "#FFB800",
    LOW: "#00FF88",
  };
  return colors[tier] || "#6B7280";
}


