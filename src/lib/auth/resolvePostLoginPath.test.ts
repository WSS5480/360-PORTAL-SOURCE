import { describe, expect, it } from "vitest";
import {
  isCustomerPortalPathForSalesRep,
  isSalesRepOnly,
  membershipsIncludeCustomerAccount,
  postLoginFlagsFromMe,
  resolvePostLoginPath,
  shouldBlockCustomerPortalSurface,
} from "./resolvePostLoginPath";

describe("resolvePostLoginPath", () => {
  it("sends sales-rep-only users to Sales Command", () => {
    const flags = postLoginFlagsFromMe({
      ok: true,
      user: { is_internal_sales_rep: true, is_admin: false, is_staff: false },
    });
    expect(resolvePostLoginPath(flags, "/portal")).toBe("/portal/sales");
    expect(isSalesRepOnly(flags)).toBe(true);
    expect(shouldBlockCustomerPortalSurface(flags)).toBe(true);
  });

  it("prefers admin over sales-rep when both are set", () => {
    const flags = postLoginFlagsFromMe({
      ok: true,
      user: { is_internal_sales_rep: true, is_admin: true, is_staff: false },
    });
    expect(resolvePostLoginPath(flags, "/portal")).toBe("/admin");
    expect(isSalesRepOnly(flags)).toBe(false);
    expect(shouldBlockCustomerPortalSurface(flags)).toBe(false);
  });

  it("allows sales reps with a customer hospital account onto the customer portal", () => {
    const flags = postLoginFlagsFromMe({
      ok: true,
      user: { is_internal_sales_rep: true, is_admin: false, is_staff: false },
      has_customer_account_access: true,
    });
    expect(resolvePostLoginPath(flags, "/portal")).toBe("/portal/sales");
    expect(isSalesRepOnly(flags)).toBe(true);
    expect(shouldBlockCustomerPortalSurface(flags)).toBe(false);
  });

  it("detects customer memberships excluding Internal Team", () => {
    expect(
      membershipsIncludeCustomerAccount([
        { account_id: "1", account: { id: "1", name: "360 Medical Internal Team" } },
        { account_id: "2", account: { id: "2", name: "360 Demo Hospital (Walkthrough)" } },
      ]),
    ).toBe(true);
    expect(
      membershipsIncludeCustomerAccount([
        { account_id: "1", account: { id: "1", name: "360 Medical Internal Team" } },
      ]),
    ).toBe(false);
  });

  it("blocks customer portal paths for sales-rep surface", () => {
    expect(isCustomerPortalPathForSalesRep("/portal")).toBe(true);
    expect(isCustomerPortalPathForSalesRep("/portal/orders")).toBe(true);
    expect(isCustomerPortalPathForSalesRep("/portal/ivr/new")).toBe(true);
    expect(isCustomerPortalPathForSalesRep("/portal/sales")).toBe(false);
    expect(isCustomerPortalPathForSalesRep("/portal/sales/providers")).toBe(false);
    expect(isCustomerPortalPathForSalesRep("/portal/settings")).toBe(false);
  });
});
