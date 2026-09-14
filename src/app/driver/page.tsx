import Link from "next/link";
import { format } from "date-fns";
import { requireDriver } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";

const statusColor: Record<string, string> = {
  ORDERED: "bg-concrete-200 text-graphite-900",
  DISPATCHED: "bg-orange-500/20 text-orange-600",
  ON_SITE: "bg-orange-500/20 text-orange-600",
  UNLOADING: "bg-orange-500/20 text-orange-600",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function DriverJobsPage() {
  const session = await requireDriver();

  const deliveries = await prisma.delivery.findMany({
    where: {
      driverId: session.user.id,
      status: { notIn: ["DELIVERED", "CANCELLED"] },
    },
    orderBy: { expectedDate: "asc" },
    include: { account: true },
  });

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-graphite-950">My Jobs</h1>
      <p className="mt-2 text-graphite-900/60">Today&apos;s assigned deliveries.</p>

      {deliveries.length === 0 ? (
        <p className="mt-8 text-graphite-900/60">No jobs assigned right now.</p>
      ) : (
        <div className="mt-8 space-y-3">
          {deliveries.map((d) => (
            <Link
              key={d.id}
              href={`/driver/deliveries/${d.id}`}
              className="block rounded-lg border border-graphite-950/10 bg-white p-4 transition hover:border-orange-500"
            >
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${statusColor[d.status]}`}
              >
                {d.status.replace("_", " ")}
              </span>
              <p className="mt-2 font-display text-lg font-bold text-graphite-950">
                {d.material}
              </p>
              <p className="text-sm text-graphite-900/60">
                {d.account.name} &middot; {d.quantity} {d.unit}
              </p>
              <p className="mt-1 text-sm text-graphite-900/60">{d.siteAddress}</p>
              {d.expectedDate && (
                <p className="mt-1 text-xs text-graphite-900/50">
                  Expected {format(d.expectedDate, "d MMM HH:mm")}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
