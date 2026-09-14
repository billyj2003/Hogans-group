import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireCustomer } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/auto-refresh";
import { LiveMap } from "@/components/live-map";

const statusLabel: Record<string, string> = {
  ORDERED: "Ordered",
  DISPATCHED: "Dispatched",
  ON_SITE: "On site",
  UNLOADING: "Unloading",
  DELIVERED: "Delivery complete",
  CANCELLED: "Cancelled",
};

export default async function PortalDeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string; deliveryId: string }>;
}) {
  const session = await requireCustomer();
  const { id: jobId, deliveryId } = await params;

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      job: true,
      driver: true,
      events: { orderBy: { createdAt: "asc" } },
      positions: { orderBy: { recordedAt: "asc" } },
    },
  });
  if (
    !delivery ||
    delivery.jobId !== jobId ||
    delivery.job.accountId !== session.user.accountId
  ) {
    notFound();
  }

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
      <Link
        href={`/portal/jobs/${jobId}`}
        className="text-sm text-graphite-900/50 hover:text-orange-600"
      >
        &larr; {delivery.job.material}
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
          {delivery.status}
        </p>
        <AutoRefresh intervalSeconds={20} />
      </div>
      <h1 className="mt-2 font-display text-3xl font-bold text-graphite-950">
        {delivery.quantity} {delivery.job.unit}
      </h1>
      <p className="mt-1 text-graphite-900/60">{delivery.job.siteAddress}</p>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-graphite-900/50">Driver</dt>
          <dd className="font-medium text-graphite-950">{delivery.driver?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-graphite-900/50">Vehicle reg.</dt>
          <dd className="font-medium text-graphite-950">{delivery.vehicleReg ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-graphite-900/50">Docket / PO</dt>
          <dd className="font-medium text-graphite-950">{delivery.job.docketNumber ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-graphite-900/50">Ordered</dt>
          <dd className="font-medium text-graphite-950">
            {format(delivery.orderedAt, "d MMM yyyy HH:mm")}
          </dd>
        </div>
        {onsiteLabel && (
          <div>
            <dt className="text-graphite-900/50">Time onsite</dt>
            <dd className="font-medium text-graphite-950">{onsiteLabel}</dd>
          </div>
        )}
      </dl>

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
          {delivery.podNote && (
            <p className="mt-2 text-sm text-graphite-900/60">{delivery.podNote}</p>
          )}
          <Link
            href={`/api/deliveries/${delivery.id}/pod`}
            className="mt-3 inline-block rounded bg-graphite-950 px-4 py-2 text-sm font-medium text-concrete-100 hover:bg-graphite-800"
          >
            Download POD (PDF)
          </Link>
        </div>
      )}

      {delivery.positions.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-lg font-bold text-graphite-950">Live tracker</h2>
          <div className="mt-3">
            <LiveMap
              positions={delivery.positions.map((p) => ({
                lat: p.lat,
                lng: p.lng,
                recordedAt: p.recordedAt.toISOString(),
              }))}
            />
          </div>
        </div>
      )}

      {delivery.events.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-lg font-bold text-graphite-950">Ticket history</h2>
          <ul className="mt-3 space-y-2 border-l border-graphite-950/10 pl-4">
            {delivery.events.map((e) => (
              <li key={e.id} className="text-sm">
                <span className="font-medium text-graphite-950">
                  {format(e.createdAt, "HH:mm")}: {statusLabel[e.status]}
                </span>
                {e.note && <span className="text-graphite-900/50"> &middot; {e.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
