import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireStaff } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { createAccountUser } from "../../actions";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;

  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      users: true,
      deliveries: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!account) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-graphite-950">{account.name}</h1>
      {account.siteNotes && (
        <p className="mt-2 text-sm text-graphite-900/60">{account.siteNotes}</p>
      )}

      <div className="mt-10">
        <h2 className="font-display text-lg font-bold text-graphite-950">Portal users</h2>
        <ul className="mt-3 space-y-2">
          {account.users.map((u) => (
            <li key={u.id} className="text-sm text-graphite-900/80">
              {u.name} &middot; <span className="text-graphite-900/50">{u.email}</span>
            </li>
          ))}
        </ul>

        <form
          action={createAccountUser}
          className="mt-4 grid gap-3 rounded-lg border border-graphite-950/10 bg-white p-4 sm:grid-cols-3"
        >
          <input type="hidden" name="accountId" value={account.id} />
          <input
            name="name"
            placeholder="Name"
            required
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          />
          <input
            name="password"
            placeholder="Temporary password"
            required
            minLength={6}
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-graphite-950 hover:bg-orange-600 sm:col-span-3"
          >
            Add portal user
          </button>
        </form>
      </div>

      <div className="mt-10">
        <h2 className="font-display text-lg font-bold text-graphite-950">Deliveries</h2>
        <ul className="mt-3 space-y-2">
          {account.deliveries.map((d) => (
            <li key={d.id} className="text-sm text-graphite-900/70">
              {format(d.createdAt, "d MMM")} &middot; {d.material} &middot; {d.status}
            </li>
          ))}
          {account.deliveries.length === 0 && (
            <p className="text-sm text-graphite-900/50">No deliveries yet.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
