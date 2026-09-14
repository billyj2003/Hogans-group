import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireStaff } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { recordProofOfDelivery, updateDeliveryStatus } from "../../actions";

export default async function DispatchDeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;

  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: { account: true },
  });
  if (!delivery) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
        {delivery.status}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-graphite-950">
        {delivery.material}
      </h1>
      <p className="mt-1 text-graphite-900/60">{delivery.account.name}</p>

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

      {delivery.status !== "DELIVERED" && delivery.status !== "CANCELLED" && (
        <div className="mt-8 flex flex-wrap gap-3">
          {delivery.status === "ORDERED" && (
            <form action={updateDeliveryStatus}>
              <input type="hidden" name="deliveryId" value={delivery.id} />
              <input type="hidden" name="status" value="DISPATCHED" />
              <button className="rounded bg-graphite-950 px-5 py-2 text-sm font-medium text-concrete-100 hover:bg-graphite-800">
                Mark dispatched
              </button>
            </form>
          )}
          <form action={updateDeliveryStatus}>
            <input type="hidden" name="deliveryId" value={delivery.id} />
            <input type="hidden" name="status" value="CANCELLED" />
            <button className="rounded border border-graphite-950/20 px-5 py-2 text-sm font-medium text-graphite-900 hover:border-red-500 hover:text-red-600">
              Cancel order
            </button>
          </form>
        </div>
      )}

      {delivery.status === "DISPATCHED" && (
        <div className="mt-10 rounded-lg border border-graphite-950/10 bg-concrete-100 p-6">
          <h2 className="font-display text-lg font-bold text-graphite-950">
            Record proof of delivery
          </h2>
          <form action={recordProofOfDelivery} className="mt-4 space-y-3">
            <input type="hidden" name="deliveryId" value={delivery.id} />
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
