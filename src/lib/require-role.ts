import { redirect } from "next/navigation";
import { auth } from "@/auth";

export function homeForRole(role: string) {
  if (role === "CUSTOMER") return "/portal";
  if (role === "DRIVER") return "/driver";
  return "/dispatch";
}

export async function requireCustomer() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CUSTOMER") redirect(homeForRole(session.user.role));
  return session;
}

export async function requireStaff() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "STAFF" && session.user.role !== "ADMIN") {
    redirect(homeForRole(session.user.role));
  }
  return session;
}

export async function requireDriver() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "DRIVER") redirect(homeForRole(session.user.role));
  return session;
}
