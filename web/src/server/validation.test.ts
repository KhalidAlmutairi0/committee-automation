import { describe, expect, it } from "vitest";
import { loginSchema, projectIntakeSchema, proposalUploadSchema, registerSchema } from "./validation";
import { canAccessProject, canManageCommittee } from "./authorization";

describe("production input validation", () => {
  it("normalizes account email and rejects weak passwords", () => {
    expect(registerSchema.safeParse({ name: "خالد", email: " USER@EXAMPLE.COM ", password: "short" }).success).toBe(false);
    expect(loginSchema.parse({ email: " USER@EXAMPLE.COM ", password: "anything" }).email).toBe("user@example.com");
  });

  it("rejects incomplete or invalid project intake", () => {
    expect(projectIntakeSchema.safeParse({
      name: "", leadName: "قائد", leadPhone: "0500000000", formats: [], attendance: 0,
      budget: -1, duration: "يوم واحد أو أقل", stakeholders: [], resources: []
    }).success).toBe(false);
  });

  it("requires proposal text or a file and caps files at ten megabytes", () => {
    expect(proposalUploadSchema.safeParse({ text: "", fileSize: 0, fileType: "" }).success).toBe(false);
    expect(proposalUploadSchema.safeParse({ text: "", fileSize: 10 * 1024 * 1024 + 1, fileType: "application/pdf" }).success).toBe(false);
    expect(proposalUploadSchema.safeParse({ text: "نص المقترح", fileSize: 0, fileType: "" }).success).toBe(true);
  });
});

describe("server authorization", () => {
  const owner = { id: "team-1", role: "team" as const };
  const other = { id: "team-2", role: "team" as const };
  const lead = { id: "lead-1", role: "committee_lead" as const };

  it("allows teams to access only their own projects", () => {
    expect(canAccessProject(owner, "team-1")).toBe(true);
    expect(canAccessProject(other, "team-1")).toBe(false);
  });

  it("allows only committee roles to manage reviews", () => {
    expect(canManageCommittee(lead)).toBe(true);
    expect(canManageCommittee(owner)).toBe(false);
  });
});
