"use client";

import { useState } from "react";
import {
  ArrowUpFromLine,
  CalendarClock,
  ClipboardType,
  FolderGit2,
  Mail,
  Plug,
  Server,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * HOW THE DATA GETS HERE
 *
 * A corporate real estate team is not one person with a spreadsheet.
 * Lease administration exports from a system, legal keeps scans on a
 * network share, finance will not email sales figures at all, and
 * somewhere there is a box of executed originals nobody has scanned.
 * Offering three radio buttons and hoping for the best is how a file
 * arrives six weeks late attached to a forwarded thread.
 *
 * So every route in is listed, each one is immediately actionable, and
 * the ones that put no work on the client at all are first.
 */

export type ChannelId =
  | "upload"
  | "paste"
  | "share"
  | "sftp"
  | "email"
  | "system"
  | "session"
  | "courier";

export type ChannelDef = {
  id: ChannelId;
  label: string;
  /** One line. What happens, not why it is good. */
  detail: string;
  Icon: typeof Mail;
  /** Where the work sits once chosen. */
  effort: "none" | "low" | "medium";
};

const ALL: ChannelDef[] = [
  {
    id: "system",
    label: "We pull it from your system",
    detail: "Read access to Tango, Visual Lease, MRI, Yardi, Lucernex or CoStar. We extract and reconcile.",
    Icon: Plug,
    effort: "none",
  },
  {
    id: "share",
    label: "Point us at a folder",
    detail: "SharePoint, Box, Drive or S3. Read access is enough. We crawl it and report what we found.",
    Icon: FolderGit2,
    effort: "none",
  },
  {
    id: "sftp",
    label: "Drop it on our SFTP",
    detail: "Host, user and key issued on request. Suits scheduled exports and anything over a few hundred megabytes.",
    Icon: Server,
    effort: "low",
  },
  {
    id: "upload",
    label: "Upload here",
    detail: "Excel, CSV or PDF, single or bulk. Read in your browser before anything is sent.",
    Icon: ArrowUpFromLine,
    effort: "low",
  },
  {
    id: "email",
    label: "Email it",
    detail: "A dedicated address per account. Attachments are filed against your onboarding automatically.",
    Icon: Mail,
    effort: "low",
  },
  {
    id: "paste",
    label: "Paste it",
    detail: "Straight out of a spreadsheet. Fastest for a short list or a correction.",
    Icon: ClipboardType,
    effort: "low",
  },
  {
    id: "session",
    label: "Book a working session",
    detail: "Sixty minutes with our team on a call. We drive; someone from your side approves as we go.",
    Icon: CalendarClock,
    effort: "medium",
  },
  {
    id: "courier",
    label: "Send physical originals",
    detail: "Courier to our records address. Scanned, returned, and logged against each store.",
    Icon: Truck,
    effort: "medium",
  },
];

const EFFORT_LABEL: Record<ChannelDef["effort"], string> = {
  none: "Nothing for you to do",
  low: "Minutes",
  medium: "Scheduled",
};

export function DeliveryPicker({
  only,
  value,
  onChange,
  children,
}: {
  /** Restrict to the routes that make sense for this kind of data. */
  only: ChannelId[];
  value: ChannelId | null;
  onChange: (id: ChannelId) => void;
  /** Rendered under the chosen route: a dropzone, a field, credentials. */
  children?: React.ReactNode;
}) {
  const list = ALL.filter((c) => only.includes(c.id));
  return (
    <div>
      <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
        {list.map((c) => {
          const on = value === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className={cn(
                "flex items-start gap-3 bg-surface px-4 py-3 text-left transition-colors duration-150",
                on ? "bg-petrol-50" : "hover:bg-surface-sunk",
              )}
            >
              <c.Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  on ? "text-petrol-700" : "text-faint",
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span
                    className={cn(
                      "text-[0.8125rem]",
                      on ? "font-semibold text-petrol-800" : "font-medium text-ink",
                    )}
                  >
                    {c.label}
                  </span>
                  <span className="text-[0.6875rem] text-faint">
                    {EFFORT_LABEL[c.effort]}
                  </span>
                </span>
                <span className="mt-0.5 block text-[0.75rem] leading-snug text-muted">
                  {c.detail}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {value && children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------
   what each route needs once chosen
   ------------------------------------------------------------------ */

export function ChannelDetail({
  channel,
  account,
  note,
  onNote,
  upload,
}: {
  channel: ChannelId;
  account: string;
  note: string;
  onNote: (v: string) => void;
  /** The dropzone, supplied by the caller so it stays task specific. */
  upload?: React.ReactNode;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (v: string) => {
    void navigator.clipboard?.writeText(v);
    setCopied(v);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 last:border-0">
      <span className="text-[0.75rem] text-muted">{k}</span>
      <button
        type="button"
        onClick={() => copy(v)}
        className="font-mono text-[0.75rem] text-ink underline decoration-line underline-offset-2 hover:text-petrol-700"
      >
        {copied === v ? "copied" : v}
      </button>
    </div>
  );

  if (channel === "upload" || channel === "paste") return <>{upload}</>;

  if (channel === "sftp")
    return (
      <div className="rounded-xl border border-line bg-surface-sunk p-4">
        <p className="text-[0.8125rem] font-medium text-ink">Transfer details</p>
        <div className="mt-2">
          <Row k="Host" v="sftp.breakpoint.re" />
          <Row k="User" v={`${account}`} />
          <Row k="Key" v="issued by your account manager" />
          <Row k="Path" v={`/${account}/inbound`} />
        </div>
        <p className="mt-3 text-[0.75rem] leading-relaxed text-muted">
          Anything dropped here is logged against this onboarding within the
          hour. Scheduled exports are welcome; we reconcile each run against
          the last.
        </p>
      </div>
    );

  if (channel === "email")
    return (
      <div className="rounded-xl border border-line bg-surface-sunk p-4">
        <p className="text-[0.8125rem] font-medium text-ink">Send to</p>
        <div className="mt-2">
          <Row k="Address" v={`${account}@intake.breakpoint.re`} />
        </div>
        <p className="mt-3 text-[0.75rem] leading-relaxed text-muted">
          Attachments are filed against this account and the sender is
          recorded. Forwarded threads are fine; we read the attachments, not
          the thread.
        </p>
      </div>
    );

  if (channel === "session")
    return (
      <div className="rounded-xl border border-line bg-surface-sunk p-4">
        <p className="text-[0.8125rem] font-medium text-ink">Working session</p>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-soft">
          Sixty minutes, screen shared, our analyst driving. Bring whoever has
          access to the system and nobody needs to prepare anything.
        </p>
        <textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          rows={2}
          placeholder="Times that suit, and who should be on it."
          className="mt-3 w-full rounded-lg border border-line bg-surface p-3 text-[0.8125rem] text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
        />
      </div>
    );

  /* share, system, courier all want the same thing: where, and who to ask. */
  const prompt: Record<string, string> = {
    share: "Folder link, and who can grant read access.",
    system: "Which system, and the administrator we should contact.",
    courier: "What is coming, roughly how much, and a contact for the return.",
  };
  return (
    <div>
      <label className="label text-muted">Details</label>
      <textarea
        value={note}
        onChange={(e) => onNote(e.target.value)}
        rows={3}
        placeholder={prompt[channel] ?? ""}
        className="mt-2 w-full rounded-xl border border-line bg-surface-sunk p-3.5 text-[0.8125rem] text-ink placeholder:text-faint focus:border-petrol-500 focus:outline-none"
      />
      {channel === "courier" && (
        <p className="mt-2 text-[0.75rem] leading-relaxed text-muted">
          Records address is issued with the shipping label. Originals are
          returned inside ten business days.
        </p>
      )}
    </div>
  );
}
