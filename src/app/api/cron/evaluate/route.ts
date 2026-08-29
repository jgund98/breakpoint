/**
 * The scheduled reevaluation. Vercel cron calls this daily with
 * `Authorization: Bearer ${CRON_SECRET}`; platform staff may also
 * trigger it by session for a manual pass. Without a configured
 * CRON_SECRET the bearer path refuses — a cron that anyone can fire
 * is not a cron.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { runEvaluation } from "@/lib/evaluate-run";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const bearer = request.headers.get("authorization");
  const cronOk = !!secret && bearer === `Bearer ${secret}`;
  const staff = cronOk ? null : await requireStaff(request);
  if (!cronOk && !staff)
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const result = await runEvaluation(cronOk ? "cron" : "manual");
  return NextResponse.json({ ok: true, ...result });
}
