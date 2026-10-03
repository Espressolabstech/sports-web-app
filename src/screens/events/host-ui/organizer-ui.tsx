/* eslint-disable react-refresh/only-export-components -- shared style
   constants/helpers intentionally live alongside the primitives here */
// Shared dark "event theme" primitives for the tournament organizer screens.
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../../utils/twMerge';
type FillStatus = string;

export const ink = { backgroundColor: 'hsl(var(--event-ink))' };
export const inkSoft = { backgroundColor: 'hsl(var(--event-ink-soft))' };
export const onInk = { color: 'hsl(var(--event-on-ink))' };
export const onInkMuted = { color: 'hsl(var(--event-on-ink-muted))' };
export const accentBg = {
    backgroundColor: 'hsl(var(--event-accent))',
    color: 'hsl(var(--event-accent-foreground))',
};

export function fillColor(status: FillStatus) {
    return status === 'full'
        ? 'hsl(var(--event-full))'
        : status === 'filling'
          ? 'hsl(var(--event-filling))'
          : 'hsl(var(--event-open))';
}

export function FillBar({ pct, status }: { pct: number; status: FillStatus }) {
    return (
        <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: 'hsl(var(--event-on-ink)/0.1)' }}
        >
            <div
                className="h-full rounded-full transition-all"
                style={{
                    width: `${Math.min(100, Math.max(0, pct))}%`,
                    backgroundColor: fillColor(status),
                }}
            />
        </div>
    );
}

export function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl px-3 py-2.5" style={inkSoft}>
            <p className="text-[15px] font-bold leading-tight" style={onInk}>
                {value}
            </p>
            <p
                className="mt-0.5 text-[10px] uppercase tracking-[0.12em]"
                style={onInkMuted}
            >
                {label}
            </p>
        </div>
    );
}

export function OrgCard({
    className,
    children,
}: {
    className?: string;
    children: ReactNode;
}) {
    return (
        <section className={cn('rounded-2xl p-4', className)} style={inkSoft}>
            {children}
        </section>
    );
}

export function SectionLabel({ children }: { children: ReactNode }) {
    return (
        <p
            className="text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={onInkMuted}
        >
            {children}
        </p>
    );
}

export function Divider({ className }: { className?: string }) {
    return (
        <div
            className={cn('h-px w-full', className)}
            style={{ backgroundColor: 'hsl(var(--event-on-ink)/0.12)' }}
        />
    );
}

export function Chip({
    active,
    onClick,
    children,
    compact,
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
    compact?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex h-11 w-full items-center justify-center whitespace-nowrap rounded-xl text-[14px] font-semibold transition-colors',
                compact ? 'px-2 text-[13px]' : 'px-4',
            )}
            style={
                active
                    ? accentBg
                    : {
                          backgroundColor: 'hsl(var(--event-on-ink)/0.07)',
                          color: 'hsl(var(--event-on-ink-muted))',
                      }
            }
        >
            {children}
        </button>
    );
}

export function Field({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: ReactNode;
}) {
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

export const inputCls =
    'mt-1.5 h-12 w-full rounded-xl border-0 px-3.5 text-[15px] outline-none ring-1 ring-inset focus:ring-2';

/** Same box as inputCls, minus the browser's default number spinner arrows — they clash with every other field's plain rounded look. */
export const numberInputCls = `${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;

export const inputStyle = {
    backgroundColor: 'hsl(var(--event-on-ink)/0.06)',
    color: 'hsl(var(--event-on-ink))',
    // Without this, native controls (the date/time picker icon and
    // dropdown, the number spinner) render with their light-theme default
    // colors — a near-invisible dark-on-dark calendar icon on this
    // background — regardless of the `color` set above.
    colorScheme: 'dark',
    '--tw-ring-color': 'hsl(var(--event-accent)/0.6)',
} as CSSProperties;
