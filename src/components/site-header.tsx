import Link from "next/link";
import { auth, signOut } from "@/auth";
import { homeForRole } from "@/lib/require-role";

export async function SiteHeader() {
  const session = await auth();
  const isStaff = session?.user?.role === "STAFF" || session?.user?.role === "ADMIN";
  const homeHref = session?.user ? homeForRole(session.user.role) : "/";

  return (
    <header className="sticky top-0 z-20 border-b border-graphite-950/10 bg-graphite-950 text-concrete-100">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href={homeHref} className="font-display text-lg font-bold tracking-tight">
          HOGAN <span className="text-orange-500">GROUP</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm sm:flex">
          {session?.user?.role === "CUSTOMER" && (
            <Link href="/portal" className="hover:text-orange-500">
              My Deliveries
            </Link>
          )}
          {session?.user?.role === "DRIVER" && (
            <Link href="/driver" className="hover:text-orange-500">
              My Jobs
            </Link>
          )}
          {isStaff && (
            <>
              <Link href="/dispatch" className="hover:text-orange-500">
                Dispatch
              </Link>
              <Link href="/dispatch/accounts" className="hover:text-orange-500">
                Accounts
              </Link>
              <Link href="/dispatch/drivers" className="hover:text-orange-500">
                Drivers
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-4 text-sm">
          {session?.user ? (
            <>
              <span className="hidden text-concrete-100/60 sm:inline">
                {session.user.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="rounded border border-concrete-100/30 px-4 py-1.5 transition hover:border-orange-500 hover:text-orange-500">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded bg-orange-500 px-4 py-1.5 font-medium text-graphite-950 transition hover:bg-orange-600"
            >
              Portal Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
