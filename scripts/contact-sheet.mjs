import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "raw-assets", "photos");
const files = fs.readdirSync(DIR).filter((f) => /\.(jpg|jpeg|png)$/i.test(f)).sort();

const CELL_W = 420;
const CELL_H = 280;
const COLS = 4;
const rows = Math.ceil(files.length / COLS);

const composites = [];
for (let i = 0; i < files.length; i++) {
  const buf = await sharp(path.join(DIR, files[i]))
    .resize(CELL_W, CELL_H, { fit: "cover" })
    .jpeg({ quality: 78 })
    .toBuffer();
  composites.push({
    input: buf,
    left: (i % COLS) * CELL_W,
    top: Math.floor(i / COLS) * CELL_H,
  });
}

await sharp({
  create: {
    width: COLS * CELL_W,
    height: rows * CELL_H,
    channels: 3,
    background: "#111",
  },
})
  .composite(composites)
  .jpeg({ quality: 76 })
  .toFile(path.join(process.cwd(), "raw-assets", "contact-sheet.jpg"));

console.log("order (left→right, top→bottom):");
files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
