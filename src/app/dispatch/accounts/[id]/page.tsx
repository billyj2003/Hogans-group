import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireStaff } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { updateAccount } from "../../actions";

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
      jobs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!account) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-graphite-950">{account.name}</h1>
      {account.phone && (
        <p className="mt-1 text-sm text-graphite-900/60">{account.phone}</p>
      )}
      {account.siteNotes && (
        <p className="mt-2 text-sm text-graphite-900/60">{account.siteNotes}</p>
      )}

      <details className="mt-4 rounded-lg border border-graphite-950/10 bg-white p-4 [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none text-sm font-bold text-graphite-900 hover:text-orange-600">
          Edit account
        </summary>
        <form action={updateAccount} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="accountId" value={account.id} />
          <input
            name="name"
            placeholder="Company name"
            defaultValue={account.name}
            required
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            type="tel"
            name="phone"
            placeholder="Callback phone number (optional)"
            defaultValue={account.phone ?? ""}
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm sm:col-span-2"
          />
          <textarea
            name="siteNotes"
            placeholder="Site notes (optional)"
            defaultValue={account.siteNotes ?? ""}
            rows={2}
            className="rounded border border-graphite-950/15 px-3 py-2 text-sm sm:col-span-2"
          />
          <button
            type="submit"
            className="rounded bg-orange-500 px-6 py-2.5 text-sm font-medium text-graphite-950 hover:bg-orange-600 sm:col-span-2"
          >
            Save changes
          </button>
        </form>
      </details>

      <div className="mt-10">
        <h2 className="font-display text-lg font-bold text-graphite-950">Jobs</h2>
        <ul className="mt-3 space-y-2">
          {account.jobs.map((j) => (
            <li key={j.id}>
              <Link
                href={`/dispatch/jobs/${j.id}`}
                className="text-sm text-graphite-900/70 hover:text-orange-600"
              >
                #{j.orderNumber} &middot; {format(j.createdAt, "d MMM")} &middot; {j.material}{" "}
                &middot; {j.status}
              </Link>
            </li>
          ))}
          {account.jobs.length === 0 && (
            <p className="text-sm text-graphite-900/50">No jobs yet.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
