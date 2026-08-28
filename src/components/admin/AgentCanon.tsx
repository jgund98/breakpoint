"use client";

import { PageHeader } from "@/components/admin/Shell";
import { Rise } from "@/components/admin/ui";
import { DirectiveEditor } from "@/components/admin/Directives";
import { useConsole } from "@/components/admin/useConsole";

/** The system-wide agent canon, editable without a deploy. */
export function AgentCanon() {
  const { data, post } = useConsole();

  if (!data) {
    return <p className="py-16 text-center text-[0.8125rem] text-slate-400">Loading.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent canon"
        blurb="System-wide programming. These rules are assembled into every extraction and scan run, for every client. A row edit here reaches the agent without a deploy."
      />
      <Rise>
        <DirectiveEditor
          title="Breakpoint-wide"
          blurb="Every rule carries a receipt from the pilot. Per-client programming returns later, on the client boards."
          scope="global"
          directives={data.directives}
          onPost={post}
        />
      </Rise>
    </div>
  );
}
