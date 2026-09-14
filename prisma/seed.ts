import bcrypt from "bcryptjs";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const staffPassword = await bcrypt.hash("staff123", 10);
  const customerPassword = await bcrypt.hash("customer123", 10);
  const driverPassword = await bcrypt.hash("driver123", 10);

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

  const driver = await prisma.user.upsert({
    where: { email: "tom.ellis@driver.hogan-group.co.uk" },
    update: {},
    create: {
      name: "Tom Ellis",
      email: "tom.ellis@driver.hogan-group.co.uk",
      passwordHash: driverPassword,
      role: "DRIVER",
    },
  });

  const driver2 = await prisma.user.upsert({
    where: { email: "sam.jones@driver.hogan-group.co.uk" },
    update: {},
    create: {
      name: "Sam Jones",
      email: "sam.jones@driver.hogan-group.co.uk",
      passwordHash: driverPassword,
      role: "DRIVER",
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

  // Job 1: a big asphalt job needing multiple wagons, partly delivered.
  const job1 = await prisma.job.upsert({
    where: { id: "seed-job-1" },
    update: {},
    create: {
      id: "seed-job-1",
      accountId: accountA.id,
      category: "ASPHALT",
      material: "AC20 Binder Course Asphalt",
      quantity: 60,
      unit: "tonnes",
      siteAddress: "Plot 4, Llanberis Road, Caernarfon",
      docketNumber: "HG-10255",
      expectedDate: hours(2),
      status: "OPEN",
    },
  });

  await prisma.delivery.upsert({
    where: { id: "seed-delivery-1a" },
    update: {},
    create: {
      id: "seed-delivery-1a",
      jobId: job1.id,
      status: "DELIVERED",
      quantity: 20,
      deliveredQuantity: 19.54,
      vehicleReg: "CV19 HGN",
      driverId: driver.id,
      orderedAt: hours(-7),
      dispatchedAt: hours(-6.5),
      onSiteAt: hours(-6),
      unloadingAt: hours(-5.9),
      deliveredAt: hours(-5.4),
      podSignedBy: "Gareth Pritchard",
      podNote: "Left at site entrance as agreed.",
    },
  });

  await prisma.delivery.upsert({
    where: { id: "seed-delivery-1b" },
    update: {},
    create: {
      id: "seed-delivery-1b",
      jobId: job1.id,
      status: "DISPATCHED",
      quantity: 20,
      vehicleReg: "AY19 UAZ",
      driverId: driver2.id,
      orderedAt: hours(-1),
      dispatchedAt: hours(-0.5),
    },
  });

  // Breadcrumb trail for the in-transit wagon, depot -> site.
  await prisma.deliveryPosition.deleteMany({ where: { deliveryId: "seed-delivery-1b" } });
  const depot = { lat: 53.228, lng: -4.129 };
  const site = { lat: 53.14, lng: -4.276 };
  const trailPoints = 6;
  for (let i = 0; i < trailPoints; i++) {
    const t = i / (trailPoints - 1);
    await prisma.deliveryPosition.create({
      data: {
        deliveryId: "seed-delivery-1b",
        lat: depot.lat + (site.lat - depot.lat) * t,
        lng: depot.lng + (site.lng - depot.lng) * t,
        recordedAt: new Date(hours(-0.5).getTime() + t * 25 * 60 * 1000),
      },
    });
  }

  // Job 2: fully delivered aggregate job (one load, already complete).
  const job2 = await prisma.job.upsert({
    where: { id: "seed-job-2" },
    update: {},
    create: {
      id: "seed-job-2",
      accountId: accountA.id,
      category: "AGGREGATES",
      material: "20mm Primary Aggregate",
      quantity: 18,
      unit: "tonnes",
      siteAddress: "Plot 4, Llanberis Road, Caernarfon",
      docketNumber: "HG-10231",
      expectedDate: hours(-6),
      status: "COMPLETE",
      completedAt: hours(-6),
    },
  });

  await prisma.delivery.upsert({
    where: { id: "seed-delivery-2a" },
    update: {},
    create: {
      id: "seed-delivery-2a",
      jobId: job2.id,
      status: "DELIVERED",
      quantity: 18,
      deliveredQuantity: 18,
      vehicleReg: "CV19 HGN",
      driverId: driver.id,
      orderedAt: hours(-30),
      dispatchedAt: hours(-7),
      onSiteAt: hours(-6.2),
      deliveredAt: hours(-6),
      podSignedBy: "Gareth Pritchard",
    },
  });

  // Job 3: not yet started.
  const job3 = await prisma.job.upsert({
    where: { id: "seed-job-3" },
    update: {},
    create: {
      id: "seed-job-3",
      accountId: accountB.id,
      category: "CONCRETE",
      material: "C32/40 Ready-Mix Concrete",
      quantity: 6,
      unit: "m3",
      siteAddress: "Unit 2, Bangor Road Industrial Estate",
      expectedDate: hours(26),
      status: "OPEN",
    },
  });
  void job3;

  console.log("Seed complete.");
  console.log("Staff login: dispatch@hogan-group.co.uk / staff123");
  console.log(`Customer login: ${customerA.email} / customer123`);
  console.log(`Driver login: ${driver.email} / driver123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
