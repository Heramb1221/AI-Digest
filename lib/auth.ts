// lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { Plan } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),

  // Use JWT so we can read session in middleware without a DB call
  session: { strategy: "jwt" },

  pages: {
    signIn:  "/login",
    newUser: "/onboarding",
    error:   "/login",
  },

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const email    = credentials?.email    as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const user = await db.user.findUnique({
          where:  { email: email.toLowerCase().trim() },
          select: {
            id:           true,
            email:        true,
            name:         true,
            image:        true,
            passwordHash: true,
            plan:         true,
          },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id:    user.id,
          email: user.email,
          name:  user.name,
          image: user.image,
          plan:  user.plan,
        };
      },
    }),
  ],

  callbacks: {
    // Persist plan + id into the JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id!;
        token.plan = user.plan;
      }
      return token;
    },

    // Expose id + plan on the session object (readable in components & API routes)
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id;
        session.user.plan = token.plan;
      }
      return session;
    },
  },
});
