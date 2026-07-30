/**
 * Brand + site constants.
 *
 * NOTE ON CLAIMS: this is a new company. There are no customers to
 * name, no logos to show, and no metrics to quote. Everything stated
 * here is either (a) a fact about the retail leasing industry, with a
 * source, or (b) a description of what the product does. Nothing
 * claims traction we don't have. All product numbers shown on the site
 * are labelled as illustrative sample data.
 */

export const site = {
  name: "Breakpoint",
  category: "Co-tenancy Intelligence",
  /** Placeholder domain — swap before any deploy. */
  domain: "breakpoint.re",
  url: "https://breakpoint.re",
  tagline: "Know the hour it breaks.",
  description:
    "Breakpoint monitors co-tenancy clauses across the centers you occupy, flags when a lease test may have failed, and hands your team the estimated impact with the evidence behind it.",
  email: "hello@breakpoint.re",
  builtBy: {
    name: "Epic Dev Solutions",
    url: "https://epicdevsolutions.com",
  },
} as const;

export const nav = [
  { label: "Platform", href: "/platform" },
  { label: "For Retailers", href: "/tenants" },
  { label: "Field Guide", href: "/co-tenancy" },
  { label: "Company", href: "/company" },
] as const;

export const footerNav = [
  {
    heading: "Platform",
    links: [
      { label: "How it works", href: "/platform" },
      { label: "Clause abstraction", href: "/platform#abstract" },
      { label: "Center monitoring", href: "/platform#watch" },
      { label: "Trigger detection", href: "/platform#trigger" },
      { label: "Review packages", href: "/platform#package" },
      { label: "Security & trust", href: "/security" },
    ],
  },
  {
    heading: "Who it's for",
    links: [
      { label: "Retail tenants", href: "/tenants" },
      { label: "Lease accounting", href: "/tenants#accounting" },
      { label: "Real estate teams", href: "/tenants" },
      { label: "Finance & legal", href: "/tenants#accounting" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "The Co-Tenancy Field Guide", href: "/co-tenancy" },
      { label: "Opening co-tenancy", href: "/co-tenancy#opening" },
      { label: "Ongoing co-tenancy", href: "/co-tenancy#ongoing" },
      { label: "Remedies & alternative rent", href: "/co-tenancy#remedies" },
      { label: "Glossary", href: "/co-tenancy#glossary" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/company" },
      { label: "Book a walkthrough", href: "/demo" },
      { label: "Contact", href: `mailto:${site.email}` },
    ],
  },
] as const;

/**
 * The systems Breakpoint sits on top of rather than replaces. This is a
 * positioning statement about our own architecture, not a claim of
 * partnership or certification with any of these vendors.
 */
export const coexistsWith = [
  "Visual Lease",
  "Tango",
  "CoStar Real Estate Manager",
  "MRI",
  "Yardi",
  "IBM TRIRIGA",
  "Lucernex",
] as const;
