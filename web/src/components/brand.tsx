import { Route } from "lucide-react";

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><Route size={21} /></span>
      <span>مسار<small>لجنة إدارة المشاريع</small></span>
    </div>
  );
}
