import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges multiple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("skips falsy values", () => {
    expect(cn("foo", false && "bar", undefined, "baz")).toBe("foo baz");
  });

  it("handles conditional object syntax", () => {
    expect(cn({ active: true, hidden: false })).toBe("active");
  });

  it("resolves Tailwind conflicts — last value wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("returns empty string when no arguments", () => {
    expect(cn()).toBe("");
  });
});
