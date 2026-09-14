import Link from "next/link";
import { format } from "date-fns";
import { requireStaff } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/auto-refresh";
import { createDelivery, updateDeliveryStatus } from "./actions";

const statusColor: Record<string, string> = {
  ORDERED: "bg-concrete-200 text-graphite-900",
  DISPATCHED: "bg-orange-500/20 text-orange-600",
  ON_SITE: "bg-orange-500/20 text-orange-600",
  UNLOADING: "bg-orange-500/20 text-orange-600",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const nextStatus: Record<string, string> = {
  ORDERED: "DISPATCHED",
  DISPATCHED: "ON_SITE",
  ON_SITE: "UNLOADING",
  UNLOADING: "DELIVERED",
};

const nextStatusLabel: Record<string, string> = {
  ORDERED: "Mark dispatched",
  DISPATCHED: "Mark on site",
  ON_SITE: "Mark unloading",
  UNLOADING: "Mark delivered",
};

export default async function DispatchDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string }>;
}) {
  await requireStaff();
  const { q, status, from, to } = await searchParams;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { material: { contains: q } },
      { docketNumber: { contains: q } },
      { siteAddress: { contains: q } },
      { account: { name: { contains: q } } },
    ];
  }
  if (status) where.status = status;
  if (from || to) {
    where.expectedDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [deliveries, accounts, drivers] = await Promise.all([
    prisma.delivery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { account: true, driver: true },
      take: 50,
    }),
    prisma.account.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "DRIVER" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-graphite-950">Dispatch</h1>
        <AutoRefresh intervalSeconds={20} />
      </div>

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
          <select
            name="driverId"
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          >
            <option value="">Assign driver later&hellip;</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded bg-orange-500 px-6 py-2.5 text-sm font-medium text-graphite-950 hover:bg-orange-600 sm:col-span-3"
          >
            Create delivery
          </button>
        </form>
      </div>

      <form
        method="get"
        className="mt-8 flex flex-wrap items-end gap-3 rounded-lg border border-graphite-950/10 bg-white p-4"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-graphite-900/60">
            Search account, docket, or site
          </label>
          <input
            name="q"
            defaultValue={q}
            className="mt-1 w-full rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-graphite-900/60">Status</label>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="mt-1 rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
          >
            <option value="">Any</option>
            <option value="ORDERED">Ordered</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="ON_SITE">On site</option>
            <option value="UNLOADING">Unloading</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-graphite-900/60">Expected from</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="mt-1 rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-graphite-900/60">Expected to</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="mt-1 rounded border border-graphite-950/15 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-graphite-950 px-4 py-1.5 text-sm font-medium text-concrete-100 hover:bg-graphite-800"
        >
          Filter
        </button>
        {(q || status || from || to) && (
          <Link href="/dispatch" className="text-sm text-graphite-900/60 underline">
            Reset
          </Link>
        )}
      </form>

      <div className="mt-8 space-y-3">
        {deliveries.length === 0 && (
          <p className="text-sm text-graphite-900/50">No deliveries match those filters.</p>
        )}
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
                  {d.status.replace("_", " ")}
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
                {d.driver ? ` · ${d.driver.name}` : ""}
                {d.expectedDate ? ` · Expected ${format(d.expectedDate, "d MMM HH:mm")}` : ""}
              </p>
            </div>

            {nextStatus[d.status] && (
              <form action={updateDeliveryStatus} className="flex items-center gap-2">
                <input type="hidden" name="deliveryId" value={d.id} />
                <input type="hidden" name="status" value={nextStatus[d.status]} />
                <button
                  type="submit"
                  className="rounded border border-graphite-950/20 px-3 py-1.5 text-xs font-medium text-graphite-900 hover:border-orange-500 hover:text-orange-600"
                >
                  {nextStatusLabel[d.status]}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
