// lib/errors.ts
// Typed application error classes.
// API routes catch these and convert them to appropriate HTTP responses.
//
// Usage:
//   throw new NotFoundError("Source not found");
//   throw new ForbiddenError("Plan upgrade required", { upgrade: true });

export class AppError extends Error {
  constructor(
    message:                 string,
    public readonly status:  number = 500,
    public readonly code?:   string,
    public readonly meta?:   Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", meta?: Record<string, unknown>) {
    super(message, 403, "FORBIDDEN", meta);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly field?: string) {
    super(message, 400, "VALIDATION_ERROR", field ? { field } : undefined);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, public readonly retryAfterMs?: number) {
    super(message, 429, "RATE_LIMITED", retryAfterMs ? { retryAfterMs } : undefined);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

// ─── Response helper ──────────────────────────────────────────────────────────

/**
 * Converts any thrown error into a NextResponse.
 * Use at the end of route handler catch blocks.
 */
export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      { error: error.message, code: error.code, ...error.meta },
      { status: error.status }
    );
  }

  // Prisma unique constraint violation → conflict
  if ((error as any)?.code === "P2002") {
    return Response.json({ error: "Already exists.", code: "CONFLICT" }, { status: 409 });
  }

  // Prisma record not found
  if ((error as any)?.code === "P2025") {
    return Response.json({ error: "Not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  console.error("[unhandled error]", error);
  return Response.json({ error: "Internal server error." }, { status: 500 });
}
