"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Panel, PanelHead, Pill } from "./ui";

/**
 * The papers behind this location — and the front door of the
 * ingestion pipeline. A client drops a lease, amendment or estoppel
 * here; the document is stored, its text extracted page by page, the
 * extraction engine reads it, and the row below reports exactly where
 * it landed: read and proposed, with a person for review, or failed
 * with the honest reason. Nothing goes under watch without a person
 * signing off on the extraction desk.
 */

type Doc = {
  id: string;
  kind: string;
  filename: string;
  byte_size: number;
  created_at: string;
  job_status: string | null;
  confidence: number | null;
  provider: string | null;
  summary: string | null;
};

const fmtSize = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

const JOB_PILL: Record<string, { label: string; tone: "open" | "watch" | "clay" | "petrol" | "muted" }> = {
  approved: { label: "Reviewed and on file", tone: "open" },
  proposed: { label: "Read, awaiting sign-off", tone: "petrol" },
  review: { label: "With a person for review", tone: "watch" },
  extracting: { label: "Being read", tone: "muted" },
  queued: { label: "Queued", tone: "muted" },
  failed: { label: "Could not be read", tone: "clay" },
  rejected: { label: "Needs another copy", tone: "clay" },
};

export function PapersOnFile({ locationId }: { locationId: string }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [kind, setKind] = useState("amendment");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(
        `/app/api/documents?location=${encodeURIComponent(locationId)}`,
        { cache: "no-store" },
      );
      if (r.ok) setDocs((await r.json()).documents ?? []);
    } catch {
      /* the list renders empty rather than wrong */
    }
  }, [locationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (file: File) => {
    setBusy(true);
    setNotice(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("locationRef", locationId);
      form.append("kind", kind);
      const r = await fetch("/app/api/documents", { method: "POST", body: form });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setNotice(d?.error ?? "The upload was refused.");
      } else {
        setNotice(
          d.status === "failed"
            ? "Stored, but it could not be read. See the row below for why."
            : d.status === "review"
              ? "Stored and read. The extracted record is with a person for review."
              : "Stored and read. The extracted record is proposed for sign-off.",
        );
      }
      await load();
    } catch {
      setNotice("The upload did not go through. Try again.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Panel>
      <PanelHead
        title="Papers on file"
        hint="The lease and its amendments, as we hold them. This location's clause record is read from these."
      />

      {/* the front door: drop a paper, the pipeline reads it */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          aria-label="Document kind"
          className="h-10 rounded-xl border border-slate-200 bg-white px-2.5 text-[0.8125rem] text-slate-700 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
        >
          <option value="lease">Lease</option>
          <option value="amendment">Amendment</option>
          <option value="estoppel">Estoppel</option>
          <option value="other">Other</option>
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap text-white shadow-md shadow-indigo-500/30 transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {busy ? "Reading…" : "Upload a paper"}
        </button>
        <span className="text-[0.6875rem] text-slate-400">
          PDF or text, up to 4 MB
        </span>
      </div>
      {notice && (
        <p className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-[0.75rem] text-indigo-800">
          {notice}
        </p>
      )}

      <ul className="mt-4 space-y-1.5">
        {(docs ?? []).map((d) => {
          const pill = d.job_status ? JOB_PILL[d.job_status] : null;
          return (
            <li
              key={d.id}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[0.8125rem] font-medium text-slate-800">
                      {d.filename}
                    </span>
                    <span className="block text-[0.6875rem] text-slate-400">
                      <span className="mr-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase text-slate-500">
                        {d.kind}
                      </span>
                      {fmtSize(d.byte_size)} ·{" "}
                      {new Date(d.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {pill && (
                    <Pill tone={pill.tone} dot>
                      {pill.label}
                    </Pill>
                  )}
                  <a
                    href={`/app/api/documents?id=${d.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[0.75rem] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View
                  </a>
                </span>
              </div>
              {d.summary && d.job_status !== "approved" && (
                <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-[0.6875rem] leading-relaxed text-slate-500">
                  {d.summary}
                </p>
              )}
            </li>
          );
        })}
        {docs !== null && docs.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-[0.75rem] text-slate-400">
            No papers digitized for this location yet. Upload the lease or an
            amendment above and the pipeline reads it on the spot.
          </li>
        )}
      </ul>
    </Panel>
  );
}
