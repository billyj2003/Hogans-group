"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ intervalSeconds = 20 }: { intervalSeconds?: number }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      router.refresh();
      setLastUpdated(new Date().toLocaleTimeString());
    }, intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [enabled, intervalSeconds, router]);

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-graphite-900/50">
      <span>Last updated: {lastUpdated}</span>
      <button
        type="button"
        onClick={() => {
          router.refresh();
          setLastUpdated(new Date().toLocaleTimeString());
        }}
        className="rounded border border-graphite-950/20 px-3 py-1 font-medium text-graphite-900 hover:border-orange-500 hover:text-orange-600"
      >
        Refresh
      </button>
      <label className="flex items-center gap-2">
        <span>Auto refresh</span>
        <span className="relative inline-flex h-5 w-9 items-center">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="peer sr-only"
          />
          <span className="absolute inset-0 rounded-full bg-graphite-950/20 transition peer-checked:bg-orange-500" />
          <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
        </span>
      </label>
    </div>
  );
}
