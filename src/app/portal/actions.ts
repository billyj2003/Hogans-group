"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";

export async function repeatJobAsCustomer(formData: FormData) {
  const session = await requireCustomer();

  const sourceId = String(formData.get("jobId"));
  const source = await prisma.job.findUnique({ where: { id: sourceId } });
  if (!source || source.accountId !== session.user.accountId) {
    throw new Error("Job not found.");
  }

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

  revalidatePath("/portal");
  redirect(`/portal/jobs/${job.id}`);
}
