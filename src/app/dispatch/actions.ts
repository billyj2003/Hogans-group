"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { maybeCompleteJob } from "@/lib/complete-job";

type Status = "ORDERED" | "DISPATCHED" | "ON_SITE" | "UNLOADING" | "DELIVERED" | "CANCELLED";
const VALID_STATUSES: Status[] = [
  "ORDERED",
  "DISPATCHED",
  "ON_SITE",
  "UNLOADING",
  "DELIVERED",
  "CANCELLED",
];

type Category = "AGGREGATES" | "ASPHALT" | "CONCRETE" | "OTHER";
const VALID_CATEGORIES: Category[] = ["AGGREGATES", "ASPHALT", "CONCRETE", "OTHER"];

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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("A user with that email already exists.");

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role: "DRIVER" },
  });

  revalidatePath("/dispatch/drivers");
}

export async function createJob(formData: FormData) {
  await assertStaff();

  const accountId = String(formData.get("accountId"));
  const categoryRaw = String(formData.get("category") ?? "OTHER");
  const category = VALID_CATEGORIES.includes(categoryRaw as Category)
    ? (categoryRaw as Category)
    : "OTHER";
  const material = String(formData.get("material") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const unit = String(formData.get("unit") ?? "").trim();
  const siteAddress = String(formData.get("siteAddress") ?? "").trim();
  const expectedDateRaw = String(formData.get("expectedDate") ?? "").trim();
  const docketNumber = String(formData.get("docketNumber") ?? "").trim() || null;

  if (!accountId || !material || !unit || !siteAddress) {
    throw new Error("Account, material, unit, and site address are required.");
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive number.");
  }

  const job = await prisma.job.create({
    data: {
      accountId,
      category,
      material,
      quantity,
      unit,
      siteAddress,
      expectedDate: expectedDateRaw ? new Date(expectedDateRaw) : null,
      docketNumber,
    },
  });

  revalidatePath("/dispatch");
  redirect(`/dispatch/jobs/${job.id}`);
}

export async function updateJob(formData: FormData) {
  await assertStaff();

  const jobId = String(formData.get("jobId"));
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { deliveries: true },
  });
  if (!job) throw new Error("Job not found.");

  const categoryRaw = String(formData.get("category") ?? "OTHER");
  const category = VALID_CATEGORIES.includes(categoryRaw as Category)
    ? (categoryRaw as Category)
    : "OTHER";
  const material = String(formData.get("material") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const unit = String(formData.get("unit") ?? "").trim();
  const siteAddress = String(formData.get("siteAddress") ?? "").trim();
  const expectedDateRaw = String(formData.get("expectedDate") ?? "").trim();
  const docketNumber = String(formData.get("docketNumber") ?? "").trim() || null;

  if (!material || !unit || !siteAddress) {
    throw new Error("Material, unit, and site address are required.");
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive number.");
  }

  const deliveredTotal = job.deliveries
    .filter((d) => d.status === "DELIVERED")
    .reduce((sum, d) => sum + (d.deliveredQuantity ?? d.quantity), 0);
  if (quantity < deliveredTotal) {
    throw new Error(
      `Quantity can't be less than the ${deliveredTotal} ${job.unit} already delivered.`,
    );
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      category,
      material,
      quantity,
      unit,
      siteAddress,
      expectedDate: expectedDateRaw ? new Date(expectedDateRaw) : null,
      docketNumber,
    },
  });

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/jobs/${jobId}`);
}

export async function repeatJob(formData: FormData) {
  await assertStaff();

  const sourceId = String(formData.get("jobId"));
  const source = await prisma.job.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error("Original job not found.");

  const job = await prisma.job.create({
    data: {
      accountId: source.accountId,
      category: source.category,
      material: source.material,
      quantity: source.quantity,
      unit: source.unit,
      siteAddress: source.siteAddress,
    },
  });

  revalidatePath("/dispatch");
  redirect(`/dispatch/jobs/${job.id}`);
}

export async function addLoad(formData: FormData) {
  await assertStaff();

  const jobId = String(formData.get("jobId"));
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const vehicleReg = String(formData.get("vehicleReg") ?? "").trim() || null;
  const driverId = String(formData.get("driverId") ?? "").trim() || null;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found.");
  if (job.status !== "OPEN") throw new Error("This job is no longer open.");

  const quantity = quantityRaw ? Number(quantityRaw) : job.quantity;
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive number.");
  }

  await prisma.delivery.create({
    data: {
      jobId,
      quantity,
      vehicleReg,
      driverId,
      events: { create: { status: "ORDERED" } },
    },
  });

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/jobs/${jobId}`);
}

export async function assignDriver(formData: FormData) {
  await assertStaff();

  const deliveryId = String(formData.get("deliveryId"));
  const jobId = String(formData.get("jobId"));
  const driverId = String(formData.get("driverId") ?? "").trim() || null;
  const vehicleReg = String(formData.get("vehicleReg") ?? "").trim() || null;

  await prisma.delivery.update({
    where: { id: deliveryId },
    data: { driverId, vehicleReg },
  });

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/jobs/${jobId}/deliveries/${deliveryId}`);
}

export async function updateDeliveryStatus(formData: FormData) {
  await assertStaff();

  const deliveryId = String(formData.get("deliveryId"));
  const jobId = String(formData.get("jobId"));
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

  if (status === "DELIVERED") await maybeCompleteJob(jobId);

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/jobs/${jobId}`);
  revalidatePath(`/dispatch/jobs/${jobId}/deliveries/${deliveryId}`);
}

export async function recordProofOfDelivery(formData: FormData) {
  await assertStaff();

  const deliveryId = String(formData.get("deliveryId"));
  const jobId = String(formData.get("jobId"));
  const podSignedBy = String(formData.get("podSignedBy") ?? "").trim();
  const podNote = String(formData.get("podNote") ?? "").trim() || null;
  const deliveredQuantityRaw = String(formData.get("deliveredQuantity") ?? "").trim();

  if (!podSignedBy) throw new Error("Signed-by name is required.");
  if (deliveredQuantityRaw) {
    const parsed = Number(deliveredQuantityRaw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error("Delivered quantity must be a positive number.");
    }
  }

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

  await maybeCompleteJob(jobId);

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/jobs/${jobId}`);
  revalidatePath(`/dispatch/jobs/${jobId}/deliveries/${deliveryId}`);
}

export async function cancelJob(formData: FormData) {
  await assertStaff();

  const jobId = String(formData.get("jobId"));
  await prisma.job.update({ where: { id: jobId }, data: { status: "CANCELLED" } });

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/jobs/${jobId}`);
}
