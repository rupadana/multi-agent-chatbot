import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

function BasicTabs({ defaultValue = "a" }: { defaultValue?: string }) {
  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList>
        <TabsTrigger value="a">Tab A</TabsTrigger>
        <TabsTrigger value="b">Tab B</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Konten A</TabsContent>
      <TabsContent value="b">Konten B</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("shows default tab content on initial render", () => {
    render(<BasicTabs defaultValue="a" />);
    expect(screen.getByText("Konten A")).toBeInTheDocument();
    expect(screen.queryByText("Konten B")).not.toBeInTheDocument();
  });

  it("hides non-active tab content initially", () => {
    render(<BasicTabs defaultValue="b" />);
    expect(screen.getByText("Konten B")).toBeInTheDocument();
    expect(screen.queryByText("Konten A")).not.toBeInTheDocument();
  });

  it("switches content when a trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<BasicTabs defaultValue="a" />);

    await user.click(screen.getByRole("button", { name: "Tab B" }));

    expect(screen.getByText("Konten B")).toBeInTheDocument();
    expect(screen.queryByText("Konten A")).not.toBeInTheDocument();
  });

  it("calls onValueChange when switching tabs", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Tabs defaultValue="a" onValueChange={onChange}>
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A</TabsContent>
        <TabsContent value="b">B</TabsContent>
      </Tabs>
    );

    await user.click(screen.getByRole("button", { name: "B" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("respects controlled value prop", () => {
    render(
      <Tabs value="b">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Konten A</TabsContent>
        <TabsContent value="b">Konten B</TabsContent>
      </Tabs>
    );
    expect(screen.getByText("Konten B")).toBeInTheDocument();
    expect(screen.queryByText("Konten A")).not.toBeInTheDocument();
  });

  it("active trigger has correct data-state attribute", async () => {
    const user = userEvent.setup();
    render(<BasicTabs defaultValue="a" />);

    const triggerA = screen.getByRole("button", { name: "Tab A" });
    const triggerB = screen.getByRole("button", { name: "Tab B" });

    expect(triggerA).toHaveAttribute("data-state", "active");
    expect(triggerB).toHaveAttribute("data-state", "inactive");

    await user.click(triggerB);

    expect(triggerA).toHaveAttribute("data-state", "inactive");
    expect(triggerB).toHaveAttribute("data-state", "active");
  });
});
