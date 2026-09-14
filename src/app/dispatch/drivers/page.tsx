import { requireStaff } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { createDriver } from "../actions";

export default async function DriversPage() {
  await requireStaff();

  const drivers = await prisma.user.findMany({
    where: { role: "DRIVER" },
    orderBy: { name: "asc" },
    include: { _count: { select: { driverDeliveries: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-graphite-950">Drivers</h1>
      <p className="mt-2 text-graphite-900/60">
        Create a login for anyone driving today, whether they&apos;re Hogan staff or a
        subcontractor.
      </p>

      <div className="mt-8 rounded-lg border border-graphite-950/10 bg-white p-6">
        <h2 className="font-display text-lg font-bold text-graphite-950">New driver</h2>
        <form action={createDriver} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            name="name"
            placeholder="Name"
            required
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          />
          <input
            name="password"
            placeholder="Temporary password"
            required
            minLength={6}
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-graphite-950 hover:bg-orange-600 sm:col-span-3"
          >
            Add driver
          </button>
        </form>
      </div>

      <div className="mt-8 space-y-2">
        {drivers.length === 0 && (
          <p className="text-sm text-graphite-900/50">No drivers added yet.</p>
        )}
        {drivers.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between rounded-lg border border-graphite-950/10 bg-white p-4"
          >
            <div>
              <p className="font-medium text-graphite-950">{d.name}</p>
              <p className="text-sm text-graphite-900/50">{d.email}</p>
            </div>
            <span className="text-sm text-graphite-900/50">
              {d._count.driverDeliveries} job{d._count.driverDeliveries === 1 ? "" : "s"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
