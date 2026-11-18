import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

import { providerCommandHeaderCss } from "./providerCommandHeaderCss";

function renderChipRow() {
  const labels = ["Observation Ready", "5 of 5 observations", "Bard Mesh observed"];

  return render(
    <>
      <style>{providerCommandHeaderCss}</style>
      <div className="provider-command-header__surface">
        <div className="provider-command-header__left">
          <div className="provider-command-header__identity">
            <h1 className="provider-command-header__name">Dr. Example Provider</h1>
          </div>
        </div>
        <div className="provider-command-header__context" aria-label="Field execution status">
          <div className="provider-command-header__chips" role="list" data-testid="provider-command-chips">
            {labels.map((label) => (
              <span key={label} className="provider-command-chip provider-command-chip--intel" role="listitem">
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="provider-command-header__actions">
          <button type="button" className="provider-command-header__cta">
            Add Observation Case
          </button>
        </div>
      </div>
    </>,
  );
}

describe("providerCommandHeaderCss chip row layout", () => {
  it("wraps chips instead of using horizontal scroll", () => {
    expect(providerCommandHeaderCss).toMatch(/\.provider-command-header__chips\s*\{[^}]*flex-wrap:\s*wrap/s);
    expect(providerCommandHeaderCss).not.toMatch(/overflow-x:\s*auto/);
    expect(providerCommandHeaderCss).not.toMatch(/flex-wrap:\s*nowrap/);
    expect(providerCommandHeaderCss).not.toMatch(/\.provider-command-header__context\s*\{[^}]*overflow:\s*hidden/s);
  });

  it("renders compact status chips within the chip container", () => {
    const { getByTestId, getAllByRole } = renderChipRow();
    const chipRow = getByTestId("provider-command-chips");
    const chips = getAllByRole("listitem");

    expect(chips).toHaveLength(3);
    expect(chips.every((chip) => chip.textContent!.length <= 28)).toBe(true);
    expect(chipRow.contains(chips[0])).toBe(true);
    expect(chipRow.contains(chips[2])).toBe(true);

    const styles = window.getComputedStyle(chipRow);
    expect(styles.flexWrap).toBe("wrap");
    expect(styles.overflowX).not.toBe("auto");
    expect(styles.overflowX).not.toBe("scroll");
  });
});
