"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function assertStaff() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "STAFF" && session.user.role !== "ADMIN")) {
    throw new Error("Staff access required.");
  }
  return session;
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
  const driverName = String(formData.get("driverName") ?? "").trim() || null;

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
      driverName,
    },
  });

  revalidatePath("/dispatch");
}

export async function updateDeliveryStatus(formData: FormData) {
  await assertStaff();

  const deliveryId = String(formData.get("deliveryId"));
  const status = String(formData.get("status"));
  if (!["ORDERED", "DISPATCHED", "DELIVERED", "CANCELLED"].includes(status)) {
    throw new Error("Invalid status.");
  }

  const data: { status: "ORDERED" | "DISPATCHED" | "DELIVERED" | "CANCELLED"; dispatchedAt?: Date; deliveredAt?: Date } = {
    status: status as "ORDERED" | "DISPATCHED" | "DELIVERED" | "CANCELLED",
  };
  if (status === "DISPATCHED") data.dispatchedAt = new Date();
  if (status === "DELIVERED") data.deliveredAt = new Date();

  await prisma.delivery.update({ where: { id: deliveryId }, data });

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/deliveries/${deliveryId}`);
  revalidatePath(`/portal/deliveries/${deliveryId}`);
}

export async function recordProofOfDelivery(formData: FormData) {
  await assertStaff();

  const deliveryId = String(formData.get("deliveryId"));
  const podSignedBy = String(formData.get("podSignedBy") ?? "").trim();
  const podNote = String(formData.get("podNote") ?? "").trim() || null;

  if (!podSignedBy) throw new Error("Signed-by name is required.");

  await prisma.delivery.update({
    where: { id: deliveryId },
    data: {
      podSignedBy,
      podNote,
      status: "DELIVERED",
      deliveredAt: new Date(),
    },
  });

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/deliveries/${deliveryId}`);
  revalidatePath(`/portal/deliveries/${deliveryId}`);
}
