"use client";

import { useCallback, useEffect, useState } from "react";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Badge,
  Btn,
  Card,
  EmptyNote,
  inputCls,
  selectCls,
  textareaCls,
} from "@/components/admin/ui";

/**
 * THE CAPTURE CHECKLIST
 *
 * The expert's extraction schema as an editable board: every field a
 * lease abstraction must hunt for, in their words. Assembled into the
 * extraction prompt on every run (lib/extraction-schema.ts), so tuning
 * what the agent looks for is a row edit here, never a deploy.
 *
 * Expert-schema rows can be edited and switched off but never deleted;
 * console-added rows can be removed.
 */

type FieldRow = {
  id: string;
  field_key: string;
  label: string;
  instruction: string;
  category: string;
  required: boolean;
  active: boolean;
  sort: number;
  source: string | null;
};

const CATEGORIES: { key: string; title: string }[] = [
  { key: "identity", title: "The document and the clause" },
  { key: "trigger", title: "The trigger" },
  { key: "remedy", title: "The remedy and its clocks" },
  { key: "preconditions", title: "Tenant preconditions" },
  { key: "status", title: "What has already happened" },
  { key: "review", title: "Honesty about the read" },
];

function EditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: { label: string; instruction: string; required: boolean };
  onSave: (v: { label: string; instruction: string; required: boolean }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial.label);
  const [instruction, setInstruction] = useState(initial.instruction);
  const [required, setRequired] = useState(initial.required);
  return (
    <div className="mt-2 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className={inputCls}
        aria-label="Field label"
      />
      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        rows={3}
        className={textareaCls}
        aria-label="Field instruction"
      />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-[0.75rem] font-medium text-slate-600">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-3.5 w-3.5 accent-indigo-600"
          />
          Required
        </label>
        <Btn
          disabled={!label.trim() || !instruction.trim()}
          onClick={() => onSave({ label, instruction, required })}
        >
          Save
        </Btn>
        <button
          type="button"
          onClick={onCancel}
          className="text-[0.75rem] font-semibold text-slate-500 hover:text-slate-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function CapturePanel() {
  const [fields, setFields] = useState<FieldRow[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addCategory, setAddCategory] = useState("review");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/admin/api?pipeline=1", { cache: "no-store" });
    if (!res.ok) return;
    const d = await res.json();
    setFields(d.fields ?? []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch("/admin/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setError(null);
      await load();
    } else {
      setError(
        ((await res.json().catch(() => null)) as { error?: string } | null)
          ?.error ?? "That did not save.",
      );
    }
    return res.ok;
  };

  const activeCount = fields?.filter((f) => f.active).length ?? 0;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900">
            <ListChecks className="h-4 w-4 text-indigo-600" />
            The capture checklist
          </h2>
          <p className="mt-0.5 max-w-[52rem] text-[0.8125rem] leading-snug text-slate-500">
            What every lease abstraction must hunt for, in our expert&apos;s
            words, seeded from their gold-set schema. Every active field is
            assembled into the extraction prompt on every run; edits here
            reach the agent without a deploy. Expert fields can be switched
            off but never deleted.
          </p>
        </div>
        <Badge tone="indigo" dot>
          {activeCount} active
        </Badge>
      </div>

      {fields === null && (
        <p className="px-6 py-5 text-[0.8125rem] text-slate-400">Loading…</p>
      )}
      {fields !== null && fields.length === 0 && (
        <div className="px-6 py-5">
          <EmptyNote>
            No fields on file. Run scripts/seed-extraction-fields.mjs to load
            the expert schema.
          </EmptyNote>
        </div>
      )}

      {CATEGORIES.map(({ key, title }) => {
        const rows = (fields ?? []).filter((f) => f.category === key);
        if (!rows.length) return null;
        return (
          <div key={key} className="border-b border-slate-100 last:border-b-0">
            <p className="bg-slate-50/60 px-6 py-2 text-[0.6875rem] font-semibold tracking-wider text-slate-400 uppercase">
              {title}
            </p>
            <ul className="divide-y divide-slate-50">
              {rows.map((f) => (
                <li key={f.id} className={cn("px-6 py-3", !f.active && "opacity-45")}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-[0.8125rem] font-semibold text-slate-900">
                        {f.label}
                        {f.required && <Badge tone="amber">Required</Badge>}
                        {f.source === "ops" && <Badge tone="slate">Added here</Badge>}
                      </p>
                      {editing !== f.id && (
                        <p className="mt-0.5 max-w-[56rem] text-[0.8125rem] leading-snug text-slate-500">
                          {f.instruction}
                        </p>
                      )}
                    </div>
                    <span className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditing(editing === f.id ? null : f.id)}
                        className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-slate-500 hover:text-slate-900"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void post({ action: "xfield_toggle", id: f.id })}
                        className="text-[0.75rem] font-semibold text-slate-500 hover:text-slate-900"
                      >
                        {f.active ? "Switch off" : "Switch on"}
                      </button>
                      {f.source === "ops" && (
                        <button
                          type="button"
                          onClick={() => void post({ action: "xfield_remove", id: f.id })}
                          className="text-slate-300 transition-colors hover:text-rose-600"
                          aria-label={`Remove ${f.label}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  </div>
                  {editing === f.id && (
                    <EditForm
                      initial={{
                        label: f.label,
                        instruction: f.instruction,
                        required: f.required,
                      }}
                      onSave={(v) => {
                        void post({ action: "xfield_update", id: f.id, ...v }).then(
                          (ok) => ok && setEditing(null),
                        );
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <Plus className="h-4 w-4" /> Add a field
          </button>
        ) : (
          <div className="space-y-2">
            <select
              value={addCategory}
              onChange={(e) => setAddCategory(e.target.value)}
              className={selectCls}
              aria-label="Field category"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.title}
                </option>
              ))}
            </select>
            <EditForm
              initial={{ label: "", instruction: "", required: false }}
              onSave={(v) => {
                void post({ action: "xfield_add", category: addCategory, ...v }).then(
                  (ok) => ok && setAdding(false),
                );
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}
        {error && (
          <p className="mt-2 text-[0.8125rem] font-medium text-rose-600">{error}</p>
        )}
      </div>
    </Card>
  );
}
