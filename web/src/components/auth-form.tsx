"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type ActionState } from "@/app/actions";

const initialState: ActionState = {};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  return <form action={formAction} className="card auth-card">
    <div className="form-section">
      <h1>{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب فريق"}</h1>
      <p>{mode === "login" ? "ادخل إلى مساحة فريقك أو اللجنة." : "استخدم بريداً يستقبل ملاحظات اللجنة."}</p>
      <div className="fields">
        {mode === "register" && <div className="field full"><label htmlFor="name">اسم الفريق أو المستخدم</label><input autoComplete="name" id="name" name="name" required /></div>}
        <div className="field full"><label htmlFor="email">البريد الإلكتروني</label><input autoComplete="email" id="email" name="email" required type="email" /></div>
        <div className="field full"><label htmlFor="password">كلمة المرور</label><input autoComplete={mode === "login" ? "current-password" : "new-password"} id="password" minLength={mode === "register" ? 12 : 1} name="password" required type="password" /></div>
      </div>
      {state.error && <div className="notice notice-warning" role="alert" style={{marginTop:16}}>{state.error}</div>}
    </div>
    <div className="form-actions auth-actions"><Link className="button button-ghost" href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "إنشاء حساب" : "لدي حساب"}</Link><button className="button button-primary" disabled={pending}>{pending ? "جارٍ التحقق…" : mode === "login" ? "دخول" : "إنشاء الحساب"}</button></div>
  </form>;
}
