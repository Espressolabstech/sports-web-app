import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Field, inputCls, inputStyle } from "./team-form";
import "./team-event.css";
export const surface = "bg-[hsl(var(--event-ink))] text-[hsl(var(--event-on-ink))]";
export const muted = "text-[hsl(var(--event-on-ink-muted))]";
export const panel = "rounded-lg bg-[hsl(var(--event-ink-soft))] p-4";
export const primary = "bg-[hsl(var(--event-accent))] text-[hsl(var(--event-accent-foreground))] hover:bg-[hsl(var(--event-accent)/0.9)]";
export function TeamShell({ title, back, children, actions }: { title: string; back: string; children: ReactNode; actions?: ReactNode }) {
  const navigate = useNavigate();
  return <div className={`team-event min-h-screen pb-24 ${surface}`}><header className={`sticky top-0 z-20 mx-auto max-w-lg border-b border-[hsl(var(--event-on-ink)/0.14)] px-2 py-3.5 ${surface}`}><div className="flex items-center gap-1"><Button variant="eventGhost" size="icon" aria-label="Back" onClick={() => navigate(back)} className="h-11 w-11 shrink-0"><ArrowLeft className="h-6 w-6" /></Button><h1 className="min-w-0 flex-1 truncate px-1 text-center text-[19px] font-semibold leading-tight">{title}</h1><div className="flex min-w-11 shrink-0 items-center justify-end gap-1 [&>button]:h-11 [&>button]:w-11">{actions}</div></div></header><main className="mx-auto max-w-lg space-y-5 px-4 pt-5">{children}</main></div>;
}
export function TeamInput({ label, value, onChange, onBlur, type = "text", min, max }: { label: string; value: string | number; onChange: (v: string) => void; onBlur?: () => void; type?: string; min?: number; max?: number }) {
  return <Field label={label}><input className={inputCls} style={inputStyle} value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} type={type} min={min} max={max} /></Field>;
}
export function TeamSelect({ label, value, onChange, options }: { label: string; value: string | number; onChange: (v: string) => void; options: { value: string | number; label: string }[] }) {
  return <Field label={label}><select className={inputCls} style={inputStyle} value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option className={surface} key={o.value} value={o.value}>{o.label}</option>)}</select></Field>;
}
export function TeamTextarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <Field label={label}><textarea rows={4} placeholder={placeholder} className="mt-1.5 w-full resize-y rounded-xl border-0 px-3.5 py-3 text-[15px] leading-relaxed outline-none ring-1 ring-inset focus:ring-2" style={inputStyle} value={value} onChange={e => onChange(e.target.value)} /></Field>;
}
/** Horizontally scrollable pill selector — easier to tap than a native select on mobile. */
export function TeamChipSelect({ value, onChange, options, compact = false }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; compact?: boolean }) {
  return <div className={`flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact ? "" : "-mx-4 px-4 pb-1"}`}>
    {options.map(o => (
      <Button
        variant="eventGhost"
        key={o.value}
        type="button"
        aria-pressed={o.value === value}
        onClick={() => onChange(o.value)}
        className={`h-11 shrink-0 whitespace-nowrap rounded-xl px-4 text-[14px] font-semibold transition-colors ${o.value === value ? primary : "bg-[hsl(var(--event-on-ink)/0.08)] text-[hsl(var(--event-on-ink)/0.75)]"}`}
      >
        {o.label}
      </Button>
    ))}
  </div>;
}
export function TeamTabs<T extends string | number>({ value, onChange, tabs, disabledFrom }: { value: T; onChange: (v: T) => void; tabs: [T, string][]; disabledFrom?: number }) {
  return <div role="tablist" className="grid items-end border-b border-[hsl(var(--event-on-ink)/0.12)]" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>{tabs.map(([key, text], i) => { const active = key === value; return <Button variant="eventGhost" key={String(key)} role="tab" type="button" aria-selected={active} disabled={disabledFrom !== undefined && i > disabledFrom} onClick={() => onChange(key)} className={`relative h-11 rounded-none px-1 pb-1.5 text-[13.5px] font-medium tracking-wide transition-colors disabled:opacity-35 ${active ? "text-[hsl(var(--event-on-ink))]" : muted}`}><span className="relative z-10">{text}</span><span aria-hidden className={`absolute bottom-0 left-1/2 h-[2.5px] w-10 -translate-x-1/2 rounded-full transition-opacity ${active ? "bg-[hsl(var(--event-on-ink))] opacity-100" : "opacity-0"}`} /></Button>; })}</div>;
}
