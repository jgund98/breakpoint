"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ClientLocation,
  type NoticeStage,
  type SetupStage,
  type WorkspaceState,
  WorkspaceContext,
  audit,
  emptyState,
  fromIngest,
  loadState,
  saveState,
} from "@/lib/workspace-store";
import type { IngestRow } from "@/lib/ingest";
import { DEMO_USER } from "@/lib/session";
import { TODAY } from "@/lib/portfolio";

/**
 * Hydrates the browser-persisted workspace and exposes the mutations.
 * State loads after mount so the server render stays deterministic.
 */
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(emptyState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadState());
    setReady(true);
  }, []);

  const commit = useCallback((next: WorkspaceState) => {
    setState(next);
    saveState(next);
  }, []);

  const api = useMemo(() => {
    const actor = DEMO_USER.name;
    const now = TODAY;

    return {
      state,
      ready,

      addLocation: (loc: Omit<ClientLocation, "id" | "addedAt" | "source">) => {
        const id = `LOC-${String(state.locations.length + 1).padStart(4, "0")}`;
        const record: ClientLocation = {
          ...loc,
          id,
          addedAt: now,
          source: "manual",
        };
        commit({
          ...state,
          locations: [record, ...state.locations],
          audit: audit(
            state,
            {
              actor,
              action: "Added location",
              target: `${record.storeNumber} · ${record.centerName || record.city}`,
              detail: "Entered manually. Queued for center confirmation.",
            },
            now,
          ),
        });
      },

      editLocation: (id: string, patch: Partial<ClientLocation>) => {
        const before = state.locations.find((l) => l.id === id);
        const changed = Object.keys(patch)
          .filter((k) => (before as never)?.[k as never] !== (patch as never)[k as never])
          .join(", ");
        commit({
          ...state,
          locations: state.locations.map((l) =>
            l.id === id ? { ...l, ...patch } : l,
          ),
          audit: audit(
            state,
            {
              actor,
              action: "Edited location",
              target: before ? `${before.storeNumber}` : id,
              detail: changed ? `Changed ${changed}.` : undefined,
            },
            now,
          ),
        });
      },

      removeLocation: (id: string) => {
        const before = state.locations.find((l) => l.id === id);
        commit({
          ...state,
          locations: state.locations.filter((l) => l.id !== id),
          audit: audit(
            state,
            {
              actor,
              action: "Removed location",
              target: before ? before.storeNumber : id,
            },
            now,
          ),
        });
      },

      setStage: (id: string, stage: SetupStage) => {
        const before = state.locations.find((l) => l.id === id);
        commit({
          ...state,
          locations: state.locations.map((l) =>
            l.id === id ? { ...l, stage } : l,
          ),
          audit: audit(
            state,
            {
              actor,
              action: "Advanced setup stage",
              target: before ? before.storeNumber : id,
              detail: `Now ${stage.replace(/_/g, " ")}.`,
            },
            now,
          ),
        });
      },

      setNotice: (locationId: string, stage: NoticeStage, reason?: string) => {
        commit({
          ...state,
          notices: {
            ...state.notices,
            [locationId]: {
              stage,
              updatedAt: now,
              servedOn: stage === "served" ? now : state.notices[locationId]?.servedOn,
              reason,
            },
          },
          audit: audit(
            state,
            {
              actor,
              action: "Notice package",
              target: locationId,
              detail: `Moved to ${stage.replace(/_/g, " ")}.${reason ? ` ${reason}` : ""}`,
            },
            now,
          ),
        });
      },

      importOnboarding: (rows: IngestRow[], company: string) => {
        const locations = fromIngest(rows, company, now);
        commit({
          ...state,
          onboardedAt: now,
          company,
          locations,
          audit: audit(
            state,
            {
              actor,
              action: "Imported portfolio",
              target: company,
              detail: `${locations.length} locations loaded from onboarding.`,
            },
            now,
          ),
        });
      },

      reset: () => commit(emptyState),
    };
  }, [state, ready, commit]);

  return (
    <WorkspaceContext.Provider value={api}>
      {children}
    </WorkspaceContext.Provider>
  );
}
