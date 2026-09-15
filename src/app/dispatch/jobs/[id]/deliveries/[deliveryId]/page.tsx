import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireStaff } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/auto-refresh";
import { LiveMap } from "@/components/live-map";
import { assignDriver, recordProofOfDelivery, updateDeliveryStatus } from "../../../../actions";
import { getKnownVehicleRegs } from "@/lib/vehicle-regs";
import { VehicleRegList } from "@/components/vehicle-reg-list";

const statusLabel: Record<string, string> = {
  ORDERED: "Ordered",
  DISPATCHED: "Dispatched",
  ON_SITE: "On site",
  UNLOADING: "Unloading",
  DELIVERED: "Delivery complete",
  CANCELLED: "Cancelled",
};

export default async function DispatchDeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string; deliveryId: string }>;
}) {
  await requireStaff();
  const { id: jobId, deliveryId } = await params;

  const [delivery, drivers, knownVehicleRegs] = await Promise.all([
    prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        job: { include: { account: true } },
        driver: true,
        events: { orderBy: { createdAt: "asc" } },
        positions: { orderBy: { recordedAt: "asc" } },
      },
    }),
    prisma.user.findMany({ where: { role: "DRIVER" }, orderBy: { name: "asc" } }),
    getKnownVehicleRegs(),
  ]);
  if (!delivery || delivery.jobId !== jobId) notFound();

  const onsiteFrom = delivery.dispatchedAt;
  const onsiteTo = delivery.deliveredAt ?? (delivery.status !== "CANCELLED" ? new Date() : null);
  const onsiteMinutes =
    onsiteFrom && onsiteTo ? Math.round((onsiteTo.getTime() - onsiteFrom.getTime()) / 60000) : null;
  const onsiteLabel =
    onsiteMinutes != null
      ? onsiteMinutes < 60
        ? `${onsiteMinutes}m`
        : `${Math.floor(onsiteMinutes / 60)}h ${onsiteMinutes % 60}m`
      : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href={`/dispatch/jobs/${jobId}`} className="text-sm text-graphite-900/50 hover:text-orange-600">
        &larr; {delivery.job.material}
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
          {delivery.status}
        </p>
        <AutoRefresh intervalSeconds={15} />
      </div>
      <h1 className="mt-2 font-display text-3xl font-bold text-graphite-950">
        {delivery.quantity} {delivery.job.unit}
      </h1>
      <p className="mt-1 text-graphite-900/60">
        {delivery.job.account.name} &middot; {delivery.job.siteAddress}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-graphite-900/50">Planned quantity</dt>
          <dd className="font-medium text-graphite-950">
            {delivery.quantity} {delivery.job.unit}
          </dd>
        </div>
        <div>
          <dt className="text-graphite-900/50">Driver</dt>
          <dd className="font-medium text-graphite-950">{delivery.driver?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-graphite-900/50">Vehicle reg.</dt>
          <dd className="font-medium text-graphite-950">{delivery.vehicleReg ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-graphite-900/50">Haulier</dt>
          <dd className="font-medium text-graphite-950">{delivery.haulierName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-graphite-900/50">Ordered</dt>
          <dd className="font-medium text-graphite-950">
            {format(delivery.orderedAt, "d MMM yyyy HH:mm")}
          </dd>
        </div>
        <div>
          <dt className="text-graphite-900/50">Docket / PO</dt>
          <dd className="font-medium text-graphite-950">{delivery.job.docketNumber ?? "—"}</dd>
        </div>
        {delivery.despatchedBy && (
          <div>
            <dt className="text-graphite-900/50">Despatched by</dt>
            <dd className="font-medium text-graphite-950">{delivery.despatchedBy}</dd>
          </div>
        )}
        {delivery.loadNumber && (
          <div>
            <dt className="text-graphite-900/50">Load number</dt>
            <dd className="font-medium text-graphite-950">{delivery.loadNumber}</dd>
          </div>
        )}
        {onsiteLabel && (
          <div>
            <dt className="text-graphite-900/50">Time onsite</dt>
            <dd className="font-medium text-graphite-950">{onsiteLabel}</dd>
          </div>
        )}
      </dl>

      {delivery.status !== "DELIVERED" && delivery.status !== "CANCELLED" && (
        <div className="mt-6 rounded-lg border border-graphite-950/10 bg-white p-4">
          <h2 className="text-sm font-bold text-graphite-950">Driver &amp; vehicle</h2>
          <form action={assignDriver} className="mt-2 flex flex-wrap items-center gap-2">
            <input type="hidden" name="deliveryId" value={delivery.id} />
            <input type="hidden" name="jobId" value={jobId} />
            <select
              name="driverId"
              defaultValue={delivery.driverId ?? ""}
              className="rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
            >
              <option value="">Unassigned</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              name="vehicleReg"
              placeholder="Vehicle reg"
              defaultValue={delivery.vehicleReg ?? ""}
              list="vehicle-regs"
              autoComplete="off"
              className="rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
            />
            <input
              name="haulierName"
              placeholder="Haulier"
              defaultValue={delivery.haulierName ?? ""}
              className="rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
            />
            <input
              name="despatchedBy"
              placeholder="Despatched by (name)"
              defaultValue={delivery.despatchedBy ?? ""}
              className="rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded border border-graphite-950/20 px-3 py-1.5 text-xs font-medium text-graphite-900 hover:border-orange-500 hover:text-orange-600"
            >
              Save
            </button>
          </form>
        </div>
      )}

      {delivery.status !== "DELIVERED" && delivery.status !== "CANCELLED" && (
        <div className="mt-8 flex flex-wrap gap-3">
          {delivery.status === "ORDERED" && (
            <form action={updateDeliveryStatus}>
              <input type="hidden" name="deliveryId" value={delivery.id} />
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="status" value="DISPATCHED" />
              <button className="rounded bg-graphite-950 px-5 py-2 text-sm font-medium text-concrete-100 hover:bg-graphite-800">
                Mark dispatched
              </button>
            </form>
          )}
          {delivery.status === "DISPATCHED" && (
            <form action={updateDeliveryStatus}>
              <input type="hidden" name="deliveryId" value={delivery.id} />
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="status" value="ON_SITE" />
              <button className="rounded bg-graphite-950 px-5 py-2 text-sm font-medium text-concrete-100 hover:bg-graphite-800">
                Mark on site
              </button>
            </form>
          )}
          {delivery.status === "ON_SITE" && (
            <form action={updateDeliveryStatus}>
              <input type="hidden" name="deliveryId" value={delivery.id} />
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="status" value="UNLOADING" />
              <button className="rounded bg-graphite-950 px-5 py-2 text-sm font-medium text-concrete-100 hover:bg-graphite-800">
                Mark unloading
              </button>
            </form>
          )}
          <form action={updateDeliveryStatus}>
            <input type="hidden" name="deliveryId" value={delivery.id} />
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="status" value="CANCELLED" />
            <button className="rounded border border-graphite-950/20 px-5 py-2 text-sm font-medium text-graphite-900 hover:border-red-500 hover:text-red-600">
              Cancel wagon
            </button>
          </form>
        </div>
      )}

      {["DISPATCHED", "ON_SITE", "UNLOADING"].includes(delivery.status) && (
        <div className="mt-10 rounded-lg border border-graphite-950/10 bg-concrete-100 p-6">
          <h2 className="font-display text-lg font-bold text-graphite-950">
            Record proof of delivery
          </h2>
          <form action={recordProofOfDelivery} className="mt-4 space-y-3">
            <input type="hidden" name="deliveryId" value={delivery.id} />
            <input type="hidden" name="jobId" value={jobId} />
            <input
              type="number"
              step="0.01"
              name="deliveredQuantity"
              placeholder={`Exact ${delivery.job.unit} delivered (planned: ${delivery.quantity})`}
              defaultValue={delivery.quantity}
              className="w-full rounded border border-graphite-950/15 px-3 py-2 text-sm"
            />
            <details className="[&_summary::-webkit-details-marker]:hidden">
              <summary className="cursor-pointer list-none text-xs font-medium text-graphite-900/60 hover:text-orange-600">
                Weighbridge details (optional) &mdash; overrides quantity above
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input
                  type="number"
                  step="0.01"
                  name="grossWeight"
                  placeholder="Gross wt."
                  className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  name="tareWeight"
                  placeholder="Tare wt."
                  className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  step="0.1"
                  name="temperature"
                  placeholder="Temp. (°C)"
                  className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
                />
                <input
                  name="loadNumber"
                  placeholder="Load #"
                  className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
                />
              </div>
            </details>
            <input
              name="podSignedBy"
              placeholder="Signed by (name)"
              required
              className="w-full rounded border border-graphite-950/15 px-3 py-2 text-sm"
            />
            <textarea
              name="podNote"
              placeholder="Notes (optional)"
              rows={2}
              className="w-full rounded border border-graphite-950/15 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded bg-orange-500 px-5 py-2 text-sm font-medium text-graphite-950 hover:bg-orange-600"
            >
              Confirm delivered
            </button>
          </form>
        </div>
      )}

      {delivery.status === "DELIVERED" && (
        <div className="mt-10 rounded-lg border border-green-200 bg-green-50 p-6">
          <h2 className="font-display text-lg font-bold text-graphite-950">
            Proof of delivery
          </h2>
          <p className="mt-2 text-sm text-graphite-900/70">
            Delivered {delivery.deliveredAt && format(delivery.deliveredAt, "d MMM yyyy HH:mm")}
            {delivery.deliveredQuantity != null
              ? ` · ${delivery.deliveredQuantity} ${delivery.job.unit} delivered`
              : ""}
            {delivery.podSignedBy ? ` · Signed by ${delivery.podSignedBy}` : ""}
          </p>
          {(delivery.grossWeight != null || delivery.tareWeight != null) && (
            <p className="mt-1 text-sm text-graphite-900/60">
              Gross {delivery.grossWeight ?? "—"} &middot; Tare {delivery.tareWeight ?? "—"}
              {delivery.temperature != null ? ` · ${delivery.temperature}°C` : ""}
            </p>
          )}
          {delivery.podNote && (
            <p className="mt-2 text-sm text-graphite-900/60">{delivery.podNote}</p>
          )}
          {delivery.podSignatureData && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={delivery.podSignatureData}
              alt="Signature"
              className="mt-3 h-20 w-auto rounded border border-graphite-950/10 bg-white"
            />
          )}
          <Link
            href={`/api/deliveries/${delivery.id}/pod`}
            className="mt-3 inline-block rounded bg-graphite-950 px-4 py-2 text-sm font-medium text-concrete-100 hover:bg-graphite-800"
          >
            Download POD (PDF)
          </Link>
        </div>
      )}

      <details className="mt-10 [&_summary::-webkit-details-marker]:hidden" open>
        <summary className="flex cursor-pointer list-none items-center justify-between border-b border-graphite-950/10 pb-2 font-display text-lg font-bold text-graphite-950">
          Ticket history
          <span aria-hidden className="text-orange-600">&darr;</span>
        </summary>

        {delivery.events.length > 0 && (
          <ul className="mt-4 space-y-2 border-l border-graphite-950/10 pl-4">
            {delivery.events.map((e) => (
              <li key={e.id} className="text-sm">
                <span className="font-medium text-graphite-950">
                  {format(e.createdAt, "HH:mm")}: {statusLabel[e.status]}
                </span>
                {e.note && <span className="text-graphite-900/50"> &middot; {e.note}</span>}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <LiveMap
            positions={delivery.positions.map((p) => ({
              lat: p.lat,
              lng: p.lng,
              recordedAt: p.recordedAt.toISOString(),
            }))}
            endLabel={delivery.status === "DELIVERED" ? "Completed" : "Last seen"}
          />
        </div>
      </details>
      <VehicleRegList regs={knownVehicleRegs} />
    </div>
  );
}
