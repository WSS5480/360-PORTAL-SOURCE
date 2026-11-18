import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrepareProviderDebriefFooter } from "./PrepareProviderDebriefFooter";

const nav = vi.hoisted(() => ({
  mockPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.mockPush }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("PrepareProviderDebriefFooter", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    nav.mockPush.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("marks prepared before starting the engagement", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, href: "/portal/sales/engagements/e1/active" }),
      });

    const onActionError = vi.fn();
    render(
      <PrepareProviderDebriefFooter
        engagementId="e1"
        engagementDetailHref="/portal/sales/engagements/e1"
        onActionError={onActionError}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start Engagement" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/prepare\/mark-prepared$/);
    expect(fetchMock.mock.calls[1]?.[0]).toMatch(/\/prepare\/begin$/);
    expect(onActionError).toHaveBeenCalledWith(null);
    expect(nav.mockPush).toHaveBeenCalled();
  });
});
