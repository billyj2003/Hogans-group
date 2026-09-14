import { prisma } from "@/lib/prisma";

// A Job auto-completes once its delivered wagons cover the tonnage needed.
export async function maybeCompleteJob(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { deliveries: true },
  });
  if (!job || job.status !== "OPEN") return;

  const deliveredTotal = job.deliveries
    .filter((d) => d.status === "DELIVERED")
    .reduce((sum, d) => sum + (d.deliveredQuantity ?? d.quantity), 0);

  if (deliveredTotal >= job.quantity) {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "COMPLETE", completedAt: new Date() },
    });
  }
}
