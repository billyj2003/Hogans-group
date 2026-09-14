"use client";

import { useEffect, useRef, useState } from "react";
import { reportPosition } from "@/app/driver/actions";

type Status =
  | "notStarted"
  | "requesting"
  | "reporting"
  | "denied"
  | "unsupported"
  | "error"
  | "timedOut";

const FIRST_FIX_TIMEOUT_MS = 12000;

export function GeoReporter({
  deliveryId,
  active,
  intervalSeconds = 25,
}: {
  deliveryId: string;
  active: boolean;
  intervalSeconds?: number;
}) {
  const [status, setStatus] = useState<Status>("notStarted");
  const [lastSent, setLastSent] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledFirstFixRef = useRef(false);

  const sendPosition = (isFirst: boolean) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (isFirst) {
          settledFirstFixRef.current = true;
          if (watchdogRef.current) clearTimeout(watchdogRef.current);
        }
        setStatus("reporting");
        const fd = new FormData();
        fd.set("deliveryId", deliveryId);
        fd.set("lat", String(pos.coords.latitude));
        fd.set("lng", String(pos.coords.longitude));
        await reportPosition(fd);
        setLastSent(new Date().toLocaleTimeString());
      },
      () => {
        if (isFirst) {
          settledFirstFixRef.current = true;
          if (watchdogRef.current) clearTimeout(watchdogRef.current);
        }
        setStatus(isFirst ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  };

  const start = () => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus("requesting");
    settledFirstFixRef.current = false;
    // Must run inside the click handler — mobile browsers won't reliably
    // show the location permission prompt for a call made outside a
    // direct user gesture, and the request just hangs forever otherwise.
    sendPosition(true);
    // Some in-app browsers (Messages, WhatsApp, Instagram, etc.) never
    // resolve geolocation at all — no prompt, no error, it just hangs past
    // whatever timeout you pass. This watchdog un-sticks the button so the
    // person gets a real hint instead of a permanently disabled button.
    watchdogRef.current = setTimeout(() => {
      if (!settledFirstFixRef.current) setStatus("timedOut");
    }, FIRST_FIX_TIMEOUT_MS);
    intervalRef.current = setInterval(() => sendPosition(false), intervalSeconds * 1000);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  if (!active) return null;

  if (status === "notStarted" || status === "requesting") {
    return (
      <button
        type="button"
        onClick={start}
        disabled={status === "requesting"}
        className="w-full rounded border border-orange-500 bg-orange-500/10 px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-500/20 disabled:opacity-60"
      >
        {status === "requesting" ? "Requesting location…" : "Share my location"}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded border border-graphite-950/10 bg-concrete-100 px-3 py-2 text-xs text-graphite-900/60">
        {status === "denied" &&
          "Location access denied. Check your phone's Settings > Privacy > Location Services for this site, then try again."}
        {status === "unsupported" && "Location isn't supported on this device."}
        {status === "error" && `Couldn't get a fresh fix, retrying · last sent ${lastSent ?? "—"}`}
        {status === "reporting" && `Sharing location · last sent ${lastSent}`}
        {status === "timedOut" &&
          "No response after 12 seconds — no prompt appeared. If you opened this from Messages, WhatsApp, or another app, that in-app browser often blocks location entirely. Copy this link and open it directly in Safari or Chrome instead."}
      </div>
      {status === "timedOut" && (
        <button
          type="button"
          onClick={start}
          className="w-full rounded border border-orange-500 bg-orange-500/10 px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-500/20"
        >
          Try again
        </button>
      )}
    </div>
  );
}
