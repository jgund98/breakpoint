/**
 * TEAM, ROLES, ROUTING AND THE CHANNEL BACK TO US.
 *
 * Roles here are not decoration. They map onto the notice workflow the
 * product already runs: a package is assembled, counsel reviews it, an
 * authorized signatory serves it. If the software lets anyone click
 * "record as served" then the audit trail behind a co-tenancy notice is
 * worthless, and that audit trail is the thing a landlord's counsel
 * will attack first.
 *
 * So permissions are defined against the actions that carry legal
 * weight, and everything else is open.
 */

export type Permission =
  | "view"
  | "edit_locations"
  | "upload_documents"
  | "request_reports"
  | "assemble_notice"
  | "approve_notice"
  | "serve_notice"
  | "manage_users"
  | "manage_billing";

export const PERMISSION_LABEL: Record<Permission, string> = {
  view: "View the portfolio",
  edit_locations: "Add and edit locations",
  upload_documents: "Upload leases and amendments",
  request_reports: "Request reports and exports",
  assemble_notice: "Assemble notice packages",
  approve_notice: "Approve a package after review",
  serve_notice: "Record a notice as served",
  manage_users: "Manage users and roles",
  manage_billing: "Manage billing and the contract",
};

export type RoleId =
  | "owner"
  | "real_estate"
  | "lease_admin"
  | "counsel"
  | "signatory"
  | "viewer";

export const ROLES: Record<
  RoleId,
  { label: string; blurb: string; permissions: Permission[] }
> = {
  owner: {
    label: "Account owner",
    blurb: "Full access, including users and the contract.",
    permissions: [
      "view",
      "edit_locations",
      "upload_documents",
      "request_reports",
      "assemble_notice",
      "approve_notice",
      "serve_notice",
      "manage_users",
      "manage_billing",
    ],
  },
  real_estate: {
    label: "Real estate",
    blurb: "Runs the portfolio day to day and decides what to pursue.",
    permissions: [
      "view",
      "edit_locations",
      "upload_documents",
      "request_reports",
      "assemble_notice",
    ],
  },
  lease_admin: {
    label: "Lease administration",
    blurb: "Maintains the records the monitoring runs on.",
    permissions: ["view", "edit_locations", "upload_documents", "request_reports"],
  },
  counsel: {
    label: "Legal",
    blurb:
      "Reviews a package before anything goes to a landlord. Cannot serve, by design.",
    permissions: ["view", "request_reports", "approve_notice"],
  },
  signatory: {
    label: "Authorized signatory",
    blurb:
      "The only role that can record a notice as served. This is the name that goes on it.",
    permissions: ["view", "request_reports", "serve_notice"],
  },
  viewer: {
    label: "Viewer",
    blurb: "Read only. Useful for finance and asset management.",
    permissions: ["view"],
  },
};

export function can(role: RoleId, permission: Permission): boolean {
  return ROLES[role].permissions.includes(permission);
}

/* ------------------------------------------------------------------
   members
   ------------------------------------------------------------------ */

export type MemberStatus = "active" | "invited" | "suspended";

export type Member = {
  id: string;
  name: string;
  email: string;
  title: string;
  role: RoleId;
  status: MemberStatus;
  lastActive: string | null;
  initials: string;
};

export const members: Member[] = [
  {
    id: "u-1",
    name: "D. Okonkwo",
    email: "d.okonkwo@marlowefinch.com",
    title: "VP, Real Estate",
    role: "owner",
    status: "active",
    lastActive: "2026-08-04",
    initials: "DO",
  },
  {
    id: "u-2",
    name: "R. Alvarez",
    email: "r.alvarez@marlowefinch.com",
    title: "Director, Lease Administration",
    role: "lease_admin",
    status: "active",
    lastActive: "2026-08-04",
    initials: "RA",
  },
  {
    id: "u-3",
    name: "S. Pratt",
    email: "s.pratt@marlowefinch.com",
    title: "Associate General Counsel",
    role: "counsel",
    status: "active",
    lastActive: "2026-08-01",
    initials: "SP",
  },
  {
    id: "u-4",
    name: "M. Reyes",
    email: "m.reyes@marlowefinch.com",
    title: "SVP, Store Development",
    role: "signatory",
    status: "active",
    lastActive: "2026-07-28",
    initials: "MR",
  },
  {
    id: "u-5",
    name: "J. Whitaker",
    email: "j.whitaker@marlowefinch.com",
    title: "Controller",
    role: "viewer",
    status: "invited",
    lastActive: null,
    initials: "JW",
  },
];

/* ------------------------------------------------------------------
   notification routing
   ------------------------------------------------------------------ */

export type AlertKind =
  | "cure_elapsed"
  | "election_closing"
  | "near_threshold"
  | "anchor_dark"
  | "sweep_summary"
  | "report_ready"
  | "setup_needed";

export const ALERT_META: Record<
  AlertKind,
  { label: string; blurb: string; severity: "critical" | "action" | "info" }
> = {
  election_closing: {
    label: "Election window closing",
    blurb: "A right lapses if nobody acts. The most expensive alert we send.",
    severity: "critical",
  },
  cure_elapsed: {
    label: "Cure period elapsed",
    blurb: "A failing test is now claimable and the evidence is verified.",
    severity: "action",
  },
  anchor_dark: {
    label: "Named tenant closed",
    blurb: "A store one of your clauses depends on has stopped operating.",
    severity: "action",
  },
  setup_needed: {
    label: "Something needs you",
    blurb: "A center to confirm or a lease we are missing.",
    severity: "action",
  },
  near_threshold: {
    label: "Approaching a threshold",
    blurb: "Within three points. No action required yet.",
    severity: "info",
  },
  sweep_summary: {
    label: "Weekly sweep summary",
    blurb: "What the last pass checked and whether anything moved.",
    severity: "info",
  },
  report_ready: {
    label: "Report delivered",
    blurb: "A monthly or quarterly report has been generated.",
    severity: "info",
  },
};

