import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { homeForRole } from "@/lib/require-role";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect(homeForRole(session.user.role));
  }

  return (
    <div className="relative overflow-hidden bg-graphite-950 text-concrete-100">
      <div className="h-1.5 diagonal-hazard" />
      <div className="mx-auto max-w-4xl px-6 py-28 text-center">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-orange-500">
          Hogan Group
        </p>
        <h1 className="mt-4 font-display text-5xl font-bold leading-tight sm:text-6xl">
          Delivery Portal
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-concrete-100/70">
          Track your material deliveries in real time &mdash; from order to
          dispatch to drop-off, with docket and proof-of-delivery details in
          one place.
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            href="/login"
            className="rounded bg-orange-500 px-8 py-3 font-medium text-graphite-950 transition hover:bg-orange-600"
          >
            Log in to your account
          </Link>
        </div>
      </div>
      <div className="h-1.5 diagonal-hazard" />
    </div>
  );
}
