import Link from "next/link";
import { addDays, format, startOfDay } from "date-fns";
import { requireStaff } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/auto-refresh";
import { FilterBar } from "@/components/filter-bar";
import { ViewTabs } from "@/components/view-tabs";
import { createJob } from "./actions";
import type { JobWhereInput } from "@/generated/prisma/models";
import type { JobStatus, MaterialCategory, DeliveryStatus } from "@/generated/prisma/enums";

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

const deliveryStatusColor: Record<string, string> = {
  ORDERED: "bg-concrete-200 text-graphite-900",
  DISPATCHED: "bg-orange-500/20 text-orange-600",
  ON_SITE: "bg-orange-500/20 text-orange-600",
  UNLOADING: "bg-orange-500/20 text-orange-600",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const jobStatusOptions = [
  { value: "OPEN", label: "Open" },
  { value: "COMPLETE", label: "Complete" },
  { value: "CANCELLED", label: "Cancelled" },
];
const deliveryStatusOptions = [
  { value: "ORDERED", label: "Ordered" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "ON_SITE", label: "On site" },
  { value: "UNLOADING", label: "Unloading" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];
const categoryOptions = [
  { value: "AGGREGATES", label: "Aggregates" },
  { value: "ASPHALT", label: "Asphalt" },
  { value: "CONCRETE", label: "Concrete" },
  { value: "OTHER", label: "Other" },
];

export default async function DispatchDashboard({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    from?: string;
    to?: string;
    view?: string;
  }>;
}) {
  await requireStaff();
  const { q, status: statusRaw, category, from, to, view: viewRaw } = await searchParams;
  const view: "jobs" | "wagons" = viewRaw === "wagons" ? "wagons" : "jobs";
  const validStatuses = (view === "jobs" ? jobStatusOptions : deliveryStatusOptions).map(
    (o) => o.value,
  );
  const status = statusRaw && validStatuses.includes(statusRaw) ? statusRaw : undefined;

  const today = format(startOfDay(new Date()), "yyyy-MM-dd");
  const tomorrow = format(addDays(startOfDay(new Date()), 1), "yyyy-MM-dd");
  const past30 = format(addDays(startOfDay(new Date()), -30), "yyyy-MM-dd");
  const presetParams = (f: string, t: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (category) p.set("category", category);
    if (view === "wagons") p.set("view", "wagons");
    p.set("from", f);
    p.set("to", t);
    return `/dispatch?${p.toString()}`;
  };

  const jobWhere: JobWhereInput = {};
  if (q) {
    jobWhere.OR = [
      { material: { contains: q } },
      { docketNumber: { contains: q } },
      { siteAddress: { contains: q } },
      { account: { name: { contains: q } } },
    ];
  }
  if (category) jobWhere.category = category as MaterialCategory;
  if (from || to) {
    jobWhere.expectedDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const accounts = await prisma.account.findMany({ orderBy: { name: "asc" } });

  const jobs =
    view === "jobs"
      ? await prisma.job.findMany({
          where: { ...jobWhere, ...(status ? { status: status as JobStatus } : {}) },
          orderBy: { createdAt: "desc" },
          include: { account: true, deliveries: true },
          take: 50,
        })
      : [];

  const deliveries =
    view === "wagons"
      ? await prisma.delivery.findMany({
          where: {
            job: jobWhere,
            ...(status ? { status: status as DeliveryStatus } : {}),
          },
          orderBy: { createdAt: "desc" },
          include: { job: { include: { account: true } }, driver: true },
          take: 100,
        })
      : [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-graphite-950">Dispatch</h1>
        <AutoRefresh intervalSeconds={20} />
      </div>

      <details className="mt-8 rounded-lg border border-graphite-950/10 bg-white p-6 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between font-display text-lg font-bold text-graphite-950">
          <span>New job</span>
          <span className="rounded bg-orange-500 px-3 py-1 text-xs font-medium text-graphite-950">
            + Create
          </span>
        </summary>
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
      </details>

      <ViewTabs basePath="/dispatch" view={view} otherParams={{ q, status, category, from, to }} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
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

      <FilterBar
        basePath="/dispatch"
        q={q}
        status={status}
        category={category}
        from={from}
        to={to}
        statusOptions={view === "jobs" ? jobStatusOptions : deliveryStatusOptions}
        categoryOptions={categoryOptions}
        searchLabel="Search account, docket, or site"
      />

      <div className="mt-8 space-y-3">
        {view === "jobs" ? (
          <>
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
                      <span className="font-display font-bold text-graphite-950">
                        {j.material}
                      </span>
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
          </>
        ) : (
          <>
            {deliveries.length === 0 && (
              <p className="text-sm text-graphite-900/50">No wagons match those filters.</p>
            )}
            {deliveries.map((d) => (
              <Link
                key={d.id}
                href={`/dispatch/jobs/${d.jobId}/deliveries/${d.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-graphite-950/10 bg-white p-4 transition hover:border-orange-500"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${deliveryStatusColor[d.status]}`}
                    >
                      {d.status.replace("_", " ")}
                    </span>
                    <span className="rounded bg-graphite-950/5 px-2 py-0.5 text-xs font-medium text-graphite-900/60">
                      {categoryLabel[d.job.category]}
                    </span>
                    <span className="font-display font-bold text-graphite-950">
                      {d.status === "DELIVERED" && d.deliveredQuantity != null
                        ? d.deliveredQuantity
                        : d.quantity}{" "}
                      {d.job.unit} &middot; {d.job.material}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-graphite-900/60">
                    {d.job.account.name} &middot; {d.job.siteAddress} &middot;{" "}
                    {d.vehicleReg ?? "No vehicle"} {d.driver ? `(${d.driver.name})` : ""}
                  </p>
                </div>
                <span className="text-sm text-graphite-900/50">
                  {format(d.createdAt, "d MMM HH:mm")}
                </span>
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
