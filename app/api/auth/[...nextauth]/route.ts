// app/api/auth/[...nextauth]/route.ts
// This single file handles all NextAuth endpoints:
//   POST /api/auth/signin
//   POST /api/auth/signout
//   GET  /api/auth/session
//   GET  /api/auth/csrf
//   GET  /api/auth/providers
//   GET  /api/auth/callback/:provider

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
