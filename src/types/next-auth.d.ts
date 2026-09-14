import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      accountId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    accountId?: string | null;
  }
}
