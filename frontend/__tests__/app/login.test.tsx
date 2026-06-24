import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockReplace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockLogin = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ useAuth: mockUseAuth }));

import LoginPage from "@/app/login/page";

function renderPage(override = {}) {
  mockUseAuth.mockReturnValue({
    user: null,
    loading: false,
    login: mockLogin,
    ...override,
  });
  return render(<LoginPage />);
}

describe("LoginPage", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockReplace.mockClear();
  });

  it("renders email, password inputs and submit button", () => {
    renderPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /masuk/i })).toBeInTheDocument();
  });

  it("calls login() with email and password on submit", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce(undefined);
    renderPage();

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "secret1");
    await user.click(screen.getByRole("button", { name: /masuk/i }));

    expect(mockLogin).toHaveBeenCalledWith("test@example.com", "secret1");
  });

  it("navigates to / on successful login", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce(undefined);
    renderPage();

    await user.type(screen.getByLabelText(/email/i), "a@test.com");
    await user.type(screen.getByLabelText(/password/i), "pass123");
    await user.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("shows error message on failed login", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error("Email atau password salah."));
    renderPage();

    await user.type(screen.getByLabelText(/email/i), "a@test.com");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() =>
      expect(screen.getByText("Email atau password salah.")).toBeInTheDocument()
    );
  });

  it("redirects to / immediately when user is already logged in", async () => {
    renderPage({
      user: { id: 1, email: "a@test.com", name: "A", created_at: "" },
      loading: false,
    });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("shows link to register page", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /daftar/i })).toHaveAttribute(
      "href",
      "/register"
    );
  });
});
