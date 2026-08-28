"use client";

import { useState } from "react";
import { BrainCircuit } from "lucide-react";
import { PageHeader } from "@/components/admin/Shell";
import { Badge, Rise, Segmented, StatCard } from "@/components/admin/ui";
import { DirectiveEditor } from "@/components/admin/Directives";
import { useConsole } from "@/components/admin/useConsole";

/** The system-wide agent canon, editable without a deploy. */

const TOPICS = ["all", "general", "extraction", "scanning", "matching", "notices"] as const;
type Topic = (typeof TOPICS)[number];

export function AgentCanon() {
  const { data, post } = useConsole();
  const [topic, setTopic] = useState<Topic>("all");

  if (!data) {
    return <p className="py-16 text-center text-[0.8125rem] text-slate-400">Loading.</p>;
  }

  const active = data.directives.filter((d) => d.active).length;
  const shown =
    topic === "all"
      ? data.directives
      : data.directives.filter((d) => d.topic === topic);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent canon"
        blurb="System-wide programming. These rules are assembled into every extraction and scan run, for every client. A row edit here reaches the agent without a deploy."
        aside={
          <Badge tone="indigo" dot>
            {active} active
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Directives"
          value={data.directives.length}
          sub="Every one carries a receipt from the pilot"
          icon={<BrainCircuit className="h-5 w-5" />}
          color="indigo"
          delay={0}
        />
        <StatCard
          label="Active"
          value={active}
          sub="Assembled into every prompt"
          color="emerald"
          delay={50}
        />
        <StatCard
          label="Disabled"
          value={data.directives.length - active}
          sub="Kept on file, not sent"
          color="slate"
          delay={100}
        />
      </div>

      <Rise delay={150}>
        <Segmented<Topic>
          className="w-fit"
          value={topic}
          onChange={setTopic}
          options={TOPICS.map((t) => ({
            value: t,
            label: t === "all" ? "All" : t[0].toUpperCase() + t.slice(1),
            count:
              t === "all"
                ? data.directives.length
                : data.directives.filter((d) => d.topic === t).length,
          }))}
        />
      </Rise>

      <Rise delay={200}>
        <DirectiveEditor
          title="Breakpoint-wide"
          blurb="Per-client programming returns later, on the client boards."
          scope="global"
          directives={shown}
          onPost={post}
        />
      </Rise>
    </div>
  );
}
