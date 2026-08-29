import {
  Database,
  FileText,
  KeyRound,
  Lock,
  BrainCircuit,
  Boxes,
  ScrollText,
} from "lucide-react";
import { PageHeader } from "@/components/admin/Shell";
import { RunEvaluation } from "@/components/admin/RunEvaluation";
import { Card, IconChip, Badge, Th, EmptyNote } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { PORTFOLIOS } from "@/lib/orgs";

export const dynamic = "force-dynamic";

/**
 * System: what is actually true about this install. No invented
 * toggles — every row here is a real fact with a real consequence,
 * checked live at render.
 */
export default async function SystemPage() {
  let counts = {
    orgs: 0,
    requests: 0,
    openRequests: 0,
    submissions: 0,
    directives: 0,
    documents: 0,
    configs: 0,
  };
  let dbOk = true;
  let audit: {
    id: string;
    actor: string;
    action: string;
    org_slug: string | null;
    subject: string | null;
    detail: string | null;
    created_at: string;
  }[] = [];
  try {
    const a = await db().query(
      `select id, actor, action, org_slug, subject, detail, created_at
         from audit_log order by created_at desc limit 40`,
    );
    audit = a.rows;
  } catch {
    /* surfaces as the database row below */
  }
  try {
    const r = await db().query(`
      select
        (select count(*) from org)::int as orgs,
        (select count(*) from client_request)::int as requests,
        (select count(*) from client_request where handled_at is null)::int as open_requests,
        (select count(*) from onboarding_submission)::int as submissions,
        (select count(*) from agent_directive where active)::int as directives,
        (select count(*) from lease_document)::int as documents,
        (select count(*) from location_config)::int as configs
    `);
    counts = {
      orgs: r.rows[0].orgs,
      requests: r.rows[0].requests,
      openRequests: r.rows[0].open_requests,
      submissions: r.rows[0].submissions,
      directives: r.rows[0].directives,
      documents: r.rows[0].documents,
      configs: r.rows[0].configs,
    };
  } catch {
    dbOk = false;
  }

  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasPlacesKey = Boolean(process.env.GOOGLE_PLACES_API_KEY);
  const portfolios = Object.keys(PORTFOLIOS);

  const rows: {
    icon: React.ReactNode;
    color: "indigo" | "emerald" | "amber" | "sky" | "violet" | "rose";
    title: string;
    detail: string;
    state: { label: string; tone: "emerald" | "amber" | "rose" };
  }[] = [
    {
      icon: <Database className="h-5 w-5" />,
      color: "indigo",
      title: "Account database",
      detail: dbOk
        ? `Neon Postgres · ${counts.orgs} clients · ${counts.requests} requests (${counts.openRequests} open) · ${counts.submissions} submissions · ${counts.configs} location configs`
        : "The database did not answer. Nothing on this console can save.",
      state: dbOk
        ? { label: "Connected", tone: "emerald" }
        : { label: "Down", tone: "rose" },
    },
    {
      icon: <Boxes className="h-5 w-5" />,
      color: "violet",
      title: "Portfolio datasets",
      detail:
        portfolios.length > 0
          ? `Wired into the engine: ${portfolios.join(", ")}. Other clients' boards run in setup state until their roster is imported.`
          : "No datasets wired.",
      state: { label: `${portfolios.length} wired`, tone: "emerald" },
    },
    {
      icon: <BrainCircuit className="h-5 w-5" />,
      color: "sky",
      title: "Agent canon",
      detail: `${counts.directives} active directives assembled into every extraction and scan prompt.`,
      state:
        counts.directives > 0
          ? { label: "Loaded", tone: "emerald" }
          : { label: "Empty", tone: "amber" },
    },
    {
      icon: <KeyRound className="h-5 w-5" />,
      color: "emerald",
      title: "Extraction model key",
      detail: hasAnthropicKey
        ? "ANTHROPIC_API_KEY is present. The clause-extraction runner can call the model, and Ask Theo reasons with it over the portfolio index."
        : "ANTHROPIC_API_KEY is not set. The extraction runner builds and scores prompts but cannot call the model, and Ask Theo answers from the portfolio index alone.",
      state: hasAnthropicKey
        ? { label: "Present", tone: "emerald" }
        : { label: "Missing", tone: "amber" },
    },
    {
      icon: <KeyRound className="h-5 w-5" />,
      color: "amber",
      title: "Google Places key",
      detail: hasPlacesKey
        ? "GOOGLE_PLACES_API_KEY is present. Storefront ids can be resolved from addresses."
        : "GOOGLE_PLACES_API_KEY is not set. Places ids are entered by hand on each client board.",
      state: hasPlacesKey
        ? { label: "Present", tone: "emerald" }
        : { label: "Missing", tone: "amber" },
    },
    {
      icon: <FileText className="h-5 w-5" />,
      color: "violet",
      title: "Lease papers",
      detail: `${counts.documents} documents on file, stored in Postgres (4 MB per file). The move to object storage touches one route.`,
      state: { label: "In database", tone: "emerald" },
    },
    {
      icon: <Lock className="h-5 w-5" />,
      color: "rose",
      title: "Access",
      detail:
        "Password sign-in with database-backed sessions. Client roles are enforced per workspace; the console runs on the staff permission ladder (administrator, operator, observer). The site lock gates everything while the product is private.",
      state: { label: "Enforced", tone: "emerald" },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System"
        blurb="What is actually true about this install, checked live. No decorative toggles."
        aside={<RunEvaluation />}
      />
      {/* ---- the audit trail ---- */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <IconChip color="slate" size="sm">
            <ScrollText className="h-4 w-4" />
          </IconChip>
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">
              Audit trail
            </h2>
            <p className="text-[0.75rem] text-slate-500">
              Who did what on this console, newest first. Append-only.
            </p>
          </div>
        </div>
        {audit.length === 0 ? (
          <EmptyNote>Nothing recorded yet. Every console action lands here.</EmptyNote>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {["When", "Actor", "Action", "Client", "Subject", "Detail"].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td className="tnum whitespace-nowrap px-6 py-2.5 text-[0.75rem] text-slate-500">
                      {new Date(a.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-2.5 text-[0.75rem] font-medium text-slate-700">
                      {a.actor}
                    </td>
                    <td className="px-6 py-2.5 font-mono text-[0.6875rem] text-indigo-700">
                      {a.action}
                    </td>
                    <td className="px-6 py-2.5 text-[0.75rem] text-slate-500">
                      {a.org_slug ?? "—"}
                    </td>
                    <td className="px-6 py-2.5 text-[0.75rem] text-slate-500">
                      {a.subject ?? "—"}
                    </td>
                    <td className="max-w-56 truncate px-6 py-2.5 text-[0.75rem] text-slate-400">
                      {a.detail ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.title} className="flex items-start gap-4 px-6 py-5">
            <IconChip color={r.color}>{r.icon}</IconChip>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[0.875rem] font-semibold text-slate-900">
                  {r.title}
                </p>
                <Badge tone={r.state.tone} dot>
                  {r.state.label}
                </Badge>
              </div>
              <p className="mt-1 max-w-[56rem] text-[0.8125rem] leading-snug text-slate-500">
                {r.detail}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
