import Link from "next/link";
import { addDays, format, startOfDay } from "date-fns";
import { requireStaff } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/auto-refresh";
import { createJob } from "./actions";

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

export default async function DispatchDashboard({
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
  await requireStaff();
  const { q, status, category, from, to } = await searchParams;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { material: { contains: q } },
      { docketNumber: { contains: q } },
      { siteAddress: { contains: q } },
      { account: { name: { contains: q } } },
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
    return `/dispatch?${p.toString()}`;
  };

  const [jobs, accounts] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { account: true, deliveries: true },
      take: 50,
    }),
    prisma.account.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-graphite-950">Dispatch</h1>
        <AutoRefresh intervalSeconds={20} />
      </div>

      <div className="mt-8 rounded-lg border border-graphite-950/10 bg-white p-6">
        <h2 className="font-display text-lg font-bold text-graphite-950">New job</h2>
        <form action={createJob} className="mt-4 grid gap-3 sm:grid-cols-3">
          <select
            name="accountId"
            required
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm sm:col-span-1"
          >
            <option value="">Account&hellip;</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue="OTHER"
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          >
            <option value="AGGREGATES">Aggregates</option>
            <option value="ASPHALT">Asphalt</option>
            <option value="CONCRETE">Concrete</option>
            <option value="OTHER">Other</option>
          </select>
          <input
            name="material"
            placeholder="Material"
            required
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          />
          <input
            type="number"
            step="0.1"
            name="quantity"
            placeholder="Total quantity needed"
            required
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          />
          <input
            name="unit"
            placeholder="Unit (tonnes, m3...)"
            required
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            name="expectedDate"
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          />
          <input
            name="siteAddress"
            placeholder="Site address"
            required
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            name="docketNumber"
            placeholder="Docket / PO number (optional)"
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-orange-500 px-6 py-2.5 text-sm font-medium text-graphite-950 hover:bg-orange-600 sm:col-span-3"
          >
            Create job
          </button>
        </form>
      </div>

      <form
        method="get"
        className="mt-8 flex flex-wrap items-end gap-3 rounded-lg border border-graphite-950/10 bg-white p-4"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-graphite-900/60">
            Search account, docket, or site
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
          <Link href="/dispatch" className="text-sm text-graphite-900/60 underline">
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

      <div className="mt-8 space-y-3">
        {jobs.length === 0 && (
          <p className="text-sm text-graphite-900/50">No jobs match those filters.</p>
        )}
        {jobs.map((j) => {
          const deliveredTotal = j.deliveries
            .filter((d) => d.status === "DELIVERED")
            .reduce((sum, d) => sum + (d.deliveredQuantity ?? d.quantity), 0);
          return (
            <Link
              key={j.id}
              href={`/dispatch/jobs/${j.id}`}
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
                  <span className="font-display font-bold text-graphite-950">{j.material}</span>
                </div>
                <p className="mt-1 text-sm text-graphite-900/60">
                  {j.account.name} &middot; {deliveredTotal}/{j.quantity} {j.unit} &middot;{" "}
                  {j.siteAddress}
                  {j.expectedDate ? ` · Expected ${format(j.expectedDate, "d MMM HH:mm")}` : ""}
                </p>
              </div>
              <span className="text-sm text-graphite-900/50">
                {j.deliveries.length} wagon{j.deliveries.length === 1 ? "" : "s"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
