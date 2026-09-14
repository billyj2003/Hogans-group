import Link from "next/link";
import { addDays, format, startOfDay } from "date-fns";
import { requireCustomer } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/auto-refresh";

const categoryLabel: Record<string, string> = {
  AGGREGATES: "Aggregates",
  ASPHALT: "Asphalt",
  CONCRETE: "Concrete",
  OTHER: "Other",
};

const jobStatusColor: Record<string, string> = {
  OPEN: "bg-orange-500/20 text-orange-600",
  COMPLETE: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await requireCustomer();
  const { q, status, category, from, to } = await searchParams;

  const where: Record<string, unknown> = { accountId: session.user.accountId ?? "" };
  if (q) {
    where.OR = [
      { material: { contains: q } },
      { docketNumber: { contains: q } },
      { siteAddress: { contains: q } },
    ];
  }
  if (status) where.status = status;
  if (category) where.category = category;
  if (from || to) {
    where.expectedDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const today = format(startOfDay(new Date()), "yyyy-MM-dd");
  const tomorrow = format(addDays(startOfDay(new Date()), 1), "yyyy-MM-dd");
  const past30 = format(addDays(startOfDay(new Date()), -30), "yyyy-MM-dd");
  const presetParams = (f: string, t: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (category) p.set("category", category);
    p.set("from", f);
    p.set("to", t);
    return `/portal?${p.toString()}`;
  };

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { deliveries: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-graphite-950">My Jobs</h1>
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
            <option value="OPEN">Open</option>
            <option value="COMPLETE">Complete</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-graphite-900/60">Category</label>
          <select
            name="category"
            defaultValue={category ?? ""}
            className="mt-1 rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
          >
            <option value="">Any</option>
            <option value="AGGREGATES">Aggregates</option>
            <option value="ASPHALT">Asphalt</option>
            <option value="CONCRETE">Concrete</option>
            <option value="OTHER">Other</option>
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
        {(q || status || category || from || to) && (
          <Link href="/portal" className="text-sm text-graphite-900/60 underline">
            Reset
          </Link>
        )}
      </form>

      <div className="mt-3 flex gap-2">
        <Link
          href={presetParams(past30, today)}
          className="rounded-full border border-graphite-950/15 px-3 py-1 text-xs font-medium text-graphite-900 hover:border-orange-500"
        >
          Past 30 days
        </Link>
        <Link
          href={presetParams(today, today)}
          className="rounded-full border border-graphite-950/15 px-3 py-1 text-xs font-medium text-graphite-900 hover:border-orange-500"
        >
          Today
        </Link>
        <Link
          href={presetParams(tomorrow, tomorrow)}
          className="rounded-full border border-graphite-950/15 px-3 py-1 text-xs font-medium text-graphite-900 hover:border-orange-500"
        >
          Tomorrow
        </Link>
      </div>

      {jobs.length === 0 ? (
        <p className="mt-8 text-graphite-900/60">No jobs match those filters.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {jobs.map((j) => {
            const deliveredTotal = j.deliveries
              .filter((d) => d.status === "DELIVERED")
              .reduce((sum, d) => sum + (d.deliveredQuantity ?? d.quantity), 0);
            return (
              <Link
                key={j.id}
                href={`/portal/jobs/${j.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-graphite-950/10 bg-white p-4 transition hover:border-orange-500"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${jobStatusColor[j.status]}`}
                    >
                      {j.status}
                    </span>
                    <span className="rounded bg-graphite-950/5 px-2 py-0.5 text-xs font-medium text-graphite-900/60">
                      {categoryLabel[j.category]}
                    </span>
                    <span className="font-display font-bold text-graphite-950">
                      {j.material}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-graphite-900/60">
                    {deliveredTotal}/{j.quantity} {j.unit} &middot; {j.siteAddress}
                  </p>
                </div>
                <span className="text-sm text-graphite-900/50">
                  {j.expectedDate ? format(j.expectedDate, "d MMM HH:mm") : ""}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