export type RoutingRule = {
  kind: AlertKind;
  email: boolean;
  sms: boolean;
  inApp: boolean;
  /** Role ids that receive it. */
  roles: RoleId[];
};

export const defaultRouting: RoutingRule[] = [
  {
    kind: "election_closing",
    email: true,
    sms: true,
    inApp: true,
    roles: ["owner", "real_estate", "counsel", "signatory"],
  },
  {
    kind: "cure_elapsed",
    email: true,
    sms: false,
    inApp: true,
    roles: ["owner", "real_estate", "counsel"],
  },
  {
    kind: "anchor_dark",
    email: true,
    sms: false,
    inApp: true,
    roles: ["real_estate", "lease_admin"],
  },
  {
    kind: "setup_needed",
    email: true,
    sms: false,
    inApp: true,
    roles: ["lease_admin"],
  },
  {
    kind: "near_threshold",
    email: false,
    sms: false,
    inApp: true,
    roles: ["lease_admin"],
  },
  {
    kind: "sweep_summary",
    email: false,
    sms: false,
    inApp: true,
    roles: ["lease_admin"],
  },
  {
    kind: "report_ready",
    email: true,
    sms: false,
    inApp: true,
    roles: ["owner", "real_estate", "viewer"],
  },
];

/* ------------------------------------------------------------------
   the channel back to us
   ------------------------------------------------------------------ */

export type ThreadKind =
  | "question"
  | "document"
  | "dispute"
  | "data_correction"
  | "new_location";

export const THREAD_META: Record<
  ThreadKind,
  { label: string; blurb: string; sla: string }
> = {
  dispute: {
    label: "Landlord pushback",
    blurb: "A landlord has disputed a finding or a notice.",
    sla: "Same business day",
  },
  question: {
    label: "Question",
    blurb: "Anything about a clause, a finding or the math behind it.",
    sla: "1 business day",
  },
  document: {
    label: "Send a document",
    blurb: "A lease, an amendment, an estoppel or landlord correspondence.",
    sla: "2 business days to abstract",
  },
  data_correction: {
    label: "Something looks wrong",
    blurb: "A center, a clause reading or a figure you think is off.",
    sla: "1 business day",
  },
  new_location: {
    label: "Add locations",
    blurb: "New stores, acquisitions or a batch to onboard.",
    sla: "2 business days",
  },
};

export type Message = {
  id: string;
  from: "client" | "breakpoint";
  author: string;
  at: string;
  body: string;
};

export type Thread = {
  id: string;
  kind: ThreadKind;
  subject: string;
  status: "open" | "with_breakpoint" | "with_client" | "resolved";
  locationId?: string;
  opened: string;
  messages: Message[];
};

export const threads: Thread[] = [
  {
    id: "TH-104",
    kind: "dispute",
    subject: "Landlord disputes the anchor count at Fairmount Collection",
    status: "with_breakpoint",
    locationId: "MF-1000",
    opened: "2026-07-29",
    messages: [
      {
        id: "m1",
        from: "client",
        author: "S. Pratt",
        at: "2026-07-29",
        body: "Ownership responded to our notice arguing the replacement occupant in the former Ambrose box satisfies the Named Anchor definition. Can you pull what we hold on that space and the exact replacement language?",
      },
      {
        id: "m2",
        from: "breakpoint",
        author: "Breakpoint",
        at: "2026-07-30",
        body: "Pulled. The clause requires a replacement to occupy not less than ninety percent of the premises formerly occupied. Our field visit on Mar 6 measured the occupant at roughly 31% of the box, and the center directory lists it as a temporary tenant. We have the dated photograph and the directory capture. Both are in the package as exhibits C and D.",
      },
      {
        id: "m3",
        from: "client",
        author: "S. Pratt",
        at: "2026-08-01",
        body: "That is what we needed. Holding our position. Please keep the field evidence current in case this goes further.",
      },
    ],
  },
  {
    id: "TH-102",
    kind: "document",
    subject: "Sixth Amendment for Arbor Crossing",
    status: "resolved",
    locationId: "MF-1014",
    opened: "2026-07-14",
    messages: [
      {
        id: "m1",
        from: "client",
        author: "R. Alvarez",
        at: "2026-07-14",
        body: "Sending the executed Sixth Amendment. I believe it changes the co-tenancy requirement but I have not read it closely.",
      },
      {
        id: "m2",
        from: "breakpoint",
        author: "Breakpoint",
        at: "2026-07-16",
        body: "Abstracted and live. It does change it: the named anchor requirement is replaced by a count of two, effective on the amendment date, and the cure period moves from 90 days to 30. We have re-evaluated the location on the new terms and the finding stands.",
      },
    ],
  },
  {
    id: "TH-099",
    kind: "data_correction",
    subject: "Occupancy at Cordova Bluff looks high",
    status: "with_client",
    locationId: "MF-1021",
    opened: "2026-07-08",
    messages: [
      {
        id: "m1",
        from: "client",
        author: "R. Alvarez",
        at: "2026-07-08",
        body: "Our district manager says that center feels much emptier than the figure shown.",
      },
      {
        id: "m2",
        from: "breakpoint",
        author: "Breakpoint",
        at: "2026-07-09",
        body: "Agreed, and the number is flagged as an estimate for that reason. We hold 44% of the rent roll there, so the denominator is incomplete. Your lease carries an annual occupancy report right at Section 14.6(d). We have drafted the request for your signatory. Sending it would replace the estimate with the landlord's own certified figure.",
      },
    ],
  },
];
