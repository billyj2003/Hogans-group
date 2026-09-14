import Link from "next/link";
import { requireStaff } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { createAccount } from "../actions";

export default async function AccountsPage() {
  await requireStaff();

  const accounts = await prisma.account.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { deliveries: true, users: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-graphite-950">Accounts</h1>

      <div className="mt-8 rounded-lg border border-graphite-950/10 bg-white p-6">
        <h2 className="font-display text-lg font-bold text-graphite-950">New account</h2>
        <form action={createAccount} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            placeholder="Company name"
            required
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm sm:col-span-2"
          />
          <textarea
            name="siteNotes"
            placeholder="Site notes (optional)"
            rows={2}
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm sm:col-span-2"
          />
          <button
            type="submit"
            className="rounded bg-orange-500 px-6 py-2.5 text-sm font-medium text-graphite-950 hover:bg-orange-600 sm:col-span-2"
          >
            Create account
          </button>
        </form>
      </div>

      <div className="mt-10 space-y-3">
        {accounts.map((a) => (
          <Link
            key={a.id}
            href={`/dispatch/accounts/${a.id}`}
            className="flex items-center justify-between rounded-lg border border-graphite-950/10 bg-white p-4 transition hover:border-orange-500"
          >
            <span className="font-display font-bold text-graphite-950">{a.name}</span>
            <span className="text-sm text-graphite-900/50">
              {a._count.users} user{a._count.users !== 1 ? "s" : ""} &middot;{" "}
              {a._count.deliveries} deliveries
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
