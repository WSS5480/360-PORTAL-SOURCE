"use client";
import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LeaderboardRepDetailDrawer } from "@/components/sales/LeaderboardRepDetailDrawer";
import { LeaderboardDemoModeToggle } from "@/components/sales/leaderboard/LeaderboardDemoModeBanner";
import {
  LeaderboardEmptyState,
  LeaderboardLoadingSkeleton,
} from "@/components/sales/leaderboard/LeaderboardRankCard";
import { LeaderboardPersonalScorePanel } from "@/components/sales/leaderboard/LeaderboardPersonalScorePanel";
import { LeaderboardPodium } from "@/components/sales/leaderboard/LeaderboardPodium";
import { LeaderboardRankTable } from "@/components/sales/leaderboard/LeaderboardRankTable";
import { LeaderboardFilterBar } from "@/components/sales/leaderboard/LeaderboardFilterBar";
import { LeaderboardScoringGuide } from "@/components/sales/leaderboard/LeaderboardScoringGuide";
import { LeaderboardInsightStrip } from "@/components/sales/leaderboard/LeaderboardInsightStrip";
import { LeaderboardUserRankSummary } from "@/components/sales/leaderboard/LeaderboardUserRankSummary";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import { sc } from "@/components/sales/salesCommandUi";
import {
  buildLeaderboardDemoModeResponse,
  LEADERBOARD_DEMO_MODE_STORAGE_KEY,
} from "@/lib/surgical-sales/leaderboardDemoMode";
import {
  LEADERBOARD_PAGE_VIEWS,
  type LeaderboardPageView,
} from "@/lib/surgical-sales/leaderboardPresentation";
import type { LeaderboardPortalResponse } from "@/lib/surgical-sales/leaderboardPortalTypes";
import { repDetailFromBoardEntry, type LeaderboardRepDetail } from "@/lib/surgical-sales/leaderboardRepDetail";
import type { LeaderboardFilterOptions } from "@/lib/surgical-sales/leaderboardTeamFilters";
import { leaderboardPeriodBounds } from "@/lib/surgical-sales/leaderboardPeriod";
import type { LeaderboardPeriodKey } from "@/lib/surgical-sales/leaderboardPeriod";
import type { LeaderboardTeamFilterType } from "@/lib/surgical-sales/leaderboardTeamFilters";
import { userFacingError } from "@/lib/errors/userFacingError";
type SalesExecutionLeaderboardClientProps = {
  previewUserId?: string | null;
};
export default function SalesExecutionLeaderboardClient({ previewUserId }: SalesExecutionLeaderboardClientProps) {
  const searchParams = useSearchParams();
  const urlDemo = searchParams.get("demo") === "1";
  const urlView = searchParams.get("view");
  const [data, setData] = React.useState<LeaderboardPortalResponse | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [demoMode, setDemoMode] = React.useState(false);
  const [demoModeReady, setDemoModeReady] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<LeaderboardPeriodKey>("month");
  const [customStart, setCustomStart] = React.useState("");
  const [customEnd, setCustomEnd] = React.useState("");
  const [teamType, setTeamType] = React.useState<LeaderboardTeamFilterType>("all");
  const [teamValue, setTeamValue] = React.useState("");
  const [pageView, setPageView] = React.useState<LeaderboardPageView>(() =>
    urlView === "scorecard" ? "scorecard" : "leaderboard",
  );
  const [selectedDetail, setSelectedDetail] = React.useState<LeaderboardRepDetail | null>(null);
  React.useEffect(() => {
    if (urlView === "scorecard" || urlView === "leaderboard") {
      setPageView(urlView);
    }
  }, [urlView]);
  React.useEffect(() => {
    if (urlDemo) {
      setDemoMode(true);
      try {
        sessionStorage.setItem(LEADERBOARD_DEMO_MODE_STORAGE_KEY, "1");
      } catch {
        /* ignore storage errors */
      }
    } else {
      try {
        setDemoMode(sessionStorage.getItem(LEADERBOARD_DEMO_MODE_STORAGE_KEY) === "1");
      } catch {
        setDemoMode(false);
      }
    }
    setDemoModeReady(true);
  }, [urlDemo]);
  const handleDemoModeChange = React.useCallback((next: boolean) => {
    setDemoMode(next);
    try {
      if (next) {
        sessionStorage.setItem(LEADERBOARD_DEMO_MODE_STORAGE_KEY, "1");
      } else {
        sessionStorage.removeItem(LEADERBOARD_DEMO_MODE_STORAGE_KEY);
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);
  React.useEffect(() => {
    if (!demoModeReady) return;
    if (demoMode) {
      setErr(null);
      const bounds = leaderboardPeriodBounds(new Date(), period, {
        start: customStart,
        end: customEnd,
      });
      setData(
        buildLeaderboardDemoModeResponse({
          previewUserId,
          periodKey: period,
          periodLabel: `${bounds.label} (Demo)`,
          customPeriod: period === "custom" ? { start: customStart, end: customEnd } : undefined,
          teamFilter: { type: teamType, value: teamValue || null },
        }),
      );
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setErr(null);
        const params = new URLSearchParams({ period });
        if (period === "custom") {
          if (customStart) params.set("start", customStart);
          if (customEnd) params.set("end", customEnd);
        }
        if (teamType !== "all" && teamValue) {
          params.set("team", teamType);
          params.set("team_value", teamValue);
        }
        const res = await fetch(`/api/portal/sales/leaderboard?${params.toString()}`, { cache: "no-store" });
        const j = (await res.json()) as LeaderboardPortalResponse;
        if (cancelled) return;
        if (!j.ok) {
          setData(null);
          setErr(j.error || "Live leaderboard unavailable.");
          return;
        }
        setData(j);
      } catch (e) {
        if (cancelled) return;
        setData(null);
        setErr(userFacingError(e, "Something went wrong. Please try again."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [demoMode, demoModeReady, previewUserId, period, customStart, customEnd, teamType, teamValue]);
  const activeBoard = React.useMemo(() => data?.boards?.find((b) => b.id === "field_commander"), [data?.boards]);
  const repById = React.useMemo(() => new Map((data?.rows ?? []).map((r) => [r.user_id, r])), [data?.rows]);
  const listEntries = activeBoard?.entries ?? [];
  const selfUserId = data?.self_user_id;
  const selfEntry = selfUserId ? listEntries.find((e) => e.user_id === selfUserId) : undefined;
  const openRepDetail = React.useCallback(
    (entry: Parameters<typeof repDetailFromBoardEntry>[0]["entry"]) => {
      setSelectedDetail(
        repDetailFromBoardEntry({
          entry,
          repRow: repById.get(entry.user_id) ?? null,
          boardTitle: activeBoard?.title ?? "Overall",
          scoringConfig: data?.scoring_config,
        }),
      );
    },
    [activeBoard?.title, data?.scoring_config, repById],
  );
  const selfRepRow = selfUserId ? repById.get(selfUserId) : undefined;
  const selfBoardRank = activeBoard?.self_rank;
  const filterOptions: LeaderboardFilterOptions | undefined = data?.filter_options;
  const teamFilterActive = teamType !== "all" && Boolean(teamValue);
  const teamValueOptions =
    teamType === "territory"
      ? filterOptions?.territories ?? []
      : teamType === "region"
        ? filterOptions?.regions ?? []
        : teamType === "product_line"
          ? filterOptions?.product_lines ?? []
          : [];
  const hasRankings = listEntries.length > 0;
  return (
    <div className="lb-page crm-sales-page-bg">
      <header className="lb-header">
        <div className="lb-header-row">
          <div className="lb-header-main">
            <div className="lb-header-title-row">
              <PortalMobileMenuButton className="sales-cmd-mobile-menu lb-mobile-menu" />
              <h1 className="lb-header-title">Leaderboard</h1>
            </div>
            <p className="lb-header-sub">Sales execution score by rep</p>
          </div>
          <div className="lb-header-actions">
            <div className="lb-page-tabs" role="tablist" aria-label="Leaderboard views">
              {LEADERBOARD_PAGE_VIEWS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`lb-page-tab-${tab.id}`}
                  aria-selected={pageView === tab.id}
                  aria-controls={`lb-page-panel-${tab.id}`}
                  className={`lb-page-tab${pageView === tab.id ? " is-active" : ""}`}
                  onClick={() => setPageView(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {demoMode ? <span className="lb-demo-mode-badge">Demo</span> : null}
            <LeaderboardDemoModeToggle enabled={demoMode} onChange={handleDemoModeChange} compact />
          </div>
        </div>
        <LeaderboardFilterBar
          period={period}
          onPeriodChange={setPeriod}
          teamType={teamType}
          onTeamTypeChange={(type) => {
            setTeamType(type);
            setTeamValue("");
          }}
          teamValue={teamValue}
          onTeamValueChange={setTeamValue}
          teamValueOptions={teamValueOptions}
          customStart={customStart}
          onCustomStartChange={setCustomStart}
          customEnd={customEnd}
          onCustomEndChange={setCustomEnd}
          periodMeta={data?.period}
        />
      </header>
      {err && !demoMode ? (
        <div role="alert" style={sc.alertError}>
          {err}
        </div>
      ) : null}
      {loading ? <LeaderboardLoadingSkeleton /> : null}
      {!loading && !hasRankings && !demoMode ? (
        <LeaderboardEmptyState teamFilterActive={teamFilterActive} />
      ) : null}
      {!loading && pageView === "leaderboard" && hasRankings ? (
        <div
          id="lb-page-panel-leaderboard"
          role="tabpanel"
          aria-labelledby="lb-page-tab-leaderboard"
          className="lb-page-panel"
        >
          {selfEntry && selfRepRow ? (
            <LeaderboardUserRankSummary
              entry={selfEntry}
              totalReps={listEntries.length}
              entries={listEntries}
              repById={repById}
            />
          ) : null}
          <LeaderboardPodium entries={listEntries.slice(0, 3)} repById={repById} onViewDetails={openRepDetail} />
          <LeaderboardRankTable
            entries={listEntries}
            repById={repById}
            selfUserId={selfUserId}
            onViewDetails={openRepDetail}
          />
          {selfUserId && selfBoardRank && selfBoardRank > 3 && selfEntry ? (
            <LeaderboardInsightStrip
              selfRank={selfEntry.rank}
              totalReps={listEntries.length}
              selfUserId={selfUserId}
              entries={listEntries}
              repById={repById}
              scoringConfig={data?.scoring_config}
            />
          ) : null}
          {data?.scoring_guide?.length ? <LeaderboardScoringGuide guide={data.scoring_guide} /> : null}
        </div>
      ) : null}
      {!loading && pageView === "scorecard" ? (
        <div
          id="lb-page-panel-scorecard"
          role="tabpanel"
          aria-labelledby="lb-page-tab-scorecard"
          className="lb-page-panel"
        >
          {selfRepRow ? (
            <LeaderboardPersonalScorePanel
              repRow={selfRepRow}
              boardEntry={selfEntry}
              periodLabel={data?.period}
              priorPeriodLabel={data?.prior_period}
              scoringConfig={data?.scoring_config}
              entries={listEntries}
              repById={repById}
            />
          ) : (
            <section className="lb-empty lb-empty--scorecard" aria-labelledby="lb-scorecard-empty-title">
              <h2 id="lb-scorecard-empty-title" className="lb-empty-title">
                Your scorecard will appear here
              </h2>
              <p className="lb-empty-copy">
                Once you log weighted execution activity for this period, your points, badges, and improvement trend
                show up on this tab.
              </p>
              <div className="lb-empty-actions">
                <button type="button" className="lb-empty-btn" onClick={() => setPageView("leaderboard")}>
                  View leaderboard
                </button>
                <Link href="/portal/sales/cases" className="lb-empty-btn lb-empty-btn--primary">
                  Start in Cases
                </Link>
              </div>
            </section>
          )}
        </div>
      ) : null}
      <LeaderboardRepDetailDrawer detail={selectedDetail} onClose={() => setSelectedDetail(null)} />
    </div>
  );
}
