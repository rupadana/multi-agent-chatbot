import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders with default variant classes", () => {
    render(<Button>Klik saya</Button>);
    const btn = screen.getByRole("button", { name: "Klik saya" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass("bg-primary");
  });

  it("renders destructive variant", () => {
    render(<Button variant="destructive">Hapus</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-destructive");
  });

  it("renders outline variant", () => {
    render(<Button variant="outline">Batal</Button>);
    expect(screen.getByRole("button")).toHaveClass("border");
  });

  it("renders ghost variant", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole("button");
    expect(btn).not.toHaveClass("bg-primary");
  });

  it("applies sm size class", () => {
    render(<Button size="sm">Kecil</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-9");
  });

  it("is disabled when disabled prop passed", () => {
    render(<Button disabled>Tidak bisa</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onClick handler when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Klik</Button>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Diblokir</Button>);
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("merges extra className", () => {
    render(<Button className="mt-4">Btn</Button>);
    expect(screen.getByRole("button")).toHaveClass("mt-4");
  });
});
