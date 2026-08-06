"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { ActionButton } from "./ui";

/**
 * A control for work the backend will do.
 *
 * These used to be buttons that did nothing at all when clicked, which
 * reads as broken rather than unfinished. Until delivery is wired, the
 * honest behaviour is to acknowledge the request and say plainly what
 * will happen, so a reader can tell the difference between a feature
 * that is queued and a button that is dead.
 */
export function PendingAction({
  label,
  confirmation,
  variant = "brass",
  className,
}: {
  label: string;
  confirmation: string;
  variant?: "primary" | "secondary" | "quiet" | "brass";
  className?: string;
}) {
  const [done, setDone] = useState(false);

  return (
    <div className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.p
            key="done"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 text-[0.75rem] font-medium text-open-700"
          >
            <Check className="h-3.5 w-3.5" />
            {confirmation}
          </motion.p>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ActionButton
              variant={variant}
              className="w-full px-3 py-2"
              onClick={() => setDone(true)}
            >
              {label}
            </ActionButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
