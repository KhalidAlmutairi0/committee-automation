import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";
import { currentUser } from "@/server/auth/session";

export default async function RegisterPage() {
  const user = await currentUser();
  if (user) redirect(user.role === "team" ? "/team" : "/committee");
  return <main className="auth-page"><Brand /><AuthForm mode="register" /></main>;
}
