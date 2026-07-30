import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "", priority: 1, freq: "weekly" },
    { path: "/co-tenancy", priority: 0.9, freq: "monthly" },
    { path: "/platform", priority: 0.9, freq: "monthly" },
    { path: "/tenants", priority: 0.9, freq: "monthly" },
    { path: "/landlords", priority: 0.4, freq: "monthly" },
    { path: "/demo", priority: 0.8, freq: "monthly" },
    { path: "/company", priority: 0.6, freq: "yearly" },
    { path: "/security", priority: 0.5, freq: "yearly" },
  ];

  const now = new Date();
  return routes.map((r) => ({
    url: `${site.url}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
