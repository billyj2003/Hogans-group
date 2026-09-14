import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { homeForRole } from "@/lib/require-role";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  if (session?.user) {
    redirect(homeForRole(session.user.role));
  }

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/login?error=invalid");
      }
      throw err;
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-graphite-950">
        Delivery Portal Log In
      </h1>
      <p className="mt-2 text-sm text-graphite-900/60">
        For Hogan Group staff and drivers.
      </p>

      {error && (
        <p className="mt-6 rounded bg-red-50 px-4 py-3 text-sm text-red-700">
          Incorrect email or password.
        </p>
      )}

      <form action={login} className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium text-graphite-900" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded border border-graphite-950/15 bg-white px-4 py-2.5 outline-none focus:border-orange-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite-900" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded border border-graphite-950/15 bg-white px-4 py-2.5 outline-none focus:border-orange-500"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-orange-500 px-6 py-3 font-medium text-graphite-950 transition hover:bg-orange-600"
        >
          Log in
        </button>
      </form>

      <p className="mt-8 rounded bg-concrete-100 px-4 py-3 text-xs text-graphite-900/50">
        Demo &mdash; staff: dispatch@hogan-group.co.uk / staff123 &middot;
        driver: tom.ellis@driver.hogan-group.co.uk / driver123
      </p>
    </div>
  );
}
