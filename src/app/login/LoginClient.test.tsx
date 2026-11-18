import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({
  supabaseBrowser: () => ({
    auth: {
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  }),
}));

import LoginClient from "./LoginClient";

test("toggles between login and reset modes", async () => {
  const user = userEvent.setup();
  render(<LoginClient nextUrl="/portal" />);

  expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /forgot password/i }));

  expect(screen.getByRole("heading", { name: /reset password/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
});

test("hides forgot password when next is an invite set-password path", () => {
  render(<LoginClient nextUrl="/set-password?invite=abc&next=%2Fportal" />);

  expect(screen.queryByRole("button", { name: /forgot password/i })).not.toBeInTheDocument();
  expect(screen.getByText(/use your invite email/i)).toBeInTheDocument();
});
