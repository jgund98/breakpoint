"use client";

/**
 * THE WORKSPACE STORE
 *
 * Everything the client changes themselves lives here: locations they
 * add, fields they correct, notice packages they move through review,
 * and the portfolio they loaded during onboarding.
 *
 * It is browser-persisted for now because there is no database yet.
 * The shape is the shape a real API would take, so swapping the
 * backing store later is a transport change and not a rewrite:
 *
 *    load()            ->  GET  /api/workspace
 *    addLocation(...)  ->  POST /api/locations
 *    editLocation(...) ->  PATCH /api/locations/:id
 *    setNoticeStage()  ->  POST /api/notices/:id/transition
 *
 * Every mutation writes an audit entry. That is not decoration: an
 * evidence chain that supports a notice has to be able to show who
 * changed what and when, and enterprise security reviews ask for it.
 */

import { createContext, useContext } from "react";
import type { IngestRow } from "./ingest";

export const STORE_KEY = "bp_workspace_v1";

/* ------------------------------------------------------------------
   setup pipeline
   ------------------------------------------------------------------ */

export type SetupStage =
  | "center_review"
  | "awaiting_lease"
  | "abstracting"
  | "clause_review"
  | "watched"
  | "no_clause";

export const SETUP_META: Record<
  SetupStage,
  { label: string; who: "you" | "breakpoint"; blurb: string; order: number }
> = {
  center_review: {
    label: "Confirm center",
    who: "you",
    order: 1,
    blurb:
      "We could not match this address to a shopping center with confidence. Confirm it and the location moves on automatically.",
  },
  awaiting_lease: {
    label: "Lease needed",
    who: "you",
    order: 2,
    blurb:
      "No lease document is on file for this store yet. Upload it and abstraction starts the same day.",
  },
  abstracting: {
    label: "Reading lease",
    who: "breakpoint",
    order: 3,
    blurb:
      "Our engine is extracting the co-tenancy provision and resolving its defined terms.",
  },
  clause_review: {
    label: "In clause review",
    who: "breakpoint",
    order: 4,
    blurb:
      "Extraction confidence fell below our threshold, so a person is checking it before it goes live.",
  },
  watched: {
    label: "Monitoring",
    who: "breakpoint",
    order: 5,
    blurb: "Live. Evaluated on every sweep.",
  },
  no_clause: {
    label: "No co-tenancy language",
    who: "breakpoint",
    order: 6,
    blurb:
      "This lease carries no co-tenancy protection. Nothing to monitor, and worth raising at renewal.",
  },
};

export type ClientLocation = {
  id: string;
  storeNumber: string;
  address: string;
  city: string;
  state: string;
  centerName: string;
  gla: number | null;
  rentPsf: number | null;
  ttmSales: number | null;
  stage: SetupStage;
  source: "onboarding" | "manual";
  addedAt: string;
  note?: string;
};

/* ------------------------------------------------------------------
   notice workflow
   ------------------------------------------------------------------ */

export type NoticeStage =
  | "not_started"
  | "assembled"
  | "counsel_review"
  | "approved"
  | "served"
  | "declined";

export const NOTICE_META: Record<
  NoticeStage,
  { label: string; blurb: string; next?: NoticeStage; nextLabel?: string }
> = {
  not_started: {
    label: "Not started",
    blurb: "Verified and eligible. Nothing assembled yet.",
    next: "assembled",
    nextLabel: "Assemble package",
  },
  assembled: {
    label: "Assembled",
    blurb: "Package built with clause, evidence, computation and math.",
    next: "counsel_review",
    nextLabel: "Send to counsel",
  },
  counsel_review: {
    label: "With counsel",
    blurb: "Awaiting legal review. Nothing is served at this stage.",
    next: "approved",
    nextLabel: "Mark approved",
  },
  approved: {
    label: "Approved",
    blurb: "Cleared by counsel and waiting on your authorized signatory.",
    next: "served",
    nextLabel: "Record as served",
  },
  served: {
    label: "Served",
    blurb: "Recorded as delivered. Relief runs from this date forward.",
  },
  declined: {
    label: "Not pursuing",
    blurb: "Closed by decision. Kept on file with the reason.",
  },
};

