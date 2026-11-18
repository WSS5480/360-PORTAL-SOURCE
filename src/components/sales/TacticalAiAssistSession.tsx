"use client";

import React from "react";
import type { PrepareTacticalAiAssistActionId } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistActions";
import type { TacticalAssistFeedback } from "@/components/sales/PrepareTacticalAiAssistActions";

export type TacticalAiAssistAppliedMap = Partial<
  Record<PrepareTacticalAiAssistActionId, TacticalAssistFeedback>
>;

type TacticalAiAssistSessionValue = {
  engagementId: string;
  applied: TacticalAiAssistAppliedMap;
  setApplied: (action: PrepareTacticalAiAssistActionId, entry: TacticalAssistFeedback | null) => void;
  clearAll: () => void;
};

const TacticalAiAssistSessionContext = React.createContext<TacticalAiAssistSessionValue | null>(
  null,
);

export function TacticalAiAssistSessionProvider({
  engagementId,
  children,
}: {
  engagementId: string;
  children: React.ReactNode;
}) {
  const [applied, setAppliedState] = React.useState<TacticalAiAssistAppliedMap>({});

  React.useEffect(() => {
    setAppliedState({});
  }, [engagementId]);

  const setApplied = React.useCallback(
    (action: PrepareTacticalAiAssistActionId, entry: TacticalAssistFeedback | null) => {
      setAppliedState((prev) => {
        const next = { ...prev };
        if (entry) next[action] = entry;
        else delete next[action];
        return next;
      });
    },
    [],
  );

  const clearAll = React.useCallback(() => setAppliedState({}), []);

  const value = React.useMemo(
    () => ({ engagementId, applied, setApplied, clearAll }),
    [engagementId, applied, setApplied, clearAll],
  );

  return (
    <TacticalAiAssistSessionContext.Provider value={value}>{children}</TacticalAiAssistSessionContext.Provider>
  );
}

export function useTacticalAiAssistSession(engagementId: string): TacticalAiAssistSessionValue | null {
  const ctx = React.useContext(TacticalAiAssistSessionContext);
  if (!ctx || ctx.engagementId !== engagementId) return null;
  return ctx;
}
