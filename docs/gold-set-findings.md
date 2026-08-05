# What the real data says

Source: 175 tenant folders across **Annapolis Mall** and **Galleria at Fort
Lauderdale**, extracted by our co-tenancy expert partner (Aug 2026), plus the
companion register workbook. 106 records carry a clause. This is the gold set.

Treat every number here as ground truth and every assumption it contradicts as
a bug. Sample data in `src/lib/portfolio.ts` should track these distributions.

---

## 1. The correction that matters most: relief usually runs from the condition

Our marketing and the Field Guide lean on "relief commences the month after
written notice, so months before notice are lost." The real distribution:

| `cure_runs_from` | count | share |
|---|---|---|
| **condition** | 112 | 65% |
| tenant_notice | 36 | 21% |
| unspecified | 24 | 14% |

So the majority run from the condition, not from notice. But retroactivity is
almost always **capped**. From lululemon (Annapolis, Store 1454):

> Alternative Rent is then retroactive to the date the failure first occurred
> **but not more than ninety (90) days prior to Tenant's notice**.

**The honest thesis, which is still strong:** detection speed matters because
retroactivity is capped, not because relief begins at notice. Miss a failure by
six months on a 90-day lookback and four of those months are gone. Say it that
way everywhere. "Retroactive to failure, capped at N days before notice" is the
sentence to extract, and the cap is a first-class field.

`retroactiv*` appears 56 times across the set. It is not an edge case.

## 2. Compound triggers are the norm, not the exception

| `trigger_type` | count |
|---|---|
| **compound** | 82 (48%) |
| occupancy_pct | 46 |
| tenant_count | 31 |
| named_tenant | 13 |

Our engine models triggers as a flat list with `any` / `all`. That is not
sufficient. Real clauses read "(2 of the Major Co-Tenants) **AND** (75% of
Floor Area)", frequently with a third limb and sub-definitions. `compound_logic`
must be preserved as a tree, not flattened.

## 3. The denominator usually is not a rent roll

| `area_basis` | count |
|---|---|
| **defined_area** | 56 |
| total_gla | 40 |
| inline_gla | 14 |

The most common denominator is an area **defined by a site-plan exhibit**, not
inline GLA. It cannot be computed from a rent roll at all without mapping the
exhibit to suites. Our `computability` grading was right in principle and too
generous in practice: `defined_area` should default to needs-human-mapping
until an exhibit has been reconciled.

**But the leases hand us the answer.** `occupancy report` / `certification`
language appears **63 times**. Example, lululemon:

> Landlord must provide, once per calendar year within 30 days of written
> request, an occupancy report showing percentage of Floor Area open and the
> names of Anchor Stores operating.

This is the single most valuable product feature hiding in the data. The tenant
has a contractual right to the exact number we cannot otherwise compute.
**Extract that right, track its once-per-year window, and prompt the client to
exercise it.** That converts our hardest data problem into a letter.

## 4. Market terms, measured

| Occupancy threshold | count |
|---|---|
| 60% | 3 |
| 65% | 8 |
| 70% | 20 |
| **75%** | **63** |
| 80% | 29 |
| 85% | 4 |

75% is the mode, not 70%. Our sample clause uses 70% and should use 75%.

| Remedy cap (months) | count |
|---|---|
| 9 | 1 |
| **12** | **56** |
| 18 | 10 |
| 24 | 4 |

12 months dominates, as assumed. Good.

Anchor size definitions are explicit and belong in the schema: Annapolis
defines an Anchor Store as "individual space containing at least **70,000 sf**
operating under a single trade name."

## 5. Replacement standards do not fit an enum

The set contains **~31 distinct `replacement_standard.kind` values**:
`suitable_replacement`, `comparable_quality`, `like_replacement`,
`successor_department_store`, `partial_reoccupancy_threshold`,
`landlord_discretion_replacement_menu`, `converted_anchor_box`, and more.

