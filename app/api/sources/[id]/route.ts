// app/api/sources/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db }   from "@/lib/db";

// ── DELETE — soft-delete (sets isActive: false) ───────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId  = session!.user.id;

  const source = await db.source.findFirst({
    where: { id: params.id, userId },
  });

  if (!source) {
    return NextResponse.json({ error: "Source not found." }, { status: 404 });
  }

  // Soft-delete — keep articles intact for history
  await db.source.update({
    where: { id: params.id },
    data:  { isActive: false },
  });

  return new NextResponse(null, { status: 204 });
}

// ── PATCH — rename a source ───────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId  = session!.user.id;
  const body    = await req.json();

  const source = await db.source.findFirst({
    where: { id: params.id, userId },
  });

  if (!source) {
    return NextResponse.json({ error: "Source not found." }, { status: 404 });
  }

  const updated = await db.source.update({
    where: { id: params.id },
    data:  {
      name: body.name?.trim().slice(0, 100) ?? source.name,
    },
  });

  return NextResponse.json(updated);
}
