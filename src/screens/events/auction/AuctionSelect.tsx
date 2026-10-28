import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/** The browser's native <select> popup can't be restyled (shows the OS's own
 *  light/blue-highlight menu regardless of page theme) — this is a minimal
 *  custom dropdown matching the console's own dark popover styling instead. */
export default function AuctionSelect({
    value,
    options,
    onChange,
    disabled,
    ariaLabel,
    placeholder,
}: {
    value: string;
    options: { value: string; label: string; disabled?: boolean }[];
    onChange: (value: string) => void;
    disabled?: boolean;
    ariaLabel?: string;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const selected = options.find((o) => o.value === value);

    useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div className="auction-select" ref={rootRef}>
            <button
                type="button"
                className="auction-select-trigger"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
            >
                <span>{selected?.label ?? placeholder ?? 'Select…'}</span>
                <ChevronDown size={14} />
            </button>
            {open && (
                <ul className="auction-select-menu" role="listbox" aria-label={ariaLabel}>
                    {options.map((o) => (
                        <li key={o.value}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={o.value === value}
                                disabled={o.disabled}
                                onClick={() => {
                                    onChange(o.value);
                                    setOpen(false);
                                }}
                            >
                                {o.value === value && <Check size={13} />}
                                <span>{o.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
