/* eslint-disable react-refresh/only-export-components -- shared form styles used across the team screens */
import type { CSSProperties, ReactNode } from "react";

const onInk = { color: "hsl(var(--event-on-ink))" };
const onInkMuted = { color: "hsl(var(--event-on-ink-muted))" };

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium" style={onInk}>
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px]" style={onInkMuted}>
          {hint}
        </span>
      )}
    </label>
  );
}

export const inputCls = "mt-1.5 h-12 w-full rounded-xl border-0 px-3.5 text-[15px] outline-none ring-1 ring-inset focus:ring-2";

export const inputStyle = {
  backgroundColor: "hsl(var(--event-on-ink)/0.06)",
  color: "hsl(var(--event-on-ink))",
  "--tw-ring-color": "hsl(var(--event-on-ink)/0.16)",
} as CSSProperties;
