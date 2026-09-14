import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireCustomer() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CUSTOMER") redirect("/dispatch");
  return session;
}

export async function requireStaff() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "STAFF" && session.user.role !== "ADMIN") {
    redirect("/portal");
  }
  return session;
}
