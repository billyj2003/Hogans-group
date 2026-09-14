import Link from "next/link";
import { format } from "date-fns";
import { requireCustomer } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/auto-refresh";

const statusColor: Record<string, string> = {
  ORDERED: "bg-concrete-200 text-graphite-900",
  DISPATCHED: "bg-orange-500/20 text-orange-600",
  ON_SITE: "bg-orange-500/20 text-orange-600",
  UNLOADING: "bg-orange-500/20 text-orange-600",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string }>;
}) {
  const session = await requireCustomer();
  const { q, status, from, to } = await searchParams;

  const where: Record<string, unknown> = { accountId: session.user.accountId ?? "" };
  if (q) {
    where.OR = [
      { material: { contains: q } },
      { docketNumber: { contains: q } },
      { siteAddress: { contains: q } },
    ];
  }
  if (status) where.status = status;
  if (from || to) {
    where.expectedDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const deliveries = await prisma.delivery.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-graphite-950">My Deliveries</h1>
        <AutoRefresh intervalSeconds={20} />
      </div>
      <p className="mt-2 text-graphite-900/60">Track orders from placement to drop-off.</p>

      <form
        method="get"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-graphite-950/10 bg-white p-4"
      >
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-graphite-900/60">
            Search material, docket, or site
          </label>
          <input
            name="q"
            defaultValue={q}
            className="mt-1 w-full rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-graphite-900/60">Status</label>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="mt-1 rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
          >
            <option value="">Any</option>
            <option value="ORDERED">Ordered</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="ON_SITE">On site</option>
            <option value="UNLOADING">Unloading</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-graphite-900/60">Expected from</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="mt-1 rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-graphite-900/60">Expected to</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="mt-1 rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-graphite-950 px-4 py-1.5 text-sm font-medium text-concrete-100 hover:bg-graphite-800"
        >
          Filter
        </button>
        {(q || status || from || to) && (
          <Link href="/portal" className="text-sm text-graphite-900/60 underline">
            Reset
          </Link>
        )}
      </form>

      {deliveries.length === 0 ? (
        <p className="mt-8 text-graphite-900/60">No deliveries match those filters.</p>
      ) : (
        <div className="mt-6 space-y-3">
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
                    {d.status.replace("_", " ")}
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
