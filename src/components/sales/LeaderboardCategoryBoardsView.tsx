"use client";

import React from "react";
import type { LeaderboardBoard, LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";

const BADGE_STYLE: Record<string, React.CSSProperties> = {
  Gold: { background: "rgba(245, 158, 11, 0.16)", color: "#b45309", border: "1px solid rgba(245, 158, 11, 0.35)" },
  Silver: { background: "rgba(100, 116, 139, 0.12)", color: "#475569", border: "1px solid rgba(100, 116, 139, 0.3)" },
  Bronze: { background: "rgba(180, 83, 9, 0.12)", color: "#9a3412", border: "1px solid rgba(180, 83, 9, 0.28)" },
};

function badgeTier(label: string | null): string | null {
  if (!label) return null;
  if (label.startsWith("Gold")) return "Gold";
  if (label.startsWith("Silver")) return "Silver";
  if (label.startsWith("Bronze")) return "Bronze";
  return null;
}

function trendColor(trend: number): string {
  if (trend > 0) return "var(--success)";
  if (trend < 0) return "var(--danger)";
  return "var(--muted)";
}

function BoardEntryRow({
  entry,
  selfUserId,
  compact,
}: {
  entry: LeaderboardBoardEntry;
  selfUserId?: string | null;
  compact?: boolean;
}) {
  const isSelf = selfUserId === entry.user_id;
  const tier = badgeTier(entry.badge_label);

  return (
    <tr style={isSelf ? { background: "rgba(14, 165, 233, 0.06)" } : undefined}>
      <td data-label="Rank" style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", width: 56 }}>
        #{entry.rank}
      </td>
      <td data-label="Rep" style={{ fontWeight: isSelf ? 800 : 650, minWidth: compact ? 120 : 160 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span>
            {entry.display_name}
            {isSelf ? " (you)" : ""}
          </span>
          {entry.badge_label && tier ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.3,
                textTransform: "uppercase",
                borderRadius: 999,
                padding: "2px 8px",
                ...BADGE_STYLE[tier],
              }}
            >
              {entry.badge_label}
            </span>
          ) : null}
        </div>
      </td>
      <td data-label="Score" style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", width: 72 }}>
        {entry.score.toFixed(1)}
      </td>
      {!compact ? (
        <td data-label="Key stat" style={{ color: "var(--muted)", fontSize: 13 }}>
          {entry.key_stat}
        </td>
      ) : null}
      <td data-label="Trend" style={{ color: trendColor(entry.trend), fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>
        {entry.trend_label}
      </td>
    </tr>
  );
}

export function LeaderboardCategoryBoardsView({
  boards,
  selfUserId,
  shellStyle,
  compact,
}: {
  boards: LeaderboardBoard[];
  selfUserId?: string | null;
  shellStyle?: React.CSSProperties;
  compact?: boolean;
}) {
  if (boards.length === 0) return null;

  return (
    <div style={{ display: "grid", gap: 18, gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(340px, 1fr))" }}>
      {boards.map((board) => {
        const topEntries = board.entries.slice(0, compact ? 5 : 8);
        const selfEntry = selfUserId ? board.entries.find((e) => e.user_id === selfUserId) : undefined;
        const showSelfBelow = selfEntry && (selfEntry.rank > topEntries.length || !topEntries.some((e) => e.user_id === selfUserId));

        return (
          <section
            key={board.id}
            style={{
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              boxShadow: "var(--shadow-1)",
              overflow: "hidden",
              ...shellStyle,
            }}
          >
            <header style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>{board.title}</h2>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>{board.description}</p>
                </div>
                {board.self_rank ? (
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--brand-700)", whiteSpace: "nowrap" }}>
                    You: #{board.self_rank}
                  </span>
                ) : null}
              </div>
            </header>
            <div style={{ overflowX: "auto" }}>
              <table className="sales-cmd-table" style={{ width: "100%" }}>
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    <th>Rank</th>
                    <th>Rep</th>
                    <th>Score</th>
                    {!compact ? <th>Key stat</th> : null}
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {topEntries.length === 0 ? (
                    <tr>
                      <td colSpan={compact ? 4 : 5} style={{ padding: 16, color: "var(--muted)" }}>
                        No scores yet for this category.
                      </td>
                    </tr>
                  ) : (
                    topEntries.map((entry) => (
                      <BoardEntryRow key={entry.user_id} entry={entry} selfUserId={selfUserId} compact={compact} />
                    ))
                  )}
                  {showSelfBelow && selfEntry ? (
                    <>
                      <tr>
                        <td colSpan={compact ? 4 : 5} style={{ padding: "8px 12px", color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>
                          Your rank
                        </td>
                      </tr>
                      <BoardEntryRow entry={selfEntry} selfUserId={selfUserId} compact={compact} />
                    </>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
