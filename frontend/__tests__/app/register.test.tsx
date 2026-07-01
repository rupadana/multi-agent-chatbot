import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockReplace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockRegister = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ useAuth: mockUseAuth }));

import RegisterPage from "@/app/register/page";

function renderPage(override = {}) {
  mockUseAuth.mockReturnValue({
    user: null,
    loading: false,
    register: mockRegister,
    ...override,
  });
  return render(<RegisterPage />);
}

describe("RegisterPage", () => {
  beforeEach(() => {
    mockRegister.mockReset();
    mockReplace.mockClear();
  });

  it("renders name, email, and password inputs", () => {
    renderPage();
    expect(screen.getByLabelText(/nama/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /daftar/i })).toBeInTheDocument();
  });

  it("calls register() with correct data on submit", async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce(undefined);
    renderPage();

    await user.type(screen.getByLabelText(/nama/i), "Alice");
    await user.type(screen.getByLabelText(/email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/password/i), "secret1");
    await user.click(screen.getByRole("button", { name: /daftar/i }));

    expect(mockRegister).toHaveBeenCalledWith("alice@test.com", "secret1", "Alice");
  });

  it("navigates to / on successful registration", async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce(undefined);
    renderPage();

    await user.type(screen.getByLabelText(/email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/password/i), "secret1");
    await user.click(screen.getByRole("button", { name: /daftar/i }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("shows client-side error when password is too short", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/password/i), "123");
    await user.click(screen.getByRole("button", { name: /daftar/i }));

    expect(screen.getByText(/minimal 6 karakter/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("shows error message from server on failed registration", async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce(new Error("Email sudah terdaftar."));
    renderPage();

    await user.type(screen.getByLabelText(/email/i), "dup@test.com");
    await user.type(screen.getByLabelText(/password/i), "secret1");
    await user.click(screen.getByRole("button", { name: /daftar/i }));

    await waitFor(() =>
      expect(screen.getByText("Email sudah terdaftar.")).toBeInTheDocument()
    );
  });

  it("redirects to / immediately when already logged in", async () => {
    renderPage({
      user: { id: 1, email: "a@test.com", name: "A", created_at: "" },
      loading: false,
    });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("shows link to login page", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /masuk/i })).toHaveAttribute(
      "href",
      "/login"
    );
  });
});
