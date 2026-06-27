// app/terms/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service — AI Digest" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <nav className="border-b border-border px-6 h-14 flex items-center max-w-3xl mx-auto">
        <Link href="/" className="text-sm font-semibold">AI Digest</Link>
        <span className="mx-2 text-ink-faint">/</span>
        <span className="text-sm text-ink-muted">Terms of Service</span>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold mb-2">Terms of Service</h1>
        <p className="text-sm text-ink-faint mb-8">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

        <div className="prose prose-sm max-w-none text-ink-muted space-y-6">
          <section>
            <h2 className="text-base font-semibold text-ink mb-2">Acceptance</h2>
            <p>By using AI Digest, you agree to these terms. If you disagree, do not use the service.</p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-ink mb-2">Acceptable use</h2>
            <p>You may not use AI Digest to aggregate content you do not have the right to access, to circumvent paywalls, or for any unlawful purpose. You are responsible for the sources you add.</p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-ink mb-2">Payments and refunds</h2>
            <p>Paid plans are billed monthly or annually through Stripe. Refunds are available within 7 days of initial purchase. Cancellation takes effect at the end of the billing period.</p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-ink mb-2">Limitation of liability</h2>
            <p>AI Digest is provided "as is." We make no guarantees about uptime, accuracy of AI summaries, or availability of third-party sources. Our liability is limited to the amount you paid in the past 12 months.</p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-ink mb-2">Changes</h2>
            <p>We may update these terms with 14 days notice. Continued use constitutes acceptance.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
