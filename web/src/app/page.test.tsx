import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("product entry screen", () => {
  it("offers separate team and committee workspaces", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /إدارة المشاريع بوضوح/ })).not.toBeNull();
    expect(screen.getAllByRole("link", { name: /^دخول بوابة الفريق$/ })[0].getAttribute("href")).toBe("/team");
    expect(screen.getAllByRole("link", { name: /^دخول مساحة اللجنة$/ })[0].getAttribute("href")).toBe("/committee");
  });
});
