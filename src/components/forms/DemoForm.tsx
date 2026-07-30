"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * Three steps, no more. Step one prefills from the visitor's own words,
 * step two is tappable, step three asks for as little as it can get away
 * with. The success state scrolls itself into view and names a human.
 *
 * NOTE: submission is stubbed. Wire `submit()` to your endpoint before
 * this collects anything real.
 */

const sizes = ["1 – 10 locations", "11 – 50", "51 – 250", "250+"];

const situations = [
  "A center I'm worried about",
  "An anchor just closed",
  "Occupancy is sliding",
  "One lease I want checked",
  "Renewals coming up",
  "We've never checked",
];

const STEPS = ["Who you are", "What's happening", "Where to send it"];

export function DemoForm() {
  const [step, setStep] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [fields, setFields] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const doneRef = useRef<HTMLDivElement>(null);

  const toggle = (s: string) =>
    setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const canAdvance =
    step === 0 ? Boolean(size) : step === 1 ? picked.length > 0 : true;

  const submit = () => {
    const next: Record<string, string> = {};
    if (!fields.name.trim()) next.name = "We need something to call you.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.email))
      next.email = "That address doesn't look right.";
    if (!fields.company.trim()) next.company = "Which company?";
    setErrors(next);
    if (Object.keys(next).length) return;

    // TODO: post to a real endpoint before shipping.
    console.log("demo request", { size, picked, ...fields });
    setDone(true);
    requestAnimationFrame(() =>
      doneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };

  if (done) {
    return (
      <div
        ref={doneRef}
        className="flex min-h-[26rem] items-center justify-center rounded-xl border border-line bg-surface p-8 text-center lift sm:p-12"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-md"
        >
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-petrol-50 text-2xl text-petrol-700">
            ✓
          </span>
          <h3 className="mt-6 text-[clamp(1.5rem,3vw,2rem)]">
            Got it, {fields.name.trim().split(" ")[0]}.
          </h3>
          <p className="no-orphan mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">
            A person — not a sequence — will reply within one business day to
            arrange the walkthrough and tell you exactly which documents to send.
          </p>
          <p className="no-orphan mt-5 text-[0.9375rem] leading-relaxed text-muted">
            In a hurry? Reply to that email with a single lease attached and
            we&#8217;ll start on it before the call.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-6 lift sm:p-8">
      {/* progress */}
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-500",
                i <= step ? "bg-petrol-700" : "bg-surface-sunk",
              )}
            />
          </li>
        ))}
      </ol>
      <p className="label mt-4 text-muted">
        Step {step + 1} of 3 · {STEPS[step]}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6"
        >
          {/* ---------- step 1 ---------- */}
          {step === 0 && (
            <>
              <h3 className="text-[1.375rem]">How many leased locations?</h3>
              <p className="mt-2 text-[0.9375rem] text-muted">
                One is plenty — the evaluation starts with a single lease.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {sizes.map((s) => (
                  <Chip key={s} on={size === s} onClick={() => setSize(s)} label={s} />
                ))}
              </div>
            </>
          )}

          {/* ---------- step 2 ---------- */}
          {step === 1 && (
            <>
              <h3 className="text-[1.375rem]">What&#8217;s prompting this?</h3>
              <p className="mt-2 text-[0.9375rem] text-muted">
                Pick anything that applies.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {situations.map((s) => (
                  <Chip
                    key={s}
                    on={picked.includes(s)}
                    onClick={() => toggle(s)}
                    label={s}
                  />
                ))}
              </div>
            </>
          )}

          {/* ---------- step 3 ---------- */}
          {step === 2 && (
            <>
              <h3 className="text-[1.375rem]">Where do we send it?</h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Name"
                  hint="First name is fine"
                  value={fields.name}
                  error={errors.name}
                  onChange={(v) => setFields((f) => ({ ...f, name: v }))}
                  autoComplete="given-name"
                />
                <Field
                  label="Company"
                  value={fields.company}
                  error={errors.company}
                  onChange={(v) => setFields((f) => ({ ...f, company: v }))}
                  autoComplete="organization"
                />
                <Field
                  label="Work email"
                  type="email"
                  value={fields.email}
                  error={errors.email}
                  onChange={(v) => setFields((f) => ({ ...f, email: v }))}
                  autoComplete="email"
                  className="sm:col-span-2"
                />
                <Field
                  label="Phone"
                  hint="Optional"
                  type="tel"
                  value={fields.phone}
                  onChange={(v) => setFields((f) => ({ ...f, phone: v }))}
                  autoComplete="tel"
                  className="sm:col-span-2"
                />
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* nav */}
      <div className="mt-8 flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="rounded-full px-5 py-3 text-[0.9375rem] font-medium text-muted transition-colors hover:bg-surface-sunk hover:text-ink"
          >
            Back
          </button>
        )}
        <button
          type="button"
          disabled={!canAdvance}
          onClick={() => (step === 2 ? submit() : setStep((s) => s + 1))}
          className={cn(
            "ml-auto rounded-full px-7 py-3.5 text-[0.9375rem] font-medium transition-all duration-300",
            canAdvance
              ? "bg-petrol-800 text-cream hover:bg-petrol-700"
              : "cursor-not-allowed bg-surface-sunk text-faint",
          )}
        >
          {step === 2 ? "Request a walkthrough" : "Continue"}
        </button>
      </div>
    </div>
  );
}

function Chip({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-3 text-left text-[0.9375rem] transition-all duration-300",
        on
          ? "border-petrol-800 bg-petrol-50 text-petrol-900"
          : "border-line text-ink-soft hover:border-petrol-300 hover:bg-petrol-50/50",
      )}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  className,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink">{label}</span>
        {hint && <span className="text-xs text-faint">{hint}</span>}
      </span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "mt-2 w-full rounded-lg border bg-canvas px-4 py-3 text-[1rem] text-ink outline-none transition-colors placeholder:text-faint focus:border-petrol-600",
          error ? "border-clay-500" : "border-line",
        )}
      />
      {error && <span className="mt-1.5 block text-xs text-clay-600">{error}</span>}
    </label>
  );
}
