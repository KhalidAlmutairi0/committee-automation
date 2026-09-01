"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
import { ClipboardCheck, FileText, Gauge, House, LockKeyhole, LogOut, Settings, Users } from "lucide-react";
import { logoutAction } from "@/app/actions";

type Area = "team" | "committee";

export function AppShell({ area, title, userName, proposalUnlocked = false, children }: { area: Area; title: string; userName: string; proposalUnlocked?: boolean; children: React.ReactNode }) {
  const team = area === "team";
  const pathname = usePathname();
  const items = team
    ? [
        { href: "/team", label: "مشروعي", icon: House },
        { href: "/team/intake", label: "طلب مشروع جديد", icon: FileText },
        { href: "/team/timeline", label: "الخطة الزمنية", icon: ClipboardCheck },
        { href: "/team/proposal", label: "مقترح الرعاية", icon: FileText, locked: !proposalUnlocked }
      ]
    : [
        { href: "/committee", label: "لوحة المتابعة", icon: Gauge },
        { href: "/committee", label: "مراجعات المقترحات", icon: ClipboardCheck },
        { href: "/committee", label: "المشاريع", icon: Users },
        { href: "", label: "الإعدادات", icon: Settings, locked: true }
      ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/"><Brand /></Link>
        <div className="nav-label">{team ? "بوابة الفريق" : "مساحة اللجنة"}</div>
        <nav>
          {items.map(({ href, label, icon: Icon, locked }) => locked ? (
            <span aria-disabled="true" className="nav-item nav-disabled" key={`${href}-${label}`}><LockKeyhole size={16} />{label}</span>
          ) : (
            <Link aria-current={pathname === href ? "page" : undefined} className={`nav-item ${pathname === href ? "active" : ""}`} href={href} key={`${href}-${label}`}>
              <Icon size={17} />{label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          نسخة تشغيلية<br />التقييم الآلي غير متصل
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="user-chip">
            <span className="avatar">{userName.trim().charAt(0) || (team ? "ف" : "ل")}</span>
            <span>{userName}</span>
            <form action={logoutAction}><button aria-label="تسجيل الخروج" className="logout-button" type="submit"><LogOut size={15} /></button></form>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
