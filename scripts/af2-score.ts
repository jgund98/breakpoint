/* Round-2 scorer: frozen blind predictions (shots/af2-predictions.json,
   commit a95e74b) vs the expert's ground-truth key. The key lives ONLY
   on the Desktop and is never committed. */

import fs from "node:fs";

const KEY_PATH = "C:/Users/Lucky/Desktop/af_portfolio_answer_key (1).json";
const PRED_PATH = process.argv[2] ?? "shots/af2-predictions.json";
const key = JSON.parse(fs.readFileSync(KEY_PATH, "utf8"));
const pred = JSON.parse(fs.readFileSync(PRED_PATH, "utf8"));
console.log(`scoring ${PRED_PATH}\n`);

const T: string[] = pred.timeline;
const N = T.length;

/* key state -> engine stateAtEnd equivalence classes */
const stateClass = (s: string): string => {
  const x = s.toLowerCase();
  if (x.startsWith("compliant")) return "compliant";
  if (x.startsWith("cured")) return "cured";
  if (x.startsWith("condition_failing")) return "watch";
  if (x.startsWith("triggered")) return "triggered";
  if (x.startsWith("remedy_active")) return "remedy";
  if (x.startsWith("post_cap")) return "cap";
  if (x.startsWith("suspended")) return "suspended";
  if (x.startsWith("opening_deferred")) return "opening_deferred";
  if (x.startsWith("opening_conditions_met")) return "opening_met";
  return x;
};
const mineClass = (s: string): string =>
  ({
    compliant: "compliant",
    watch_duration_running: "watch",
    triggered_awaiting_relief: "triggered",
    remedy_active: "remedy",
    cap_reached: "cap",
    suspended: "suspended",
    cured: "cured",
    opening_deferred: "opening_deferred",
    opening_deferral_ended: "opening_met",
    opening_satisfied: "opening_met",
  })[s] ?? s;

let monthsTotal = 0,
  monthsWrong = 0;
let endStateRight = 0;
let trigRight = 0,
  trigTotal = 0,
  trigMissed = 0,
  trigFalse = 0;
let noticeRight = 0,
  noticeTotal = 0;
let remedyStartRight = 0,
  remedyStartTotal = 0;
let moneyKeyTotal = 0,
  moneyMineTotal = 0;

const rows: string[] = [];
const monthDiffs: string[] = [];
const stateDiffs: string[] = [];
const trigDiffs: string[] = [];
const moneyDiffs: string[] = [];

