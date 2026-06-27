import { DefaultSession } from "next-auth";
import { Plan } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      plan: Plan;
    };
  }

  interface User {
    plan: Plan;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    plan: Plan;
  }
}