import Link from "next/link";
import { format } from "date-fns";
import { requireStaff } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { createDelivery, updateDeliveryStatus } from "./actions";

const statusColor: Record<string, string> = {
  ORDERED: "bg-concrete-200 text-graphite-900",
  DISPATCHED: "bg-orange-500/20 text-orange-600",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function DispatchDashboard() {
  await requireStaff();

  const [deliveries, accounts] = await Promise.all([
    prisma.delivery.findMany({
      orderBy: { createdAt: "desc" },
      include: { account: true },
      take: 50,
    }),
    prisma.account.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-graphite-950">Dispatch</h1>

      <div className="mt-8 rounded-lg border border-graphite-950/10 bg-white p-6">
        <h2 className="font-display text-lg font-bold text-graphite-950">New delivery order</h2>
        <form action={createDelivery} className="mt-4 grid gap-3 sm:grid-cols-3">
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
          <input
            name="material"
            placeholder="Material"
            required
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            type="number"
            step="0.1"
            name="quantity"
            placeholder="Quantity"
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
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm sm:col-span-3"
          />
          <input
            name="docketNumber"
            placeholder="Docket number (optional)"
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          />
          <input
            name="vehicleReg"
            placeholder="Vehicle reg (optional)"
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          />
          <input
            name="driverName"
            placeholder="Driver (optional)"
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-orange-500 px-6 py-2.5 text-sm font-medium text-graphite-950 hover:bg-orange-600 sm:col-span-3"
          >
            Create delivery
          </button>
        </form>
      </div>

      <div className="mt-10 space-y-3">
        {deliveries.map((d) => (
          <div
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-graphite-950/10 bg-white p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${statusColor[d.status]}`}
                >
                  {d.status}
                </span>
                <Link
                  href={`/dispatch/deliveries/${d.id}`}
                  className="font-display font-bold text-graphite-950 hover:text-orange-600"
                >
                  {d.material}
                </Link>
              </div>
              <p className="mt-1 text-sm text-graphite-900/60">
                {d.account.name} &middot; {d.quantity} {d.unit} &middot; {d.siteAddress}
                {d.expectedDate ? ` · Expected ${format(d.expectedDate, "d MMM HH:mm")}` : ""}
              </p>
            </div>

            {d.status !== "DELIVERED" && d.status !== "CANCELLED" && (
              <form action={updateDeliveryStatus} className="flex items-center gap-2">
                <input type="hidden" name="deliveryId" value={d.id} />
                <input
                  type="hidden"
                  name="status"
                  value={d.status === "ORDERED" ? "DISPATCHED" : "DELIVERED"}
                />
                <button
                  type="submit"
                  className="rounded border border-graphite-950/20 px-3 py-1.5 text-xs font-medium text-graphite-900 hover:border-orange-500 hover:text-orange-600"
                >
                  Mark {d.status === "ORDERED" ? "dispatched" : "delivered"}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
