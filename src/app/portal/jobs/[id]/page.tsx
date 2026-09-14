import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireCustomer } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/auto-refresh";

const categoryLabel: Record<string, string> = {
  AGGREGATES: "Aggregates",
  ASPHALT: "Asphalt",
  CONCRETE: "Concrete",
  OTHER: "Other",
};

const statusColor: Record<string, string> = {
  ORDERED: "bg-concrete-200 text-graphite-900",
  DISPATCHED: "bg-orange-500/20 text-orange-600",
  ON_SITE: "bg-orange-500/20 text-orange-600",
  UNLOADING: "bg-orange-500/20 text-orange-600",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function PortalJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomer();
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: { deliveries: { include: { driver: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!job || job.accountId !== session.user.accountId) notFound();

  const deliveredTotal = job.deliveries
    .filter((d) => d.status === "DELIVERED")
    .reduce((sum, d) => sum + (d.deliveredQuantity ?? d.quantity), 0);
  const progressPct = Math.min(100, Math.round((deliveredTotal / job.quantity) * 100));

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/portal" className="text-sm text-graphite-900/50 hover:text-orange-600">
        &larr; My Jobs
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
          {job.status} &middot; {categoryLabel[job.category]}
        </p>
        <AutoRefresh intervalSeconds={20} />
      </div>
      <h1 className="mt-2 font-display text-3xl font-bold text-graphite-950">{job.material}</h1>

      <div className="mt-4 rounded-lg bg-concrete-100 p-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-graphite-900/50">Docket / PO</dt>
            <dd className="font-medium text-graphite-950">{job.docketNumber ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-graphite-900/50">Expected</dt>
            <dd className="font-medium text-graphite-950">
              {job.expectedDate ? format(job.expectedDate, "d MMM yyyy HH:mm") : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-5">
          <dt className="text-sm text-graphite-900/50">Qty delivered</dt>
          <dd className="font-display text-3xl font-bold text-graphite-950">
            {deliveredTotal} / {job.quantity} {job.unit}
          </dd>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-concrete-200">
            <div
              className="h-full bg-orange-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <details className="mt-3 [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none text-sm font-medium text-orange-600">
          Show more &rarr;
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-graphite-900/50">Site address</dt>
            <dd className="font-medium text-graphite-950">{job.siteAddress}</dd>
          </div>
          <div>
            <dt className="text-graphite-900/50">Total needed</dt>
            <dd className="font-medium text-graphite-950">
              {job.quantity} {job.unit}
            </dd>
          </div>
        </dl>
      </details>

      <div className="mt-10">
        <h2 className="font-display text-lg font-bold text-graphite-950">
          Wagons ({job.deliveries.length})
        </h2>
        {job.deliveries.length === 0 ? (
          <p className="mt-3 text-sm text-graphite-900/50">No wagons sent yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {job.deliveries.map((d) => (
              <Link
                key={d.id}
                href={`/portal/jobs/${job.id}/deliveries/${d.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-graphite-950/10 bg-white p-3 text-sm transition hover:border-orange-500"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${statusColor[d.status]}`}
                    >
                      {d.status.replace("_", " ")}
                    </span>
                    <span className="font-medium text-graphite-950">
                      {d.status === "DELIVERED" && d.deliveredQuantity != null
                        ? d.deliveredQuantity
                        : d.quantity}{" "}
                      {job.unit}
                    </span>
                  </div>
                  <p className="mt-1 text-graphite-900/60">
                    {d.vehicleReg ?? "No vehicle"} {d.driver ? `· ${d.driver.name}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
