import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell";
import { requireUser } from "@/server/auth/session";
import IntakeForm from "./intake-form";

export default async function IntakePage() {
  const user = await requireUser();
  if (user.role !== "team") redirect("/committee");
  return <AppShell area="team" title="طلب مشروع جديد" userName={user.name}><div className="page"><div className="page-head"><div><h2>عرّفنا على مشروعكم</h2><p>تُستخدم هذه البيانات لاقتراح حجم المشروع ومساره.</p></div></div><IntakeForm /></div></AppShell>;
}
