import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireStaff } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/auto-refresh";
import { addLoad, cancelJob, repeatJob, updateDeliveryStatus } from "../../actions";

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

// UNLOADING deliberately has no quick action here — finishing a wagon needs
// the exact delivered quantity and a signature, captured on its own detail
// page, not skippable from a one-click list button.
const nextStatus: Record<string, string> = {
  ORDERED: "DISPATCHED",
  DISPATCHED: "ON_SITE",
  ON_SITE: "UNLOADING",
};

const nextStatusLabel: Record<string, string> = {
  ORDERED: "Mark dispatched",
  DISPATCHED: "Mark on site",
  ON_SITE: "Mark unloading",
  UNLOADING: "Mark delivered",
};

export default async function DispatchJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;

  const [job, drivers] = await Promise.all([
    prisma.job.findUnique({
      where: { id },
      include: {
        account: true,
        deliveries: { include: { driver: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.user.findMany({ where: { role: "DRIVER" }, orderBy: { name: "asc" } }),
  ]);
  if (!job) notFound();

  const deliveredTotal = job.deliveries
    .filter((d) => d.status === "DELIVERED")
    .reduce((sum, d) => sum + (d.deliveredQuantity ?? d.quantity), 0);
  const inTransitTotal = job.deliveries
    .filter((d) => d.status !== "DELIVERED" && d.status !== "CANCELLED")
    .reduce((sum, d) => sum + d.quantity, 0);
  const remaining = Math.round(Math.max(0, job.quantity - deliveredTotal - inTransitTotal) * 100) / 100;
  const progressPct = Math.min(100, Math.round((deliveredTotal / job.quantity) * 100));

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/dispatch" className="text-sm text-graphite-900/50 hover:text-orange-600">
        &larr; Dispatch
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
          {job.status} &middot; {categoryLabel[job.category]}
        </p>
        <AutoRefresh intervalSeconds={20} />
      </div>
      <h1 className="mt-2 font-display text-3xl font-bold text-graphite-950">{job.material}</h1>
      <p className="mt-1 text-graphite-900/60">{job.account.name}</p>

      <form action={repeatJob} className="mt-6">
        <input type="hidden" name="jobId" value={job.id} />
        <button
          type="submit"
          className="w-full rounded bg-graphite-950 py-3 text-sm font-bold text-concrete-100 hover:bg-graphite-800"
        >
          Repeat job
        </button>
      </form>

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
          {remaining > 0 && job.status === "OPEN" && (
            <p className="mt-1 text-xs text-graphite-900/50">
              {remaining} {job.unit} still to send
            </p>
          )}
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

      {job.status === "OPEN" && (
        <div className="mt-8 rounded-lg border border-graphite-950/10 bg-white p-4">
          <h2 className="text-sm font-bold text-graphite-950">Send a wagon</h2>
          <form action={addLoad} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="jobId" value={job.id} />
            <div>
              <label className="text-xs text-graphite-900/50">
                Quantity ({job.unit})
              </label>
              <input
                type="number"
                step="0.01"
                name="quantity"
                defaultValue={remaining > 0 ? Math.min(20, remaining) : job.quantity}
                className="mt-1 block rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-graphite-900/50">Vehicle reg</label>
              <input
                name="vehicleReg"
                className="mt-1 block rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-graphite-900/50">Driver</label>
              <select
                name="driverId"
                className="mt-1 block rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
              >
                <option value="">Assign later&hellip;</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded bg-orange-500 px-4 py-1.5 text-sm font-medium text-graphite-950 hover:bg-orange-600"
            >
              Send wagon
            </button>
          </form>
          <form action={cancelJob} className="mt-3">
            <input type="hidden" name="jobId" value={job.id} />
            <button className="text-xs text-graphite-900/50 underline hover:text-red-600">
              Cancel job
            </button>
          </form>
        </div>
      )}

      <div className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-graphite-950">
            Wagons ({job.deliveries.length})
          </h2>
          {job.deliveries.some((d) => d.status === "DELIVERED") && (
            <button
              type="submit"
              form="pod-select"
              className="rounded border border-graphite-950/20 px-3 py-1.5 text-xs font-medium text-graphite-900 hover:border-orange-500 hover:text-orange-600"
            >
              View selected PODs
            </button>
          )}
        </div>
        <form id="pod-select" method="get" action={`/api/jobs/${job.id}/pods`} />
        {job.deliveries.length === 0 ? (
          <p className="mt-3 text-sm text-graphite-900/50">No wagons sent yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {job.deliveries.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-graphite-950/10 bg-white p-3 text-sm"
              >
                <div className="flex items-start gap-2">
                  {d.status === "DELIVERED" && (
                    <input
                      type="checkbox"
                      name="deliveryId"
                      value={d.id}
                      form="pod-select"
                      aria-label="Select for POD download"
                      className="mt-1"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${statusColor[d.status]}`}
                      >
                        {d.status.replace("_", " ")}
                      </span>
                      <Link
                        href={`/dispatch/jobs/${job.id}/deliveries/${d.id}`}
                        className="font-medium text-graphite-950 hover:text-orange-600"
                      >
                        {d.status === "DELIVERED" && d.deliveredQuantity != null
                          ? d.deliveredQuantity
                          : d.quantity}{" "}
                        {job.unit}
                      </Link>
                    </div>
                    <p className="mt-1 text-graphite-900/60">
                      {d.vehicleReg ?? "No vehicle"} {d.driver ? `· ${d.driver.name}` : ""}
                    </p>
                  </div>
                </div>
                {nextStatus[d.status] && (
                  <form action={updateDeliveryStatus} className="flex items-center gap-2">
                    <input type="hidden" name="deliveryId" value={d.id} />
                    <input type="hidden" name="jobId" value={job.id} />
                    <input type="hidden" name="status" value={nextStatus[d.status]} />
                    <button
                      type="submit"
                      className="rounded border border-graphite-950/20 px-3 py-1.5 text-xs font-medium text-graphite-900 hover:border-orange-500 hover:text-orange-600"
                    >
                      {nextStatusLabel[d.status]}
                    </button>
                  </form>
                )}
                {d.status === "UNLOADING" && (
                  <Link
                    href={`/dispatch/jobs/${job.id}/deliveries/${d.id}`}
                    className="rounded border border-orange-500 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-500/10"
                  >
                    Complete delivery
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