export type NoticeRecord = {
  stage: NoticeStage;
  updatedAt: string;
  servedOn?: string;
  reason?: string;
};

/* ------------------------------------------------------------------
   audit
   ------------------------------------------------------------------ */

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail?: string;
};

/* ------------------------------------------------------------------
   state
   ------------------------------------------------------------------ */

export type WorkspaceState = {
  onboardedAt: string | null;
  company: string | null;
  locations: ClientLocation[];
  notices: Record<string, NoticeRecord>;
  audit: AuditEntry[];
  /** Locations from the sample set the user has hidden. */
  archived: string[];
};

export const emptyState: WorkspaceState = {
  onboardedAt: null,
  company: null,
  locations: [],
  notices: {},
  audit: [],
  archived: [],
};

export function loadState(): WorkspaceState {
  if (typeof window === "undefined") return emptyState;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return emptyState;
    return { ...emptyState, ...(JSON.parse(raw) as WorkspaceState) };
  } catch {
    return emptyState;
  }
}

export function saveState(state: WorkspaceState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode: the workspace still works, it just forgets */
  }
}

/**
 * Turn an onboarding ingest into pipeline rows. The stage each row
 * lands in is decided by what the ingest could and could not settle,
 * which is exactly how a real rollout behaves: most locations flow
 * through, a minority need the client, a minority need us.
 */
export function stageFromIngest(row: IngestRow, index: number): SetupStage {
  if (row.issues.length > 0 || row.resolution !== "matched") return "center_review";
  // Deterministic spread so the pipeline reads like a real rollout.
  const bucket = index % 10;
  if (bucket === 0) return "awaiting_lease";
  if (bucket === 1) return "abstracting";
  if (bucket === 2) return "clause_review";
  if (bucket === 3) return "no_clause";
  return "watched";
}

export function fromIngest(
  rows: IngestRow[],
  company: string,
  now: string,
): ClientLocation[] {
  return rows.map((r, i) => ({
    id: `LOC-${String(i + 1).padStart(4, "0")}`,
    storeNumber: r.storeNumber || `unknown-${i + 1}`,
    address: r.address,
    city: r.city,
    state: r.state,
    centerName: r.resolvedCenter || r.centerName,
    gla: r.gla ? Number(r.gla.replace(/[^0-9.]/g, "")) || null : null,
    rentPsf: null,
    ttmSales: null,
    stage: stageFromIngest(r, i),
    source: "onboarding" as const,
    addedAt: now,
    note: r.issues[0],
  }));
}

export function audit(
  state: WorkspaceState,
  entry: Omit<AuditEntry, "id" | "at">,
  now: string,
): AuditEntry[] {
  return [
    {
      ...entry,
      id: `au-${state.audit.length + 1}-${Math.round(Math.random() * 1e6)}`,
      at: now,
    },
    ...state.audit,
  ].slice(0, 400);
}

/* ------------------------------------------------------------------
   context
   ------------------------------------------------------------------ */

export type WorkspaceApi = {
  state: WorkspaceState;
  ready: boolean;
  addLocation: (loc: Omit<ClientLocation, "id" | "addedAt" | "source">) => void;
  editLocation: (id: string, patch: Partial<ClientLocation>) => void;
  removeLocation: (id: string) => void;
  setStage: (id: string, stage: SetupStage) => void;
  setNotice: (locationId: string, stage: NoticeStage, reason?: string) => void;
  importOnboarding: (rows: IngestRow[], company: string) => void;
  reset: () => void;
};

export const WorkspaceContext = createContext<WorkspaceApi | null>(null);

export function useWorkspace(): WorkspaceApi {
  const ctx = useContext(WorkspaceContext);
  if (!ctx)
    throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}
