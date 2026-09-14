import Link from "next/link";
import { addDays, format, startOfDay } from "date-fns";
import { requireCustomer } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/auto-refresh";
import { FilterBar } from "@/components/filter-bar";
import { ViewTabs } from "@/components/view-tabs";
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

export default async function PortalPage({
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
  const session = await requireCustomer();
  const { q, status: statusRaw, category, from, to, view: viewRaw } = await searchParams;
  const view: "jobs" | "wagons" = viewRaw === "wagons" ? "wagons" : "jobs";
  const validStatuses = (view === "jobs" ? jobStatusOptions : deliveryStatusOptions).map(
    (o) => o.value,
  );
  const status = statusRaw && validStatuses.includes(statusRaw) ? statusRaw : undefined;
  const accountId = session.user.accountId ?? "";

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
    return `/portal?${p.toString()}`;
  };

  const jobWhere: JobWhereInput = { accountId };
  if (q) {
    jobWhere.OR = [
      { material: { contains: q } },
      { docketNumber: { contains: q } },
      { siteAddress: { contains: q } },
    ];
  }
  if (category) jobWhere.category = category as MaterialCategory;
  if (from || to) {
    jobWhere.expectedDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const jobs =
    view === "jobs"
      ? await prisma.job.findMany({
          where: { ...jobWhere, ...(status ? { status: status as JobStatus } : {}) },
          orderBy: { createdAt: "desc" },
          include: { deliveries: true },
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
          include: { job: true, driver: true },
          take: 100,
        })
      : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-graphite-950">My Jobs</h1>
        <AutoRefresh intervalSeconds={20} />
      </div>
      <p className="mt-2 text-graphite-900/60">Track orders from placement to drop-off.</p>

      <ViewTabs basePath="/portal" view={view} otherParams={{ q, status, category, from, to }} />

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
        basePath="/portal"
        q={q}
        status={status}
        category={category}
        from={from}
        to={to}
        statusOptions={view === "jobs" ? jobStatusOptions : deliveryStatusOptions}
        categoryOptions={categoryOptions}
        searchLabel="Search material, docket, or site"
      />

      <div className="mt-6 overflow-x-auto rounded-lg border border-graphite-950/10 bg-white">
        {view === "jobs" ? (
          jobs.length === 0 ? (
            <p className="p-4 text-sm text-graphite-900/50">No jobs match those filters.</p>
          ) : (
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-graphite-950/10 text-xs font-medium text-graphite-900/50">
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Site address</th>
                  <th className="px-4 py-3">Docket / PO</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Qty delivered</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const deliveredTotal = j.deliveries
                    .filter((d) => d.status === "DELIVERED")
                    .reduce((sum, d) => sum + (d.deliveredQuantity ?? d.quantity), 0);
                  return (
                    <tr key={j.id} className="border-b border-graphite-950/5 last:border-0 hover:bg-concrete-100">
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${jobStatusColor[j.status]}`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/portal/jobs/${j.id}`}
                          className="font-medium text-graphite-950 hover:text-orange-600 hover:underline"
                        >
                          {j.material}
                        </Link>
                        <span className="ml-1 text-xs text-graphite-900/50">
                          {categoryLabel[j.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-graphite-900/70">{j.siteAddress}</td>
                      <td className="px-4 py-3 text-graphite-900/70">{j.docketNumber ?? "—"}</td>
                      <td className="px-4 py-3 text-graphite-900/70">
                        {j.expectedDate ? format(j.expectedDate, "d MMM HH:mm") : "—"}
                      </td>
                      <td className="px-4 py-3 text-graphite-900/70">
                        {deliveredTotal}/{j.quantity} {j.unit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : deliveries.length === 0 ? (
          <p className="p-4 text-sm text-graphite-900/50">No wagons match those filters.</p>
        ) : (
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-graphite-950/10 text-xs font-medium text-graphite-900/50">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Site address</th>
                <th className="px-4 py-3">Vehicle reg.</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id} className="border-b border-graphite-950/5 last:border-0 hover:bg-concrete-100">
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${deliveryStatusColor[d.status]}`}
                    >
                      {d.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/portal/jobs/${d.jobId}/deliveries/${d.id}`}
                      className="font-medium text-graphite-950 hover:text-orange-600 hover:underline"
                    >
                      {d.job.material}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-graphite-900/70">{d.job.siteAddress}</td>
                  <td className="px-4 py-3 text-graphite-900/70">{d.vehicleReg ?? "—"}</td>
                  <td className="px-4 py-3 text-graphite-900/70">{d.driver?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-graphite-900/70">
                    {d.status === "DELIVERED" && d.deliveredQuantity != null
                      ? d.deliveredQuantity
                      : d.quantity}{" "}
                    {d.job.unit}
                  </td>
                  <td className="px-4 py-3 text-graphite-900/70">
                    {format(d.createdAt, "d MMM HH:mm")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
