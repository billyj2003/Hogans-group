import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireStaff } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";

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
      {account.siteNotes && (
        <p className="mt-2 text-sm text-graphite-900/60">{account.siteNotes}</p>
      )}

      <div className="mt-10">
        <h2 className="font-display text-lg font-bold text-graphite-950">Jobs</h2>
        <ul className="mt-3 space-y-2">
          {account.jobs.map((j) => (
            <li key={j.id} className="text-sm text-graphite-900/70">
              {format(j.createdAt, "d MMM")} &middot; {j.material} &middot; {j.status}
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
