"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { TimelineDecision } from "@/domain/types";
import { canUploadProposal } from "@/domain/workflow";

interface PreviewState {
  timelineDecision: TimelineDecision | null;
  proposalUnlocked: boolean;
  setTimelineDecision: (decision: TimelineDecision) => void;
}

const PreviewContext = createContext<PreviewState | null>(null);
const STORAGE_KEY = "masar-preview-timeline-decision";

export function PreviewStateProvider({ children }: { children: React.ReactNode }) {
  const [timelineDecision, setDecision] = useState<TimelineDecision | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as TimelineDecision | null;
    if (stored === "approved" || stored === "approved_with_warnings" || stored === "resubmit") setDecision(stored);
  }, []);

  const value = useMemo<PreviewState>(() => ({
    timelineDecision,
    proposalUnlocked: timelineDecision ? canUploadProposal(timelineDecision) : false,
    setTimelineDecision(decision) {
      setDecision(decision);
      window.localStorage.setItem(STORAGE_KEY, decision);
    }
  }), [timelineDecision]);

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}

export function usePreviewState(): PreviewState {
  const state = useContext(PreviewContext);
  if (!state) throw new Error("usePreviewState must be used inside PreviewStateProvider");
  return state;
}
