import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions", () => ({
  loginAction: vi.fn(),
  registerAction: vi.fn()
}));

import { AuthForm } from "./auth-form";

describe("team registration form", () => {
  it("allows public registration without an invitation code", () => {
    render(<AuthForm mode="register" />);

    expect(screen.getByLabelText("اسم الفريق أو المستخدم")).not.toBeNull();
    expect(screen.getByLabelText("البريد الإلكتروني")).not.toBeNull();
    expect(screen.getByLabelText("كلمة المرور")).not.toBeNull();
    expect(screen.queryByLabelText("رمز تسجيل الفريق")).toBeNull();
  });
});
