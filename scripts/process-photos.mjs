/**
 * Curates and compresses the source photography into public/photos.
 * Rejected frames are listed with the reason so the decision is on the
 * record: foreign signage, real trading brands, or stock cliché.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "raw-assets", "photos");
const OUT = path.join(process.cwd(), "public", "photos");

const KEEP = [
  // hero — a portfolio's worth of American retail, from the air
  { file: "aerial-oceanside-ca", w: 2000, q: 68 },
  { file: "aerial-suburban-center", w: 1600, q: 74 },

  // centers that are working
  { file: "mall-greenery-shops", w: 1600, q: 74 },
  { file: "mall-overhead-shoppers", w: 1300, q: 72 },
  { file: "mall-fashion-outlets", w: 1400, q: 74 },
  { file: "shoppers-browsing", w: 1400, q: 76 },
  { file: "store-bright-racks", w: 1200, q: 76 },

  // centers that are not
  { file: "mall-closed-stores", w: 1800, q: 74 },
  { file: "mall-closed-concourse", w: 1600, q: 74 },
  { file: "mall-deserted-escalator", w: 1200, q: 74 },
  { file: "mall-portland-skylight", w: 1400, q: 74 },

  // the people who carry this work
  { file: "meeting-boardroom", w: 1600, q: 76 },
  { file: "conference-glass-skyline", w: 1400, q: 76 },
  { file: "team-collaborating", w: 1400, q: 76 },
  { file: "woman-laptop-office", w: 1400, q: 76 },
  { file: "boardroom-three-pros", w: 1400, q: 76 },
  { file: "financial-documents", w: 1200, q: 76 },
];

const REJECTED = {
  "aerial-mall-night": "Cyrillic tenant signage — not a US center",
  "mall-empty-corridor": "French wayfinding (‘PHOTO OBJET’) — not a US center",
  "mall-glass-ceiling": "Identifiable centre name in frame",
  "storefront-apparel": "Shows a real trading brand's store",
  "team-reviewing-docs": "Stock cliché, distressed-wall backdrop",
  "department-store-aisle": "Foreign currency on price signage",
  "two-colleagues-discussion": "Tight identifiable faces — implies a customer",
};

fs.mkdirSync(OUT, { recursive: true });

let total = 0;
for (const item of KEEP) {
  const src = path.join(SRC, `${item.file}.jpg`);
  if (!fs.existsSync(src)) {
    console.log(`✗ missing ${item.file}`);
    continue;
  }
  const dest = path.join(OUT, `${item.file}.jpg`);
  await sharp(src)
    .resize(item.w, null, { withoutEnlargement: true })
    .jpeg({ quality: item.q, mozjpeg: true, progressive: true })
    .toFile(dest);
  const kb = fs.statSync(dest).size / 1024;
  total += kb;
  const meta = await sharp(dest).metadata();
  console.log(
    `✓ ${item.file.padEnd(26)} ${meta.width}×${meta.height}  ${kb.toFixed(0)} KB${kb > 400 ? "  ⚠ over 400KB" : ""}`,
  );
}

console.log(`\nrejected:`);
for (const [f, why] of Object.entries(REJECTED)) console.log(`  · ${f} — ${why}`);
console.log(`\ntotal shipped: ${(total / 1024).toFixed(2)} MB`);
