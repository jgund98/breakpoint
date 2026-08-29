/**
 * THE PORTFOLIO REGISTRY — server-only.
 *
 * Resolves an org slug to its evaluated portfolio bundle. This module
 * imports every client's dataset, so it must NEVER be imported from a
 * client component: the "server-only" marker makes that a build error
 * instead of a silent multi-megabyte, cross-tenant bundle leak.
 */
import "server-only";
import {
  afBundle,
  buildPortfolio,
  type PortfolioBundle,
  type PortfolioFile,
} from "./portfolio";
import meridianRaw from "./data/meridian-portfolio.json";

const meridianBundle = buildPortfolio(
  meridianRaw as unknown as PortfolioFile,
  {
    name: "Meridian Outfitters",
    slug: "meridian-outfitters",
    descriptor: "Specialty apparel · 65 watched locations",
    team: [
      { name: "J. Calloway", role: "VP, Real Estate", initials: "JC" },
      { name: "P. Reyes", role: "Lease Analyst", initials: "PR" },
      { name: "D. Huang", role: "Counsel", initials: "DH" },
    ],
  },
);

const REGISTRY: Record<string, PortfolioBundle> = {
  "abercrombie-fitch": afBundle,
  "meridian-outfitters": meridianBundle,
};

/** The org's evaluated portfolio, or null when none is imported. */
export function portfolioFor(slug: string | null | undefined): PortfolioBundle | null {
  return (slug && REGISTRY[slug]) || null;
}

export const PORTFOLIO_SLUGS = Object.keys(REGISTRY);
