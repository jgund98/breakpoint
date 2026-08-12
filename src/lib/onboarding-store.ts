/**
 * ============================================================
 * ONBOARDING STATE, SAVED AS YOU GO
 * ============================================================
 *
 * Onboarding a paid client is not a session. It runs over days, across
 * several people: lease administration owns the roster, legal owns the
 * estoppels, and real estate owns which centers matter. Losing that work
 * to a closed tab is the fastest way to make an expensive customer feel
 * like they are doing our job for us.
 *
 * So everything is written as it is entered, under a key tied to the
 * client, and picked up wherever it was left. It stays in the browser
 * for now: nothing here has anywhere to go until the account is wired to
 * the database, and pretending otherwise would be worse than saying so.
 * The shape is the one the server will take, so moving it is a swap of
 * the two functions at the bottom rather than a rewrite.
 */

import type { FieldKey, ParsedRow } from "./ingest";
import type { Held, TriageMode } from "@/components/onboarding/ExtraSteps";
import type { ChannelId } from "@/components/onboarding/Delivery";

export type TaskId =
  | "portfolio"
  | "leases"
  | "record"
  | "sales"
  | "priorities"
  | "people"
  | "watch";

export type OnboardingState = {
  /** Bumped when the shape changes so a stale save cannot half-load. */
  version: 1;
  updatedAt: string;

  /**
   * How each body of data is reaching us, and any detail that route
   * needs. One shape for all of them, because a client who sends the
   * roster on SFTP will usually send the leases the same way.
   */
  channels: Partial<Record<TaskId, { channel: ChannelId | null; note: string }>>;

  /* portfolio */
  leaseAdminSystem: string;
  raw: string;
  fileName: string;
  headers: string[];
  parsed: ParsedRow[];
  mapping: Record<string, FieldKey>;

  /* leases */
  leaseCount: number;
  leasesConfirmed: boolean;

  /* sales, which price a claim rather than find one */
  salesDeferred: boolean;
  salesRaw: string;
  salesFileName: string;
  salesRowCount: number;

  /* notice history, as dates rather than a yes or no */
  noticeRaw: string;
  noticeFileName: string;

  /* the record */
  record: {
    occupancyStatements: Held | null;
    estoppels: Held | null;
    defaults: Held | null;
    noticeLog: Held | null;
    exhibits: Held | null;
    reas: Held | null;
  };

  /* priorities */
  triageMode: TriageMode | null;
  triageNote: string;

  /* people */
  signatory: string;
  signatoryTitle: string;
  counselName: string;
  counselEmail: string;
  notifyEmails: string;

  /* watch */
  cadence: "weekly" | "biweekly" | "monthly";
  fieldVisits: boolean;
};

export const emptyOnboarding: OnboardingState = {
  version: 1,
  updatedAt: "",
  channels: {},
  leaseAdminSystem: "",
  raw: "",
  fileName: "",
  headers: [],
  parsed: [],
  mapping: {},
  leaseCount: 0,
  leasesConfirmed: false,
  salesDeferred: false,
  salesRaw: "",
  salesFileName: "",
  salesRowCount: 0,
  noticeRaw: "",
  noticeFileName: "",
  record: {
    occupancyStatements: null,
    estoppels: null,
    defaults: null,
    noticeLog: null,
    exhibits: null,
    reas: null,
  },
  triageMode: null,
  triageNote: "",
  signatory: "",
  signatoryTitle: "",
  counselName: "",
  counselEmail: "",
  notifyEmails: "",
  cadence: "weekly",
  fieldVisits: true,
};

/* ------------------------------------------------------------------
   what "done" means, per task
   ------------------------------------------------------------------ */

export type TaskStatus = "not_started" | "in_progress" | "complete";

export type TaskMeta = {
  id: TaskId;
  title: string;
  /** One line, in the client's terms, about why we are asking. */
  why: string;
  /** Which team usually owns it, so it can be handed to the right person. */
  owner: string;
  required: boolean;
};

