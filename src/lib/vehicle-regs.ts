import { prisma } from "@/lib/prisma";

export async function getKnownVehicleRegs() {
  const rows = await prisma.delivery.findMany({
    where: { vehicleReg: { not: null } },
    select: { vehicleReg: true },
    distinct: ["vehicleReg"],
  });
  return rows
    .map((r) => r.vehicleReg!)
    .sort((a, b) => a.localeCompare(b));
}
