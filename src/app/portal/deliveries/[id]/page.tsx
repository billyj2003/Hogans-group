import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireCustomer } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";

export default async function PortalDeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomer();
  const { id } = await params;

  const delivery = await prisma.delivery.findUnique({ where: { id } });
  if (!delivery || delivery.accountId !== session.user.accountId) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
        {delivery.status}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-graphite-950">
        {delivery.material}
      </h1>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-graphite-900/50">Quantity</dt>
          <dd className="font-medium text-graphite-950">
            {delivery.quantity} {delivery.unit}
          </dd>
        </div>
        <div>
          <dt className="text-graphite-900/50">Site address</dt>
          <dd className="font-medium text-graphite-950">{delivery.siteAddress}</dd>
        </div>
        <div>
          <dt className="text-graphite-900/50">Docket</dt>
          <dd className="font-medium text-graphite-950">{delivery.docketNumber ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-graphite-900/50">Vehicle</dt>
          <dd className="font-medium text-graphite-950">
            {delivery.vehicleReg ?? "—"} {delivery.driverName ? `(${delivery.driverName})` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-graphite-900/50">Ordered</dt>
          <dd className="font-medium text-graphite-950">
            {format(delivery.orderedAt, "d MMM yyyy HH:mm")}
          </dd>
        </div>
        <div>
          <dt className="text-graphite-900/50">Expected</dt>
          <dd className="font-medium text-graphite-950">
            {delivery.expectedDate ? format(delivery.expectedDate, "d MMM yyyy HH:mm") : "—"}
          </dd>
        </div>
      </dl>

      {delivery.status === "DELIVERED" && (
        <div className="mt-10 rounded-lg border border-green-200 bg-green-50 p-6">
          <h2 className="font-display text-lg font-bold text-graphite-950">
            Proof of delivery
          </h2>
          <p className="mt-2 text-sm text-graphite-900/70">
            Delivered {delivery.deliveredAt && format(delivery.deliveredAt, "d MMM yyyy HH:mm")}
            {delivery.podSignedBy ? ` · Signed by ${delivery.podSignedBy}` : ""}
          </p>
          {delivery.podNote && (
            <p className="mt-2 text-sm text-graphite-900/60">{delivery.podNote}</p>
          )}
        </div>
      )}
    </div>
  );
}
