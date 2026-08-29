import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/team";
import type { RoleId } from "@/lib/team";
import { JoinForm } from "./JoinForm";

export const dynamic = "force-dynamic";

/**
 * The invitation landing: who invited you, into which account, as
 * what. Sets the password and signs straight in. Behind the site gate
 * like everything else in the private preview.
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) notFound();

  const { rows } = await db().query(
    `select i.email, i.name, i.title, i.role, i.expires_at, i.accepted_at,
            o.name as org_name
       from invitation i join org o on o.id = i.org_id
      where i.token = $1`,
    [token],
  );
  const inv = rows[0];
  if (!inv) notFound();

  const expired = new Date(inv.expires_at) < new Date();
  const accepted = !!inv.accepted_at;
  const roleMeta =
    ROLES[(inv.role as RoleId) in ROLES ? (inv.role as RoleId) : "viewer"];

  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/60 bg-white p-7 shadow-xl shadow-slate-200/50">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/30">
          <span className="text-[1.125rem] font-bold leading-none text-white">
            b
          </span>
          <span className="mb-3 ml-px h-1 w-1 rounded-[2px] bg-amber-400" />
        </div>
        {accepted ? (
          <>
            <h1 className="mt-5 text-[1.375rem] font-bold tracking-tight text-slate-900">
              Already accepted
            </h1>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-slate-500">
              This invitation has been used.{" "}
              <a href="/login" className="font-semibold text-indigo-700 hover:underline">
                Sign in
              </a>{" "}
              with your email and password.
            </p>
          </>
        ) : expired ? (
          <>
            <h1 className="mt-5 text-[1.375rem] font-bold tracking-tight text-slate-900">
              Invitation expired
            </h1>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-slate-500">
              Ask the person who invited you to send a fresh link.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-[1.375rem] font-bold tracking-tight text-slate-900">
              Join {inv.org_name}
            </h1>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-slate-500">
              You are invited as{" "}
              <span className="font-semibold text-slate-900">
                {roleMeta.label}
              </span>
              . {roleMeta.blurb}
            </p>
            <JoinForm
              token={token}
              email={inv.email}
              name={inv.name ?? ""}
            />
          </>
        )}
      </div>
    </main>
  );
}