Our four-value enum is far too narrow. Store the **verbatim text** as the
authority, classify loosely for filtering only, and never let the classification
drive money. The best-drafted example, worth quoting in sales material:

> A "Suitable Replacement" shall be defined as: (1) a nationally known retailer
> that sells merchandise of the same or higher quality than the tenant it is
> replacing; (2) has similar customer demographics; (3) is operating under a
> single trade name; and (4) is occupying the entire premises.

## 6. Human review is the majority path

- `needs_human_review`: **124 of 175 (71%)**
- confidence: min 0.45, **median 0.88**, max 0.95
- 85 documents have **no text layer** and were not OCR'd

Our onboarding wizard claims ~78% auto-accepted. Reality is closer to **29%**.
Fix the wizard's numbers. This is not bad news: it is the argument for the
service half of the business, and it means OCR is mandatory, not optional.

## 7. Clauses are time-versioned and can be voided

lululemon Store 1454 carries **six amendments**. Two facts from that one file:

- Lease Amendment No. 4 (7/18/2023) made the requirement to name a *specific*
  anchor (Nordstrom) **null and void**, leaving only the count.
- The Sixth Amendment (12/19/2025) **replaces** the original co-tenancy
  requirement with a new one **effective 2/1/2026**, a future date.

Aldo's register entry reads "The clause is NO LONGER OPERATIVE."

So a clause is not a fact about a lease, it is a fact about a lease **on a
date**. The model needs effective-from / effective-to per clause version, and
evaluation must select the version in force on the evaluation date.

## 8. Disputes are normal, and the correspondence is the record

- claims asserted: **21**
- landlord disputed: **9** (43% of claims)

The claim history is a thread of letters, not an event. From lululemon:

> Tenant letter 8/26/2025 asserting failure from 8/17/2025 (JCPenney closure);
> Landlord letter 9/15/2025 agreed; Alternative Rent effective 9/25/2025
> retroactive to 8/17/2025. ... Tenant's 8/4/2022 termination notice was voided
> by Lease Amendment No. 4 together with a **$78,057.20 account credit**.

Product consequence: the notice desk is not a one-shot generator. It needs a
**correspondence thread** per claim with dated inbound and outbound letters, a
position on each side, and an outcome. Also note a termination right was
exercised and then traded away in an amendment: rights get settled, not just
won.

Contested fact worth showing as a feature, from Annapolis:

> Whether the store "Q" in the former Forever 21 space (32,487 sf leased,
> ~10,166 sf operating) qualifies as a Department Store.

That is the judgment call the engine should surface and never decide.

## 9. Anchor dependency is a real artifact

The workbook contains an **Anchor Dependency** tab, 282 rows, mapping
anchor/pool to every depending tenant with trigger type and remedy. That is the
same object as our Anchor Exposure Matrix, built independently by a domain
expert. Keep the matrix; it is not a novelty, it is how practitioners think.

## 10. Adjacent surface: kick-out clauses

`kick-out` / `Gross Sales Threshold` appears **27 times** (e.g. Abercrombie's
termination right at a stated sales threshold). Not co-tenancy, same buyer, same
data. A natural second product once co-tenancy is solid.

---

## Data-quality issues to raise with the partner

- The register's **Clause Register** tab has a column shift on some rows: for
  Abercrombie the value `81` lands in *Area Basis*, and an *Occupancy Threshold*
  of **117%** appears on an AMC dependency row. Both are impossible values and
  suggest an export bug rather than a lease term.
- 85 documents lack a text layer, so the set is not complete coverage.

## What to change in the product

1. Rewrite the notice/detection copy around **capped retroactivity**.
2. Model `compound_logic` as a tree; add `retroactive_cap_days`.
3. Add the **landlord occupancy-report right** as a tracked entitlement with its
   own annual window and a "request it" action.
4. Version clauses by effective date; evaluate the version in force.
5. Turn the notice desk into a correspondence thread with dispute positions.
6. Recalibrate sample data: 75% threshold, 12-month cap, 71% human review.
7. Default `defined_area` denominators to needs-mapping.
