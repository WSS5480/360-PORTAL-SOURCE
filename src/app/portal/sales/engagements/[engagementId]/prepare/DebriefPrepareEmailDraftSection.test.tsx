import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DebriefPrepareEmailDraftSection } from "./DebriefPrepareEmailDraftSection";

describe("DebriefPrepareEmailDraftSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("requires goal and product before enabling draft", () => {
    render(<DebriefPrepareEmailDraftSection engagementId="eng-1" />);

    const button = screen.getByRole("button", { name: /draft follow-up email/i });
    expect(button).toBeDisabled();
  });

  it("calls email-draft API and shows result", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          subject: "SIM360 visit",
          body: "Hi Dr. Onion,\n\nLet's connect.",
          usedAi: true,
        }),
        { status: 200 },
      ),
    );

    render(<DebriefPrepareEmailDraftSection engagementId="eng-1" />);

    fireEvent.click(screen.getByLabelText(/360 experience at sim360/i));
    fireEvent.change(screen.getByLabelText(/target product/i), { target: { value: "ACSIS" } });
    fireEvent.click(screen.getByRole("button", { name: /draft follow-up email/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("SIM360 visit")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/portal/sales/engagements/eng-1/prepare/debrief/workspace/email-draft",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.getByDisplayValue(/Hi Dr. Onion/)).toBeInTheDocument();
  });
});
