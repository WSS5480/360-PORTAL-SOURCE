"use client";

import Link from "next/link";
import type { ProviderOverviewNextMoveItem } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import { PROVIDER_OVERVIEW_STATE_CLASS, btnClasses } from "./providerOverviewStateTokens";

export function ProviderOverviewNextMovesRow({
  moves,
  onLogFieldUpdate,
}: {
  moves: ProviderOverviewNextMoveItem[];
  onLogFieldUpdate?: () => void;
}) {
  return (
    <section className="pov-moves" aria-label={PROVIDER_FIELD_OPS_SECTION.recommendedNextMoves}>
      <h3 className="pov-moves-title">{PROVIDER_FIELD_OPS_SECTION.recommendedNextMoves}</h3>
      <ol className="pov-moves-list">
        {moves.map((move, index) => (
          <li
            key={move.kind}
            className={`pov-move${move.kind === "schedule" ? " pov-move--schedule" : ""}`}
          >
            <span
              className={`${PROVIDER_OVERVIEW_STATE_CLASS.index} ${PROVIDER_OVERVIEW_STATE_CLASS.badge}`}
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="pov-move-body">
              <p className="pov-move-title">{move.title}</p>
              <p className="pov-move-purpose">{move.purpose}</p>
            </div>
            {move.kind === "log" && onLogFieldUpdate && LOG_UPDATE_UI_ENABLED ? (
              <button
                type="button"
                className={`${btnClasses("secondary", true)} pov-move-action--btn`}
                onClick={onLogFieldUpdate}
              >
                {move.actionLabel}
              </button>
            ) : (
              <Link
                href={move.href}
                className={btnClasses(move.kind === "schedule" ? "primary" : "secondary", true)}
              >
                {move.actionLabel}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
