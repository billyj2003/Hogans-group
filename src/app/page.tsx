import Image from "next/image";
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
    <div>
      <div className="relative overflow-hidden bg-graphite-950 text-concrete-100">
        <Image
          src="/site-photo-2.webp"
          alt=""
          fill
          priority
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-graphite-950/70 via-graphite-950/85 to-graphite-950" />

        <div className="h-1.5 diagonal-hazard" />
        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center">
          <Image
            src="/hogan-logo-light.png"
            alt="Hogan"
            width={180}
            height={47}
            className="mx-auto h-10 w-auto"
            priority
          />
          <h1 className="mt-6 font-display text-5xl font-bold leading-tight sm:text-6xl">
            Delivery Portal
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-concrete-100/70">
            Track material deliveries in real time &mdash; from order to
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
        <div className="relative h-1.5 diagonal-hazard" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2">
        <div className="relative aspect-[4/3] sm:aspect-auto sm:h-80">
          <Image src="/site-photo-1.webp" alt="Hogan Asphalt plant" fill className="object-cover" />
        </div>
        <div className="relative aspect-[4/3] sm:aspect-auto sm:h-80">
          <Image src="/site-photo-2.webp" alt="Hogan Asphalt plant" fill className="object-cover" />
        </div>
      </div>
    </div>
  );
}
