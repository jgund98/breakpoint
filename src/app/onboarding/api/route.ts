/**
 * Where an onboarding lands when the client submits it.
 *
 * The whole console state arrives as one document and is kept as one,
 * because the team sets the account up FROM it: it is the work order.
 * Normalizing it into org, center and location tables happens during
 * setup, after a person has looked at it, never silently on the way in.
 *
 * No workspace session here on purpose: the people filling in an
 * onboarding do not have accounts yet. The site lock still stands in
 * front of it, and the payload is size-capped and shape-checked.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;

const clip = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_BYTES) {
    return NextResponse.json(
      { error: "Submission too large. Send the roster by another route and submit again." },
      { status: 413 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed submission." }, { status: 400 });
  }

  const clientName = clip(payload.clientName, 200);
  const slug = clip(payload.clientSlug, 120);
  const state = payload.state;
  if (!clientName || !slug || !state || typeof state !== "object") {
    return NextResponse.json({ error: "Missing client or state." }, { status: 400 });
  }

  const storeEstimate = Number(payload.storeEstimate) || null;
  const rowCount = Array.isArray((state as { parsed?: unknown[] }).parsed)
    ? (state as { parsed: unknown[] }).parsed.length
    : 0;

  const { rows } = await db().query(
    `insert into onboarding_submission
       (org_slug, client_name, store_estimate, row_count, payload)
     values ($1, $2, $3, $4, $5)
     returning id, submitted_at`,
    [slug, clientName, storeEstimate, rowCount, JSON.stringify(state)],
  );

  return NextResponse.json({ id: rows[0].id, submittedAt: rows[0].submitted_at });
}
