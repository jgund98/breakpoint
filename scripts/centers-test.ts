/**
 * CENTER RESOLUTION, AGAINST THE CASES THAT BREAK IT.
 *
 *   node --experimental-strip-types scripts/centers-test.ts
 *
 * Every case here is drawn from the real portfolio or from the way a
 * client's export actually spells things. The two that matter most are
 * the ones a naive matcher gets confidently wrong: a name that contains
 * another name, and two names one letter apart in different states.
 */

import { readFileSync } from "node:fs";
import { buildCenterIndex, resolveCenter, type CenterMatch } from "../src/lib/centers.ts";

const centerIndex = buildCenterIndex(
  JSON.parse(readFileSync("src/lib/data/af-portfolio.json", "utf8")).locations,
);

type Case = {
  what: string;
  input: { name?: string; city?: string; state?: string };
  want: CenterMatch["status"];
  /** For a match, the center we must land on. */
  center?: string;
};

const CASES: Case[] = [
  /* ---- the ordinary case, spelled a few ways ---- */
  {
    what: "exact name and state",
    input: { name: "Fashion Valley", city: "San Diego", state: "CA" },
    want: "matched",
    center: "Fashion Valley",
  },
  {
    what: "client added Mall to the name",
    input: { name: "Fashion Valley Mall", city: "San Diego", state: "CA" },
    want: "matched",
    center: "Fashion Valley",
  },
  {
    what: "client dropped Center from the name",
    input: { name: "Southdale", city: "Edina", state: "MN" },
    want: "matched",
    center: "Southdale Center",
  },
  {
    what: "the alias in parentheses is what the client calls it",
    input: { name: "Annapolis Mall", city: "Annapolis", state: "MD" },
    want: "matched",
    center: "Westfield Annapolis (Annapolis Mall)",
  },
  {
    what: "different case and punctuation",
    input: { name: "ALA MOANA CENTER", city: "Honolulu", state: "HI" },
    want: "matched",
    center: "Ala Moana Center",
  },

  /* ---- one name inside another ---- */
  {
    what: "The Galleria in Texas is not the one in Florida",
    input: { name: "The Galleria", city: "Houston", state: "TX" },
    want: "matched",
    center: "The Galleria",
  },
  {
    what: "The Galleria with a Florida state must not silently take Houston",
    input: { name: "The Galleria", city: "Fort Lauderdale", state: "FL" },
    want: "review",
  },
  {
    what: "bare Galleria with no state goes to a person",
    input: { name: "Galleria" },
    want: "review",
  },

  /* ---- one letter apart, different states ---- */
  {
    what: "Woodfield in Illinois",
    input: { name: "Woodfield Mall", city: "Schaumburg", state: "IL" },
    want: "matched",
    center: "Woodfield Mall",
  },
  {
    what: "Woodland in Michigan",
    input: { name: "Woodland Mall", city: "Grand Rapids", state: "MI" },
    want: "matched",
    center: "Woodland Mall",
  },
  {
    what: "Woodland named with Woodfield's city and state is not a match",
    input: { name: "Woodland Mall", city: "Schaumburg", state: "IL" },
    want: "review",
  },

  /* ---- state disagreement ---- */
  {
    what: "right name, wrong state, goes to a person",
    input: { name: "Ross Park Mall", city: "Pittsburgh", state: "OH" },
    want: "review",
  },

  /* ---- a center where the city is the name ---- */
  {
    what: "King of Prussia",
    input: { name: "King of Prussia", city: "King of Prussia", state: "PA" },
    want: "matched",
    center: "King of Prussia",
  },

  /* ---- genuinely new ---- */
  {
    what: "a center we have never indexed",
    input: { name: "Cherry Hill Mall", city: "Cherry Hill", state: "NJ" },
    want: "new",
  },
  {
    what: "an initialism we cannot resolve",
    input: { name: "KOP", state: "PA" },
    want: "new",
  },
  {
    what: "no name at all",
    input: { city: "Toledo", state: "OH" },
    want: "new",
  },
];

let pass = 0;
const fails: string[] = [];

console.log("=".repeat(72));
console.log("CENTER RESOLUTION");
console.log("=".repeat(72));

for (const c of CASES) {
  const got = resolveCenter(c.input, centerIndex);
  let ok = got.status === c.want;
  if (ok && c.center) ok = got.status === "matched" && got.center.name === c.center;

  const landed =
    got.status === "matched"
      ? got.center.name
      : got.status === "review"
        ? `${got.candidates.length} candidate(s)`
        : "new center";

  console.log(
    `  ${ok ? "pass" : "FAIL"}  ${c.what}\n        ${got.status.padEnd(8)} ${landed}\n        ${got.why}`,
  );
  if (ok) pass++;
  else fails.push(`${c.what}: wanted ${c.want}${c.center ? ` (${c.center})` : ""}, got ${got.status} ${landed}`);
}

console.log("\n" + "-".repeat(72));
console.log(`${pass} of ${CASES.length} passed`);
if (fails.length) {
  console.log("\nfailures:");
  fails.forEach((f) => console.log(`  ${f}`));
}
process.exit(fails.length === 0 ? 0 : 1);
