import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockReplace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mockReplace }) }));

// Mock useAuth so tests control user/loading without a real AuthProvider.
const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ useAuth: mockUseAuth }));

import RequireAuth from "@/components/RequireAuth";

describe("RequireAuth", () => {
  it("shows loading spinner while auth is loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<RequireAuth><p>Protected</p></RequireAuth>);
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
    // Spinner element is rendered
    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  it("renders children when user is authenticated", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: "a@test.com", name: "A", created_at: "" },
      loading: false,
    });
    render(<RequireAuth><p>Protected content</p></RequireAuth>);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects to /login when not authenticated", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<RequireAuth><p>Protected</p></RequireAuth>);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });
});
