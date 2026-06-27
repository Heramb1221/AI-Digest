// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets:  ["latin"],
  variable: "--font-geist-sans",
  display:  "swap",
});

export const metadata: Metadata = {
  title: {
    default:  "AI Digest",
    template: "%s · AI Digest",
  },
  description:
    "Your morning briefing, curated by you, summarised by AI. Add any RSS feed, YouTube channel, subreddit, or newsletter and get a clean daily digest.",
  keywords: ["RSS reader", "AI summariser", "news digest", "newsletter aggregator"],
  authors: [{ name: "Heramb Chaudhari" }],
  manifest: "/manifest.json",
  openGraph: {
    title:       "AI Digest",
    description: "Your morning briefing, curated by you, summarised by AI.",
    type:        "website",
    siteName:    "AI Digest",
  },
  twitter: {
    card:        "summary_large_image",
    title:       "AI Digest",
    description: "Your morning briefing, curated by you, summarised by AI.",
  },
  robots: {
    index:  true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)",  color: "#121212" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
