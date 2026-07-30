import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "raw-assets", "photos");

const SET = [
  { id: "9488842", slug: "boardroom-three-pros", note: "Professionals collaborating, modern boardroom" },
  { id: "34823909", slug: "conference-glass-skyline", note: "Glass conference room, city skyline" },
  { id: "7433844", slug: "meeting-boardroom", note: "Business meeting, modern boardroom" },
  { id: "5717073", slug: "woman-laptop-office", note: "Businesswoman at laptop, modern office" },
  { id: "8386666", slug: "shoppers-browsing", note: "Two shoppers browsing a clothing store" },
  { id: "37429134", slug: "department-store-aisle", note: "Department store aisle, bright lighting" },
  { id: "8386656", slug: "store-bright-racks", note: "Bright clothing store, display racks" },
  { id: "17051853", slug: "mall-fashion-outlets", note: "Mall interior with fashion outlets" },
];

const url = (id, w) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

fs.mkdirSync(OUT, { recursive: true });
const credits = [];

for (const item of SET) {
  try {
    const res = await fetch(url(item.id, 2400), {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(OUT, `${item.slug}.jpg`), buf);
    console.log(`✓ ${item.slug.padEnd(26)} ${(buf.length / 1024).toFixed(0)} KB`);
    credits.push(`${item.slug}.jpg — ${item.note} — Pexels #${item.id}`);
  } catch (e) {
    console.log(`✗ ${item.slug.padEnd(26)} ${e.message}`);
  }
}

fs.appendFileSync(
  path.join(process.cwd(), "raw-assets", "CREDITS.txt"),
  credits.join("\n") + "\n",
);
