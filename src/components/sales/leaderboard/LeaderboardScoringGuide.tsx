"use client";

import React from "react";
import type { PathwayScoringGuideRow } from "@/lib/surgical-sales/leaderboardTransparentScoring";
import { LEADERBOARD_SCORING_GUIDE_SUMMARY } from "@/lib/surgical-sales/leaderboardTransparentScoring";

export function LeaderboardScoringGuide({ guide }: { guide: PathwayScoringGuideRow[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <section className="lb-scoring-help" aria-labelledby="lb-scoring-help-title">
      <button
        type="button"
        className="lb-scoring-help-toggle"
        aria-expanded={open}
        aria-controls="lb-scoring-help-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="lb-scoring-help-copy">
          <h2 id="lb-scoring-help-title" className="lb-scoring-help-title">
            How Scoring Works
          </h2>
          <p className="lb-scoring-help-summary">{LEADERBOARD_SCORING_GUIDE_SUMMARY}</p>
        </div>
        <span className="lb-scoring-help-chevron" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <div id="lb-scoring-help-panel" className="lb-scoring-help-panel">
          <div className="lb-scoring-guide-table-wrap">
            <table className="lb-scoring-guide-table">
              <thead>
                <tr>
                  <th scope="col">Activity</th>
                  <th scope="col">Points</th>
                </tr>
              </thead>
              <tbody>
                {guide.map((row) => (
                  <tr key={row.id}>
                    <td className="lb-scoring-guide-table-activity">{row.label}</td>
                    <td className="lb-scoring-guide-table-points">{row.pointsDisplay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