for (const slug of Object.keys(key.malls)) {
  const k = key.malls[slug];
  const p = pred.predictions[slug];
  if (!p) {
    rows.push(`${slug}: MISSING from predictions`);
    continue;
  }

  /* ---- monthly condition verdicts ---- */
  let wrong = 0;
  const kf: boolean[] = k.monthly_limbs.map((m: any) => !!m.condition_failing);
  for (let i = 0; i < N; i++) {
    const mineFailing = p.monthlyRequirementFailed[i] !== ".";
    monthsTotal++;
    if (mineFailing !== kf[i]) {
      wrong++;
      monthsWrong++;
      if (monthDiffs.length < 40)
        monthDiffs.push(
          `${slug} ${T[i]}: key=${kf[i] ? "FAIL" : "ok"} mine=${
            mineFailing ? "FAIL" : "ok"
          } (${k.monthly_limbs[i].limb_A ?? ""})`,
        );
    }
  }

  /* ---- end state ---- */
  const keyEnd = stateClass(k.states[k.states.length - 1].state);
  const myEnd = mineClass(p.stateAtEnd);
  const stateOk = keyEnd === myEnd;
  if (stateOk) endStateRight++;
  else
    stateDiffs.push(
      `${slug}: key end=${k.states[k.states.length - 1].state} mine=${p.stateAtEnd}`,
    );

  /* ---- trigger records (operating kind) ---- */
  const kOps = (k.trigger_records ?? []).filter(
    (t: any) => t.kind === "operating",
  );
  const mOps = p.trips ?? [];
  trigTotal += kOps.length;
  const matchedMine = new Set<number>();
  for (const kt of kOps) {
    let found = -1;
    for (let j = 0; j < mOps.length; j++) {
      if (!matchedMine.has(j) && mOps[j].trigger === kt.trigger_month) {
        found = j;
        break;
      }
    }
    if (found >= 0) {
      trigRight++;
      matchedMine.add(found);
      const mt = mOps[found];
      if (kt.tenant_notice_month !== undefined) {
        noticeTotal++;
        if ((mt.noticeMonth ?? null) === (kt.tenant_notice_month ?? null))
          noticeRight++;
        else
          trigDiffs.push(
            `${slug}: notice key=${kt.tenant_notice_month} mine=${mt.noticeMonth}`,
          );
      }
      if (kt.remedy_start !== undefined) {
        remedyStartTotal++;
        if ((mt.reliefStart ?? null) === (kt.remedy_start ?? null))
          remedyStartRight++;
        else
          trigDiffs.push(
            `${slug}: remedy_start key=${kt.remedy_start} mine=${mt.reliefStart}`,
          );
      }
    } else {
      trigMissed++;
      trigDiffs.push(
        `${slug}: MISSED trigger ${kt.trigger_month} (key notice=${kt.tenant_notice_month} remedy=${kt.remedy_start})`,
      );
    }
  }
  for (let j = 0; j < mOps.length; j++)
    if (!matchedMine.has(j)) {
      trigFalse++;
      trigDiffs.push(`${slug}: FALSE trigger ${mOps[j].trigger}`);
    }

  /* ---- money ---- */
  const kMoney = (k.total_rent_at_risk_k ?? 0) * 1000;
  const mMoney =
    p.cumulativeSavings ?? 0;
  moneyKeyTotal += kMoney;
  moneyMineTotal += mMoney;
  const delta = mMoney - kMoney;
  if (Math.abs(delta) > Math.max(5000, kMoney * 0.02))
    moneyDiffs.push(
      `${slug}: key $${Math.round(kMoney).toLocaleString()} mine $${Math.round(
        mMoney,
      ).toLocaleString()} (Δ ${Math.round(delta).toLocaleString()})`,
    );

  rows.push(
    `${slug.padEnd(36)} months ${String(N - wrong).padStart(2)}/${N}  state ${
      stateOk ? "OK " : "XX "
    } key=${k.states[k.states.length - 1].state} | mine=${p.stateAtEnd}`,
  );
}

console.log("=== ROUND-2 SCORE (predictions frozen at a95e74b) ===\n");
console.log(
  `Monthly condition verdicts: ${monthsTotal - monthsWrong}/${monthsTotal}`,
);
console.log(`End states: ${endStateRight}/${Object.keys(key.malls).length}`);
console.log(
  `Operating triggers: ${trigRight}/${trigTotal} matched, ${trigMissed} missed, ${trigFalse} false`,
);
console.log(`Notice months: ${noticeRight}/${noticeTotal}`);
console.log(`Remedy starts: ${remedyStartRight}/${remedyStartTotal}`);
console.log(
  `Money: key $${Math.round(moneyKeyTotal).toLocaleString()} vs mine $${Math.round(
    moneyMineTotal,
  ).toLocaleString()}`,
);

if (stateDiffs.length) {
  console.log("\n--- END-STATE DIFFS ---");
  stateDiffs.forEach((d) => console.log(d));
}
if (trigDiffs.length) {
  console.log("\n--- TRIGGER DIFFS ---");
  trigDiffs.slice(0, 30).forEach((d) => console.log(d));
}
if (moneyDiffs.length) {
  console.log("\n--- MONEY DIFFS (>2% or >$5k) ---");
  moneyDiffs.forEach((d) => console.log(d));
}
if (monthDiffs.length) {
  console.log("\n--- MONTHLY DIFFS (first 40) ---");
  monthDiffs.forEach((d) => console.log(d));
}
