import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const staffPassword = await bcrypt.hash("staff123", 10);
  const customerPassword = await bcrypt.hash("customer123", 10);

  await prisma.user.upsert({
    where: { email: "dispatch@hogan-group.co.uk" },
    update: {},
    create: {
      name: "Dispatch Team",
      email: "dispatch@hogan-group.co.uk",
      passwordHash: staffPassword,
      role: "ADMIN",
    },
  });

  const accountA = await prisma.account.upsert({
    where: { id: "seed-account-a" },
    update: {},
    create: {
      id: "seed-account-a",
      name: "Eryri Construction Ltd",
      siteNotes: "Access via the north gate, forklift on site.",
    },
  });

  const accountB = await prisma.account.upsert({
    where: { id: "seed-account-b" },
    update: {},
    create: {
      id: "seed-account-b",
      name: "Parry Bros Groundworks",
    },
  });

  const customerA = await prisma.user.upsert({
    where: { email: "orders@eryriconstruction.example" },
    update: {},
    create: {
      name: "Gareth Pritchard",
      email: "orders@eryriconstruction.example",
      passwordHash: customerPassword,
      role: "CUSTOMER",
      accountId: accountA.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "site@parrybros.example" },
    update: {},
    create: {
      name: "Ellie Parry",
      email: "site@parrybros.example",
      passwordHash: customerPassword,
      role: "CUSTOMER",
      accountId: accountB.id,
    },
  });

  const now = new Date();
  const hours = (n: number) => new Date(now.getTime() + n * 60 * 60 * 1000);

  await prisma.delivery.upsert({
    where: { id: "seed-delivery-1" },
    update: {},
    create: {
      id: "seed-delivery-1",
      accountId: accountA.id,
      status: "DELIVERED",
      material: "20mm Primary Aggregate",
      quantity: 18,
      unit: "tonnes",
      siteAddress: "Plot 4, Llanberis Road, Caernarfon",
      docketNumber: "HG-10231",
      vehicleReg: "CV19 HGN",
      driverName: "Tom Ellis",
      orderedAt: hours(-30),
      expectedDate: hours(-6),
      dispatchedAt: hours(-7),
      deliveredAt: hours(-6),
      podSignedBy: "Gareth Pritchard",
      podNote: "Left at site entrance as agreed.",
    },
  });

  await prisma.delivery.upsert({
    where: { id: "seed-delivery-2" },
    update: {},
    create: {
      id: "seed-delivery-2",
      accountId: accountA.id,
      status: "DISPATCHED",
      material: "AC20 Binder Course Asphalt",
      quantity: 12,
      unit: "tonnes",
      siteAddress: "Plot 4, Llanberis Road, Caernarfon",
      docketNumber: "HG-10255",
      vehicleReg: "CV19 HGN",
      driverName: "Tom Ellis",
      orderedAt: hours(-4),
      expectedDate: hours(2),
      dispatchedAt: hours(-1),
    },
  });

  await prisma.delivery.upsert({
    where: { id: "seed-delivery-3" },
    update: {},
    create: {
      id: "seed-delivery-3",
      accountId: accountB.id,
      status: "ORDERED",
      material: "C32/40 Ready-Mix Concrete",
      quantity: 6,
      unit: "m3",
      siteAddress: "Unit 2, Bangor Road Industrial Estate",
      expectedDate: hours(26),
    },
  });

  console.log("Seed complete.");
  console.log("Staff login: dispatch@hogan-group.co.uk / staff123");
  console.log(`Customer login: ${customerA.email} / customer123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
