import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("product entry screen", () => {
  it("offers separate team and committee workspaces", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /إدارة المشاريع بوضوح/ })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^دخول بوابة الفريق$/ })[0]).toHaveAttribute("href", "/team");
    expect(screen.getAllByRole("link", { name: /^دخول مساحة اللجنة$/ })[0]).toHaveAttribute("href", "/committee");
  });
});
