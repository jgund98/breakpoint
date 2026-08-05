/**
 * Pulls the source photography set. Pexels license permits commercial
 * use without attribution; we still record what each file is and where
 * it came from in raw-assets/CREDITS.txt.
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "raw-assets", "photos");

const SET = [
  // --- bright, working retail centers ---
  { id: "33803366", slug: "mall-portland-skylight", note: "Enclosed mall, skylight roof, Portland OR" },
  { id: "13100935", slug: "mall-overhead-shoppers", note: "Overhead mall concourse, escalators, shoppers" },
  { id: "8337785", slug: "mall-glass-ceiling", note: "Upscale mall interior, glass ceiling" },
  { id: "13425897", slug: "mall-greenery-shops", note: "Contemporary center, trendy shops, greenery" },
  { id: "32549955", slug: "storefront-apparel", note: "Modern apparel storefront" },

  // --- the problem: centers that have gone quiet ---
  { id: "35437549", slug: "mall-closed-stores", note: "Mall interior, stores closed" },
  { id: "27452439", slug: "mall-deserted-escalator", note: "Deserted mall, escalator, shuttered fronts" },
  { id: "27452443", slug: "mall-closed-concourse", note: "Mall concourse with closed stores" },
  { id: "32094984", slug: "mall-empty-corridor", note: "Empty mall corridor, reflective floor" },

  // --- the asset, from above ---
  { id: "13769679", slug: "aerial-oceanside-ca", note: "Aerial, retail centers, Oceanside CA" },
  { id: "21207273", slug: "aerial-suburban-center", note: "Aerial suburban shopping center" },
  { id: "34790896", slug: "aerial-mall-night", note: "Aerial mall at night, lit parking field" },

  // --- the people who do this work ---
  { id: "4872034", slug: "team-reviewing-docs", note: "Three professionals reviewing documents" },
  { id: "8730966", slug: "team-collaborating", note: "Colleagues reviewing documents" },
  { id: "7433874", slug: "financial-documents", note: "Reviewing financial documents" },
  { id: "12903178", slug: "two-colleagues-discussion", note: "Two colleagues in discussion" },
];

const url = (id, w) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

fs.mkdirSync(OUT, { recursive: true });

const credits = [];
let ok = 0;

for (const item of SET) {
  const dest = path.join(OUT, `${item.slug}.jpg`);
  try {
    const res = await fetch(url(item.id, 2400), {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log(`✓ ${item.slug.padEnd(28)} ${(buf.length / 1024).toFixed(0)} KB`);
    credits.push(`${item.slug}.jpg — ${item.note} — Pexels #${item.id} — https://www.pexels.com/photo/${item.id}/`);
    ok++;
  } catch (e) {
    console.log(`✗ ${item.slug.padEnd(28)} ${e.message}`);
  }
}

fs.writeFileSync(
  path.join(process.cwd(), "raw-assets", "CREDITS.txt"),
  `Photography — Pexels (free for commercial use, no attribution required).\nRecorded here for provenance.\n\n${credits.join("\n")}\n`,
);

console.log(`\n${ok}/${SET.length} downloaded → ${OUT}`);
