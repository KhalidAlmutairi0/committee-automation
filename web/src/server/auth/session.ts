import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@/server/db";
import { generateOpaqueToken, hashOpaqueToken } from "@/server/security";
import type { Viewer } from "@/server/authorization";

const COOKIE_NAME = "masar_session";
const SESSION_DAYS = 7;

export interface SessionUser extends Viewer {
  email: string;
  name: string;
}

export async function createSession(userId: string): Promise<void> {
  const token = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await query("INSERT INTO sessions(user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [userId, tokenHash, expiresAt]);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [hashOpaqueToken(token)]);
  cookieStore.delete(COOKIE_NAME);
}

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const rows = await query<SessionUser>(
    `SELECT u.id, u.email, u.name, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()
      LIMIT 1`,
    [hashOpaqueToken(token)]
  );
  return rows[0] ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireCommittee(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "team") redirect("/team");
  return user;
}

export async function requireLead(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "committee_lead") redirect("/committee");
  return user;
}
