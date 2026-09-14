import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { homeForRole } from "@/lib/require-role";
import { MobileNav } from "@/components/mobile-nav";

export async function SiteHeader() {
  const session = await auth();
  const isStaff = session?.user?.role === "STAFF" || session?.user?.role === "ADMIN";
  const homeHref = session?.user ? homeForRole(session.user.role) : "/";

  const navLinks =
    session?.user?.role === "DRIVER"
      ? [{ href: "/driver", label: "My Jobs" }]
      : isStaff
        ? [
            { href: "/dispatch", label: "Dispatch" },
            { href: "/dispatch/accounts", label: "Accounts" },
            { href: "/dispatch/drivers", label: "Drivers" },
          ]
        : [];

  return (
    <header className="sticky top-0 z-20 border-b border-graphite-950/10 bg-graphite-950 text-concrete-100">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <MobileNav links={navLinks} />
          <Link href={homeHref} className="flex items-center">
            <Image
              src="/hogan-logo-light.png"
              alt="Hogan"
              width={110}
              height={29}
              className="h-6 w-auto sm:h-7"
              priority
            />
          </Link>
        </div>

        <nav className="hidden items-center gap-8 text-sm sm:flex">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-orange-500">
              {l.label}
            </Link>
          ))}
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
              Staff Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
