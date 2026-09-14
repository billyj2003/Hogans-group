"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Status = "ORDERED" | "DISPATCHED" | "ON_SITE" | "UNLOADING" | "DELIVERED" | "CANCELLED";
const VALID_STATUSES: Status[] = [
  "ORDERED",
  "DISPATCHED",
  "ON_SITE",
  "UNLOADING",
  "DELIVERED",
  "CANCELLED",
];

async function assertStaff() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "STAFF" && session.user.role !== "ADMIN")) {
    throw new Error("Staff access required.");
  }
  return session;
}

function formatDuration(ms: number) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"}`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

export async function createAccount(formData: FormData) {
  await assertStaff();

  const name = String(formData.get("name") ?? "").trim();
  const siteNotes = String(formData.get("siteNotes") ?? "").trim() || null;
  if (!name) throw new Error("Account name is required.");

  await prisma.account.create({ data: { name, siteNotes } });
  revalidatePath("/dispatch/accounts");
}

export async function createAccountUser(formData: FormData) {
  await assertStaff();

  const accountId = String(formData.get("accountId"));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 6) {
    throw new Error("Name, email, and a password of at least 6 characters are required.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role: "CUSTOMER", accountId },
  });

  revalidatePath(`/dispatch/accounts/${accountId}`);
}

export async function createDriver(formData: FormData) {
  await assertStaff();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 6) {
    throw new Error("Name, email, and a password of at least 6 characters are required.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role: "DRIVER" },
  });

  revalidatePath("/dispatch/drivers");
}

export async function createDelivery(formData: FormData) {
  await assertStaff();

  const accountId = String(formData.get("accountId"));
  const material = String(formData.get("material") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const unit = String(formData.get("unit") ?? "").trim();
  const siteAddress = String(formData.get("siteAddress") ?? "").trim();
  const expectedDateRaw = String(formData.get("expectedDate") ?? "").trim();
  const docketNumber = String(formData.get("docketNumber") ?? "").trim() || null;
  const vehicleReg = String(formData.get("vehicleReg") ?? "").trim() || null;
  const driverId = String(formData.get("driverId") ?? "").trim() || null;

  if (!accountId || !material || !quantity || !unit || !siteAddress) {
    throw new Error("Account, material, quantity, unit, and site address are required.");
  }

  await prisma.delivery.create({
    data: {
      accountId,
      material,
      quantity,
      unit,
      siteAddress,
      expectedDate: expectedDateRaw ? new Date(expectedDateRaw) : null,
      docketNumber,
      vehicleReg,
      driverId,
      events: { create: { status: "ORDERED" } },
    },
  });

  revalidatePath("/dispatch");
}

export async function assignDriver(formData: FormData) {
  await assertStaff();

  const deliveryId = String(formData.get("deliveryId"));
  const driverId = String(formData.get("driverId") ?? "").trim() || null;
  const vehicleReg = String(formData.get("vehicleReg") ?? "").trim() || null;

  await prisma.delivery.update({
    where: { id: deliveryId },
    data: { driverId, vehicleReg },
  });

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/deliveries/${deliveryId}`);
}

export async function updateDeliveryStatus(formData: FormData) {
  await assertStaff();

  const deliveryId = String(formData.get("deliveryId"));
  const status = String(formData.get("status"));
  if (!VALID_STATUSES.includes(status as Status)) {
    throw new Error("Invalid status.");
  }

  const now = new Date();
  const data: {
    status: Status;
    dispatchedAt?: Date;
    onSiteAt?: Date;
    unloadingAt?: Date;
    deliveredAt?: Date;
  } = { status: status as Status };
  if (status === "DISPATCHED") data.dispatchedAt = now;
  if (status === "ON_SITE") data.onSiteAt = now;
  if (status === "UNLOADING") data.unloadingAt = now;
  if (status === "DELIVERED") data.deliveredAt = now;

  let note: string | null = null;
  if (status === "DELIVERED") {
    const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
    const from = delivery?.unloadingAt ?? delivery?.onSiteAt ?? delivery?.dispatchedAt;
    if (from) note = `Onsite: ${formatDuration(now.getTime() - from.getTime())}`;
  }

  await prisma.delivery.update({
    where: { id: deliveryId },
    data: { ...data, events: { create: { status: status as Status, note } } },
  });

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/deliveries/${deliveryId}`);
  revalidatePath(`/portal/deliveries/${deliveryId}`);
}

export async function recordProofOfDelivery(formData: FormData) {
  await assertStaff();

  const deliveryId = String(formData.get("deliveryId"));
  const podSignedBy = String(formData.get("podSignedBy") ?? "").trim();
  const podNote = String(formData.get("podNote") ?? "").trim() || null;
  const deliveredQuantityRaw = String(formData.get("deliveredQuantity") ?? "").trim();

  if (!podSignedBy) throw new Error("Signed-by name is required.");

  const now = new Date();
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  const from = delivery?.unloadingAt ?? delivery?.onSiteAt ?? delivery?.dispatchedAt;
  const durationNote = from ? `Onsite: ${formatDuration(now.getTime() - from.getTime())}` : null;

  await prisma.delivery.update({
    where: { id: deliveryId },
    data: {
      podSignedBy,
      podNote,
      status: "DELIVERED",
      deliveredAt: now,
      deliveredQuantity: deliveredQuantityRaw ? Number(deliveredQuantityRaw) : undefined,
      events: {
        create: {
          status: "DELIVERED",
          note: [durationNote, podNote ? `Signed by ${podSignedBy}` : null]
            .filter(Boolean)
            .join(" · "),
        },
      },
    },
  });

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/deliveries/${deliveryId}`);
  revalidatePath(`/portal/deliveries/${deliveryId}`);
}
