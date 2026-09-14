import Link from "next/link";
import { format } from "date-fns";
import { requireCustomer } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";

const statusColor: Record<string, string> = {
  ORDERED: "bg-concrete-200 text-graphite-900",
  DISPATCHED: "bg-orange-500/20 text-orange-600",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function PortalPage() {
  const session = await requireCustomer();

  const deliveries = await prisma.delivery.findMany({
    where: { accountId: session.user.accountId ?? "" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-graphite-950">My Deliveries</h1>
      <p className="mt-2 text-graphite-900/60">Track orders from placement to drop-off.</p>

      {deliveries.length === 0 ? (
        <p className="mt-8 text-graphite-900/60">No deliveries on your account yet.</p>
      ) : (
        <div className="mt-8 space-y-3">
          {deliveries.map((d) => (
            <Link
              key={d.id}
              href={`/portal/deliveries/${d.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-graphite-950/10 bg-white p-4 transition hover:border-orange-500"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${statusColor[d.status]}`}
                  >
                    {d.status}
                  </span>
                  <span className="font-display font-bold text-graphite-950">
                    {d.material}
                  </span>
                </div>
                <p className="mt-1 text-sm text-graphite-900/60">
                  {d.quantity} {d.unit} &middot; {d.siteAddress}
                </p>
              </div>
              <span className="text-sm text-graphite-900/50">
                {d.expectedDate ? format(d.expectedDate, "d MMM HH:mm") : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
