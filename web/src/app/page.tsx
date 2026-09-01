import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Sparkles, Users } from "lucide-react";
import { Brand } from "@/components/brand";

export default function Home() {
  return (
    <>
      <header className="site-header container">
        <Brand />
        <div className="header-actions">
          <span className="preview-pill">نسخة استعراضية</span>
          <Link className="button button-secondary" href="/committee">مساحة اللجنة</Link>
        </div>
      </header>
      <main>
        <section className="hero container">
          <div>
            <div className="eyebrow">نادي تقنية المستقبل · جامعة الملك سعود</div>
            <h1>إدارة المشاريع <br /><em>بوضوح.</em></h1>
            <p className="hero-copy">مسار واحد يبدأ من فكرة الفريق، يفحص خطته، وينظم مراجعة مقترحه حتى يصل إلى قرار واضح وقابل للتتبع.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/team">دخول بوابة الفريق <ArrowLeft size={18} /></Link>
              <Link className="button button-secondary" href="/committee">دخول مساحة اللجنة</Link>
            </div>
          </div>
          <div className="hero-panel">
            <div className="hero-panel-inner">
              <h2>رحلة المشروع</h2>
              {[
                ["01", "الاستلام والتصنيف", "قرار حجم موثّق", false],
                ["02", "فحص الخطة الزمنية", "T1 — T7", false],
                ["03", "مقترح الرعاية", "بعد اعتماد الخطة", false],
                ["04", "مراجعة اللجنة", "المحرك غير متصل", true]
              ].map(([number, title, text, waiting]) => (
                <div className="pipeline-step" key={String(number)}>
                  <span className="step-number">{number}</span>
                  <div><strong>{title}</strong><span>{text}</span></div>
                  <i className={`mini-status ${waiting ? "waiting" : ""}`} />
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="section container">
          <div className="section-heading">
            <div><h2>ابدأ من مساحتك</h2><p>تجربة منفصلة للفريق واللجنة، مع إبقاء قرار الإرسال النهائي بيد قائد اللجنة.</p></div>
          </div>
          <div className="role-grid">
            <Link className="role-card" href="/team">
              <span className="role-icon"><Users size={23} /></span>
              <h3>بوابة الفريق</h3>
              <p>قدّم مشروعك، ابنِ خطتك الزمنية، وارفع مقترح الرعاية بعد فتح البوابة.</p>
              <span className="role-link">دخول بوابة الفريق <ArrowLeft size={16} /></span>
            </Link>
            <Link className="role-card" href="/committee">
              <span className="role-icon"><ClipboardCheck size={23} /></span>
              <h3>مساحة اللجنة</h3>
              <p>راجع المشاريع والنتائج، عدّل الدرجات، واعتمد الرسالة قبل أن تصل للفريق.</p>
              <span className="role-link">دخول مساحة اللجنة <ArrowLeft size={16} /></span>
            </Link>
          </div>
        </section>
      </main>
      <footer className="container" style={{ padding: "28px 0 40px", color: "var(--muted)", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
        <span>مسار · نسخة المنتج الأولية</span><span><Sparkles size={13} style={{ verticalAlign: "middle" }} /> بدون محرك تقييم</span>
      </footer>
    </>
  );
}
