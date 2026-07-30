import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { site } from "@/lib/site";
import { Header } from "@/components/chrome/Header";
import { Footer } from "@/components/chrome/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const interTight = Inter_Tight({
  // latin-ext for the dotless ı the wordmark is built on
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter-tight",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Breakpoint — Retail Lease Intelligence",
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  keywords: [
    "co-tenancy",
    "cotenancy clause",
    "co-tenancy violation",
    "retail lease administration",
    "alternative rent",
    "occupancy threshold",
    "anchor tenant",
    "lease abstraction",
    "percentage rent",
    "shopping center occupancy",
  ],
  authors: [{ name: site.name }],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: "Breakpoint — Retail Lease Intelligence",
    description: site.description,
    url: site.url,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Breakpoint — Retail Lease Intelligence",
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#2f2a9b",
  colorScheme: "light",
};

const orgSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}/#organization`,
      name: site.name,
      legalName: "Breakpoint Intelligence, Inc.",
      url: site.url,
      description: site.description,
      email: site.email,
      slogan: site.tagline,
    },
    {
      "@type": "SoftwareApplication",
      name: site.name,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Lease administration",
      operatingSystem: "Web",
      url: site.url,
      description:
        "Co-tenancy monitoring for retail leases. Abstracts co-tenancy clauses, reconstructs shopping center occupancy, evaluates every test nightly and assembles the claim packet when one fails.",
      publisher: { "@id": `${site.url}/#organization` },
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: "0",
        description: "Pricing on application. Book a walkthrough.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable}`}
    >
      <body className="bg-canvas text-ink antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-petrol-800 focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-cream"
        >
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