export const TASKS: TaskMeta[] = [
  {
    id: "portfolio",
    title: "Store portfolio",
    why: "Every location with a co-tenancy clause, with its center, rent and floor area.",
    owner: "Lease administration",
    required: true,
  },
  {
    id: "leases",
    title: "Lease documents",
    why: "The executed lease and every amendment. Amendments routinely rewrite or suspend co-tenancy.",
    owner: "Lease administration",
    required: true,
  },
  {
    id: "record",
    title: "What is already on the record",
    why: "Estoppels, open defaults, notice history, and anything a landlord has already issued.",
    owner: "Legal",
    required: true,
  },
  {
    id: "sales",
    title: "Store sales",
    why: "Monthly gross sales by store. Used to value a remedy, not to find one.",
    owner: "Finance",
    required: false,
  },
  {
    id: "priorities",
    title: "Where we start",
    why: "The centers you are already worried about, so those leases are abstracted first.",
    owner: "Real estate",
    required: true,
  },
  {
    id: "people",
    title: "People and authority",
    why: "Who signs a notice, who your counsel is, and who hears about a finding.",
    owner: "Real estate and legal",
    required: true,
  },
  {
    id: "watch",
    title: "Watch preferences",
    why: "How often we sweep, and whether we send someone to the premises on escalation.",
    owner: "Real estate",
    required: false,
  },
];

/** Has a route in been picked for this task? */
export function chosen(s: OnboardingState, id: TaskId) {
  const c = s.channels[id];
  return Boolean(c?.channel);
}

export function statusOf(s: OnboardingState, id: TaskId): TaskStatus {
  const some = (...vals: unknown[]) =>
    vals.some((v) => v !== null && v !== "" && v !== false);

  switch (id) {
    case "portfolio":
      if (s.parsed.length > 0) return "complete";
      return chosen(s, "portfolio") ? "in_progress" : "not_started";
    case "leases":
      if (s.leasesConfirmed) return "complete";
      return chosen(s, "leases") ? "in_progress" : "not_started";
    case "sales":
      if (s.salesDeferred || s.salesRowCount > 0) return "complete";
      return chosen(s, "sales") ? "in_progress" : "not_started";
    case "record": {
      const answered = Object.values(s.record).filter((v) => v !== null).length;
      if (answered === Object.keys(s.record).length) return "complete";
      return answered > 0 ? "in_progress" : "not_started";
    }
    case "priorities":
      if (s.triageMode === "all") return "complete";
      if (s.triageMode === "priority")
        return s.triageNote.trim() ? "complete" : "in_progress";
      return "not_started";
    case "people":
      if (s.signatory.trim() && s.counselEmail.includes("@")) return "complete";
      return some(s.signatory, s.counselName, s.counselEmail, s.notifyEmails)
        ? "in_progress"
        : "not_started";
    case "watch":
      /* Defaults are real answers, so this is done unless someone
         deliberately clears it. It is the one optional task. */
      return "complete";
  }
}

/** A single number for the header, weighted so the big lifts read honestly. */
export function completion(s: OnboardingState) {
  const required = TASKS.filter((t) => t.required);
  const done = required.filter((t) => statusOf(s, t.id) === "complete").length;
  return {
    done,
    total: required.length,
    pct: Math.round((done / required.length) * 100),
  };
}

/* ------------------------------------------------------------------
   persistence
   ------------------------------------------------------------------ */

const key = (client: string) => `bp_onboarding_${client}`;

export function loadOnboarding(client: string): OnboardingState {
  if (typeof window === "undefined") return emptyOnboarding;
  try {
    const raw = window.localStorage.getItem(key(client));
    if (!raw) return emptyOnboarding;
    const parsed = JSON.parse(raw) as OnboardingState;
    if (parsed.version !== 1) return emptyOnboarding;
    return { ...emptyOnboarding, ...parsed };
  } catch {
    return emptyOnboarding;
  }
}

export function saveOnboarding(client: string, s: OnboardingState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      key(client),
      JSON.stringify({ ...s, updatedAt: new Date().toISOString() }),
    );
  } catch {
    /* Quota, private mode, a locked-down browser. Losing the save is
       recoverable; taking the screen down over it is not. */
  }
}

export function clearOnboarding(client: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(client));
  } catch {}
}
