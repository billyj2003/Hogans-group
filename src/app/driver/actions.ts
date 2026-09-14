"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function formatDuration(ms: number) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"}`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

async function assertAssignedDriver(deliveryId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") {
    throw new Error("Driver access required.");
  }
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.driverId !== session.user.id) {
    throw new Error("This job is not assigned to you.");
  }
  return { session, delivery };
}

export async function driverMarkOnSite(formData: FormData) {
  const deliveryId = String(formData.get("deliveryId"));
  await assertAssignedDriver(deliveryId);

  const now = new Date();
  await prisma.delivery.update({
    where: { id: deliveryId },
    data: { status: "ON_SITE", onSiteAt: now, events: { create: { status: "ON_SITE" } } },
  });

  revalidatePath(`/driver/deliveries/${deliveryId}`);
  revalidatePath("/driver");
  revalidatePath("/dispatch");
}

export async function driverMarkUnloading(formData: FormData) {
  const deliveryId = String(formData.get("deliveryId"));
  await assertAssignedDriver(deliveryId);

  const now = new Date();
  await prisma.delivery.update({
    where: { id: deliveryId },
    data: {
      status: "UNLOADING",
      unloadingAt: now,
      events: { create: { status: "UNLOADING" } },
    },
  });

  revalidatePath(`/driver/deliveries/${deliveryId}`);
  revalidatePath("/driver");
  revalidatePath("/dispatch");
}

export async function driverCompleteDelivery(formData: FormData) {
  const deliveryId = String(formData.get("deliveryId"));
  const { delivery } = await assertAssignedDriver(deliveryId);

  const deliveredQuantityRaw = String(formData.get("deliveredQuantity") ?? "").trim();
  const podSignedBy = String(formData.get("podSignedBy") ?? "").trim();
  const podNote = String(formData.get("podNote") ?? "").trim() || null;

  if (!deliveredQuantityRaw || !podSignedBy) {
    throw new Error("Delivered quantity and signed-by name are required.");
  }

  const now = new Date();
  const from = delivery.unloadingAt ?? delivery.onSiteAt ?? delivery.dispatchedAt;
  const durationNote = from ? `Onsite: ${formatDuration(now.getTime() - from.getTime())}` : null;

  await prisma.delivery.update({
    where: { id: deliveryId },
    data: {
      status: "DELIVERED",
      deliveredAt: now,
      deliveredQuantity: Number(deliveredQuantityRaw),
      podSignedBy,
      podNote,
      events: {
        create: {
          status: "DELIVERED",
          note: [durationNote, `Signed by ${podSignedBy}`].filter(Boolean).join(" · "),
        },
      },
    },
  });

  revalidatePath(`/driver/deliveries/${deliveryId}`);
  revalidatePath("/driver");
  revalidatePath("/dispatch");
  revalidatePath(`/portal/deliveries/${deliveryId}`);
}

export async function reportPosition(formData: FormData) {
  const deliveryId = String(formData.get("deliveryId"));
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") return;

  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.driverId !== session.user.id) return;
  if (delivery.status === "DELIVERED" || delivery.status === "CANCELLED") return;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  await prisma.deliveryPosition.create({ data: { deliveryId, lat, lng } });
}
