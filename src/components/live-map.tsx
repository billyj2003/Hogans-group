"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

export type MapPosition = { lat: number; lng: number; recordedAt: string };

export function LiveMap({
  positions,
  startLabel = "Dispatched",
  endLabel,
}: {
  positions: MapPosition[];
  startLabel?: string;
  endLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || positions.length === 0) return;

      const latest = positions[positions.length - 1];
      const map =
        mapRef.current ??
        L.map(containerRef.current).setView([latest.lat, latest.lng], 11);
      mapRef.current = map;

      map.eachLayer((layer) => map.removeLayer(layer));

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const latLngs = positions.map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(latLngs, { color: "#e5590c", weight: 4 }).addTo(map);

      const startIcon = L.divIcon({
        className: "",
        html: '<div style="width:12px;height:12px;border-radius:50%;background:#40444b;border:2px solid white"></div>',
      });
      const currentIcon = L.divIcon({
        className: "",
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#e5590c;border:2px solid white;box-shadow:0 0 0 4px rgba(229,89,12,0.3)"></div>',
      });

      const startTime = new Date(positions[0].recordedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const endTime = new Date(latest.recordedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      L.marker(latLngs[0], { icon: startIcon })
        .addTo(map)
        .bindTooltip(`${startTime}<br>${startLabel}`, { permanent: true, direction: "top", className: "livemap-label" });
      L.marker(latLngs[latLngs.length - 1], { icon: currentIcon })
        .addTo(map)
        .bindTooltip(`${endTime}<br>${endLabel ?? "Last seen"}`, {
          permanent: true,
          direction: "top",
          className: "livemap-label",
        });

      map.fitBounds(latLngs, { padding: [30, 30] });
    });

    return () => {
      cancelled = true;
    };
  }, [positions, startLabel, endLabel]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  if (positions.length === 0) {
    return (
      <div className="rounded-lg border border-graphite-950/10 bg-concrete-100 p-6 text-sm text-graphite-900/50">
        No location updates yet.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-72 w-full overflow-hidden rounded-lg border border-graphite-950/10"
    />
  );
}
