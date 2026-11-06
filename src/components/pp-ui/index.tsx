/**
 * The auction's UI primitives. The prototype renders these with shadcn
 * (Button, Input, Dialog, Select, DropdownMenu) styled by its `.pp-console`
 * theme; this app's own Tailwind tokens differ, so the same primitives are
 * built here on Radix with plain classes (pp-ui.css) that reproduce the
 * prototype's sizes, spacing and colours. API names match shadcn's so the
 * prototype's markup can be used as written.
 */
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { Slot } from '@radix-ui/react-slot';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
// Order matters: the primitives' base rules first, then the prototype's console theme overrides them.
import './pp-ui.css';
import './pp-v2.css';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

// ── Button ──
type Variant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
type Size = 'default' | 'sm' | 'lg' | 'icon';
export const Button = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; asChild?: boolean }
>(({ className, variant = 'default', size = 'default', asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
        <Comp
            ref={ref}
            data-variant={variant}
            data-size={size}
            type={asChild ? undefined : (type ?? 'button')}
            className={cx('pp-ui-btn', className)}
            {...props}
        />
    );
});
Button.displayName = 'Button';

// ── Input ──
export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, type, ...props }, ref) => (
    <input ref={ref} type={type} className={cx('pp-ui-input', className)} {...props} />
));
Input.displayName = 'Input';

// ── Dialog ──
export const Dialog = DialogPrimitive.Root;
export const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="pp-ui-overlay" />
        <DialogPrimitive.Content ref={ref} className={cx('pp-console pp-ui-dialog', className)} {...props}>
            {children}
            <DialogPrimitive.Close className="pp-ui-dialog-close">
                <X size={16} />
                <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
));
DialogContent.displayName = 'DialogContent';
export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cx('pp-ui-dialog-header', className)} {...props} />
);
export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cx('pp-ui-dialog-footer', className)} {...props} />
);
export const DialogTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cx('pp-ui-dialog-title', className)} {...props} />);
DialogTitle.displayName = 'DialogTitle';
export const DialogDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description ref={ref} className={cx('pp-ui-dialog-description', className)} {...props} />
));
DialogDescription.displayName = 'DialogDescription';

// ── Select ──
export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const SelectTrigger = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger ref={ref} className={cx('pp-ui-select-trigger', className)} {...props}>
        {children}
        <SelectPrimitive.Icon asChild>
            <ChevronDown size={16} className="pp-ui-select-chevron" />
        </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';
export const SelectContent = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
    <SelectPrimitive.Portal>
        <SelectPrimitive.Content ref={ref} position={position} className={cx('pp-console pp-ui-select-content', className)} {...props}>
            <SelectPrimitive.ScrollUpButton className="pp-ui-select-scroll">
                <ChevronUp size={16} />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className={cx('pp-ui-select-viewport', position === 'popper' && 'is-popper')}>
                {children}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="pp-ui-select-scroll">
                <ChevronDown size={16} />
            </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
));
SelectContent.displayName = 'SelectContent';
export const SelectItem = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item ref={ref} className={cx('pp-ui-item', className)} {...props}>
        <span className="pp-ui-item-check">
            <SelectPrimitive.ItemIndicator>
                <Check size={16} />
            </SelectPrimitive.ItemIndicator>
        </span>
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';

// ── Dropdown menu ──
export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuContent = React.forwardRef<
    React.ElementRef<typeof DropdownPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
    <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content ref={ref} sideOffset={sideOffset} className={cx('pp-console pp-ui-menu-content', className)} {...props} />
    </DropdownPrimitive.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';
export const DropdownMenuItem = React.forwardRef<
    React.ElementRef<typeof DropdownPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item>
>(({ className, ...props }, ref) => <DropdownPrimitive.Item ref={ref} className={cx('pp-ui-menu-item', className)} {...props} />);
DropdownMenuItem.displayName = 'DropdownMenuItem';
