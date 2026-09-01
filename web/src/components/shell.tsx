"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
import { ClipboardCheck, FileText, Gauge, House, LockKeyhole, LogOut, Settings, Users } from "lucide-react";
import { usePreviewState } from "./preview-state";

type Area = "team" | "committee";

export function AppShell({ area, title, children }: { area: Area; title: string; children: React.ReactNode }) {
  const team = area === "team";
  const pathname = usePathname();
  const { proposalUnlocked } = usePreviewState();
  const items = team
    ? [
        { href: "/team", label: "مشروعي", icon: House },
        { href: "/team/intake", label: "طلب مشروع جديد", icon: FileText },
        { href: "/team/timeline", label: "الخطة الزمنية", icon: ClipboardCheck },
        { href: "/team/proposal", label: "مقترح الرعاية", icon: FileText, locked: !proposalUnlocked }
      ]
    : [
        { href: "/committee", label: "لوحة المتابعة", icon: Gauge },
        { href: "/committee/reviews/FTC-26-018", label: "مراجعات المقترحات", icon: ClipboardCheck },
        { href: "", label: "المشاريع (قريباً)", icon: Users, locked: true },
        { href: "", label: "الإعدادات (قريباً)", icon: Settings, locked: true }
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
          نسخة استعراضية محلية<br />لا يوجد محرك تقييم متصل
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="user-chip">
            <span className="avatar">{team ? "ف" : "ل"}</span>
            <span>{team ? "فريق تجريبي" : "قائد اللجنة"}</span>
            <LogOut size={15} color="#78837c" />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
