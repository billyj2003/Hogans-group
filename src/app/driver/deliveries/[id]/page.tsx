import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireDriver } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { GeoReporter } from "@/components/geo-reporter";
import {
  driverCompleteDelivery,
  driverMarkDispatched,
  driverMarkOnSite,
  driverMarkUnloading,
} from "../../actions";

export default async function DriverDeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireDriver();
  const { id } = await params;

  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: { job: { include: { account: true } } },
  });
  if (!delivery || delivery.driverId !== session.user.id) notFound();

  const isTracking = !["DELIVERED", "CANCELLED", "ORDERED"].includes(delivery.status);

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
        {delivery.status.replace("_", " ")}
      </p>
      <h1 className="mt-2 font-display text-2xl font-bold text-graphite-950">
        {delivery.job.material}
      </h1>
      <p className="mt-1 text-graphite-900/60">{delivery.job.account.name}</p>

      <div className="mt-4">
        <GeoReporter deliveryId={delivery.id} active={isTracking} />
      </div>

      <dl className="mt-6 space-y-3 text-sm">
        <div>
          <dt className="text-graphite-900/50">Planned quantity</dt>
          <dd className="font-medium text-graphite-950">
            {delivery.quantity} {delivery.job.unit}
          </dd>
        </div>
        <div>
          <dt className="text-graphite-900/50">Site address</dt>
          <dd className="font-medium text-graphite-950">{delivery.job.siteAddress}</dd>
        </div>
        {delivery.job.docketNumber && (
          <div>
            <dt className="text-graphite-900/50">Docket / PO</dt>
            <dd className="font-medium text-graphite-950">{delivery.job.docketNumber}</dd>
          </div>
        )}
        {delivery.vehicleReg && (
          <div>
            <dt className="text-graphite-900/50">Vehicle</dt>
            <dd className="font-medium text-graphite-950">{delivery.vehicleReg}</dd>
          </div>
        )}
      </dl>

      <div className="mt-8 space-y-3">
        {delivery.status === "ORDERED" && (
          <form action={driverMarkDispatched}>
            <input type="hidden" name="deliveryId" value={delivery.id} />
            <button className="w-full rounded bg-graphite-950 py-4 text-base font-bold text-concrete-100 hover:bg-graphite-800">
              Start delivery (mark dispatched)
            </button>
          </form>
        )}

        {delivery.status === "DISPATCHED" && (
          <form action={driverMarkOnSite}>
            <input type="hidden" name="deliveryId" value={delivery.id} />
            <button className="w-full rounded bg-graphite-950 py-4 text-base font-bold text-concrete-100 hover:bg-graphite-800">
              Arrived on site
            </button>
          </form>
        )}

        {delivery.status === "ON_SITE" && (
          <form action={driverMarkUnloading}>
            <input type="hidden" name="deliveryId" value={delivery.id} />
            <button className="w-full rounded bg-graphite-950 py-4 text-base font-bold text-concrete-100 hover:bg-graphite-800">
              Start unloading
            </button>
          </form>
        )}

        {delivery.status === "UNLOADING" && (
          <form action={driverCompleteDelivery} className="space-y-3 rounded-lg border border-graphite-950/10 bg-white p-4">
            <h2 className="font-display text-lg font-bold text-graphite-950">
              Finish unloading
            </h2>
            <input type="hidden" name="deliveryId" value={delivery.id} />
            <div>
              <label className="text-sm font-medium text-graphite-900">
                Exact {delivery.job.unit} delivered
              </label>
              <input
                type="number"
                step="0.01"
                name="deliveredQuantity"
                defaultValue={delivery.quantity}
                required
                className="mt-1 w-full rounded border border-graphite-950/15 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-graphite-900">
                Signed for by (name)
              </label>
              <input
                name="podSignedBy"
                required
                className="mt-1 w-full rounded border border-graphite-950/15 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-graphite-900">Notes (optional)</label>
              <textarea
                name="podNote"
                rows={2}
                className="mt-1 w-full rounded border border-graphite-950/15 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded bg-orange-500 py-3 text-base font-bold text-graphite-950 hover:bg-orange-600"
            >
              Confirm delivered
            </button>
          </form>
        )}

        {delivery.status === "DELIVERED" && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-graphite-900/70">
            Delivered {delivery.deliveredAt && format(delivery.deliveredAt, "d MMM HH:mm")}
            {delivery.deliveredQuantity != null &&
              ` · ${delivery.deliveredQuantity} ${delivery.job.unit} delivered`}
          </div>
        )}
      </div>
    </div>
  );
}
