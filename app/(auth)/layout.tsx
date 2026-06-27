// app/(auth)/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Minimal nav */}
      <header className="flex items-center px-6 h-14 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight">AI Digest</span>
        </Link>
      </header>

      {/* Centred auth card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <footer className="py-4 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} AI Digest
      </footer>
    </div>
  );
}
