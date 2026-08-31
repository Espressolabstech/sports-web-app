import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Check, IndianRupee, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/twMerge';
import {
    confirmEventPayment,
    fetchEvent,
    finalizeRegistration,
    getRegistration,
    submitRegistration,
    spotsLeft,
    type EventSkill,
} from '../../lib/public-events';

const SKILLS: { key: EventSkill; blurb: string }[] = [
    {
        key: 'Beginner',
        blurb:
            'New to the game or a handful of sessions in. Still getting used to the underarm serve, the glass rebounds and staying with your partner.',
    },
    {
        key: 'Intermediate',
        blurb:
            'Playing weekly for a while. You rally consistently off both walls, serve and return with control, move as a pair and can use the lob and the volley to take the net.',
    },
    {
        key: 'Advance',
        blurb:
            'Competitive, match-hardened play. Reliable bandeja and vibora, comfortable off the back glass, and you build points tactically at pace.',
    },
];

const ink = { backgroundColor: 'hsl(var(--event-ink))' };
const card = { backgroundColor: 'hsl(var(--event-ink-soft))' };
const onInk = { color: 'hsl(var(--event-on-ink))' };
const onInkMuted = { color: 'hsl(var(--event-on-ink-muted))' };

export default function EventRegister() {
    const { slug } = useParams();
    const navigate = useNavigate();

    const { data: event } = useQuery({
        queryKey: ['public-event', slug],
        queryFn: () => fetchEvent(slug!),
        enabled: !!slug,
    });

    const [step, setStep] = useState(0);
    const [form, setForm] = useState({ name: '', phone: '' });
    const [skill, setSkill] = useState<EventSkill | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (slug && getRegistration(slug)) navigate(`/events/${slug}/pass`, { replace: true });
    }, [slug, navigate]);

    const offeredLevels = useMemo(
        () => SKILLS.filter((s) => event?.skillLevels.includes(s.key)),
        [event],
    );

    useEffect(() => {
        if (offeredLevels.length === 1) setSkill(offeredLevels[0].key);
    }, [offeredLevels]);

    const steps = useMemo(() => ['Your details', 'Skill level', 'Payment'], []);

    if (!event) {
        return (
            <div
                className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center"
                style={ink}
            >
                <p className="text-base font-semibold" style={onInk}>
                    Event not found
                </p>
                <Link to="/events" className="text-sm font-medium" style={{ color: 'hsl(var(--event-accent))' }}>
                    Browse all events
                </Link>
            </div>
        );
    }

    const waitlist = spotsLeft(event) === 0;

    const validateDetails = () => {
        const e: Record<string, string> = {};
        const name = form.name.trim();
        const phone = form.phone.trim();
        if (name.length < 2) e.name = 'Enter your full name';
        if (!/^[0-9]{10}$/.test(phone)) e.phone = 'Enter a valid 10-digit mobile number';
        return e;
    };

    const next = () => {
        if (step === 0) {
            const e = validateDetails();
            if (Object.keys(e).length > 0) {
                setErrors(e);
                return;
            }
            setErrors({});
        }
        if (step === 1 && !skill) {
            setErrors({ skill: 'Pick the level that fits you best' });
            return;
        }
        setErrors({});
        setStep((s) => s + 1);
    };

    const submit = async () => {
        setSubmitting(true);
        try {
            const { registration, razorpay } = await submitRegistration(event.slug, {
                name: form.name.trim(),
                phone: form.phone.trim(),
                skill: skill!,
            });

            if (!razorpay) {
                finalizeRegistration(registration);
                navigate(`/events/${event.slug}/pass`, { replace: true });
                return;
            }

            const options: RazorpayOptions = {
                key: razorpay.keyId,
                amount: razorpay.amount,
                currency: razorpay.currency,
                order_id: razorpay.orderId,
                name: event.title,
                description: `Entry fee · ${skill}`,
                handler: async (response) => {
                    try {
                        await confirmEventPayment(event.slug, registration.entrantId, {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                        });
                        finalizeRegistration(registration);
                        navigate(`/events/${event.slug}/pass`, { replace: true });
                    } catch {
                        toast.error('Payment verification failed', {
                            description: 'Please contact the host with your payment ID.',
                        });
                    }
                },
                modal: {
                    ondismiss: () => toast.info('Payment cancelled'),
                },
                theme: { color: '#84cc16' },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            toast.error('Could not start registration', {
                description: (err as { message?: string })?.message || 'Please try again.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen pb-28" style={ink}>
            <div
                className="sticky top-0 z-10 backdrop-blur-md"
                style={{
                    backgroundColor: 'hsl(var(--event-ink)/0.92)',
                    borderBottom: '1px solid hsl(var(--event-on-ink)/0.1)',
                }}
            >
                <div className="mx-auto max-w-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() =>
                                step === 0 ? navigate(`/events/${event.slug}`) : setStep((s) => s - 1)
                            }
                            className="-ml-1.5 rounded-full p-1.5 active:scale-95"
                            aria-label="Back"
                        >
                            <ArrowLeft className="h-5 w-5" style={onInk} />
                        </button>
                        <div className="min-w-0">
                            <p className="truncate text-[11px] uppercase tracking-wider" style={onInkMuted}>
                                {event.title}
                            </p>
                            <h1 className="text-base font-bold" style={onInk}>
                                {steps[step]}
                            </h1>
                        </div>
                    </div>
                    <div className="mt-3 flex gap-1.5">
                        {steps.map((s, i) => (
                            <div
                                key={s}
                                className="h-1 flex-1 rounded-full transition-colors"
                                style={{
                                    backgroundColor:
                                        i <= step ? 'hsl(var(--event-accent))' : 'hsl(var(--event-on-ink)/0.14)',
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-lg space-y-4 px-4 pt-5">
                {waitlist && (
                    <div
                        className="rounded-xl px-4 py-3 text-xs"
                        style={{
                            backgroundColor: 'hsl(var(--event-filling)/0.15)',
                            color: 'hsl(var(--event-filling))',
                        }}
                    >
                        This event is full. Complete the form to join the waitlist — no payment needed
                        until a spot opens up.
                    </div>
                )}

                {step === 0 && (
                    <div className="space-y-4">
                        <Field
                            label="Full name"
                            value={form.name}
                            onChange={(v) => setForm({ ...form, name: v })}
                            placeholder="Aarav Shah"
                            error={errors.name}
                            autoFocus
                        />
                        <Field
                            label="Mobile number"
                            value={form.phone}
                            onChange={(v) => setForm({ ...form, phone: v.replace(/\D/g, '').slice(0, 10) })}
                            placeholder="9876543210"
                            inputMode="numeric"
                            prefix="+91"
                            error={errors.phone}
                        />
                        <p className="px-1 text-xs" style={onInkMuted}>
                            We use this only to send your pass and round updates for this event.
                        </p>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-3">
                        <p className="px-1 text-sm" style={onInkMuted}>
                            {offeredLevels.length === 1
                                ? `This tournament is being hosted for the ${offeredLevels[0].key.toLowerCase()} cohort only.`
                                : 'This tournament runs ' +
                                  offeredLevels.map((l) => l.key.toLowerCase()).join(' and ') +
                                  ' cohorts. Pick the one that fits you — the draw is made within your cohort.'}
                        </p>
                        {offeredLevels.map((s) => (
                            <button
                                key={s.key}
                                onClick={() => {
                                    setSkill(s.key);
                                    setErrors({});
                                }}
                                className="flex w-full items-start gap-3 rounded-2xl p-4 text-left transition-colors active:scale-[0.99]"
                                style={{
                                    backgroundColor: 'hsl(var(--event-ink-soft))',
                                    boxShadow:
                                        skill === s.key ? 'inset 0 0 0 1.5px hsl(var(--event-lime))' : undefined,
                                }}
                            >
                                <span
                                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                                    style={
                                        skill === s.key
                                            ? { backgroundColor: 'hsl(var(--event-lime))' }
                                            : { boxShadow: 'inset 0 0 0 2px hsl(var(--event-on-ink)/0.3)' }
                                    }
                                >
                                    {skill === s.key && (
                                        <Check className="h-3 w-3" style={{ color: 'hsl(var(--event-ink))' }} />
                                    )}
                                </span>
                                <span>
                                    <span className="block text-sm font-semibold" style={onInk}>
                                        {s.key}
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-relaxed" style={onInkMuted}>
                                        {s.blurb}
                                    </span>
                                </span>
                            </button>
                        ))}
                        {errors.skill && (
                            <p className="px-1 text-xs" style={{ color: 'hsl(var(--event-full))' }}>
                                {errors.skill}
                            </p>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <div className="rounded-2xl p-4" style={card}>
                            <div className="flex items-center justify-between">
                                <span className="text-sm" style={onInkMuted}>
                                    Entry fee
                                </span>
                                <span className="inline-flex items-center text-lg font-bold" style={onInk}>
                                    <IndianRupee className="h-4 w-4" />
                                    {event.priceInr.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div
                                className="mt-2 pt-2 text-xs"
                                style={{ ...onInkMuted, borderTop: '1px solid hsl(var(--event-on-ink)/0.1)' }}
                            >
                                {format(event.start, 'EEE d MMM · h:mm a')} · {event.venueName}
                            </div>
                        </div>

                        {waitlist ? (
                            <div className="rounded-2xl p-4 text-sm" style={{ ...card, ...onInkMuted }}>
                                No payment is taken for the waitlist. If a spot opens we'll message you with
                                a payment link, valid for 2 hours.
                            </div>
                        ) : (
                            <div className="rounded-2xl p-4" style={card}>
                                <p className="text-sm font-semibold" style={onInk}>
                                    Secure payment
                                </p>
                                <p className="mt-1.5 text-xs leading-relaxed" style={onInkMuted}>
                                    Confirm your registration and you'll be taken to the secure payment
                                    step to complete your entry fee.
                                </p>
                            </div>
                        )}

                        <p className="flex items-start gap-2 px-1 text-xs" style={onInkMuted}>
                            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            Your spot is held instantly and confirmed by the venue before the draw is
                            published.
                        </p>
                    </div>
                )}
            </main>

            <div
                className="fixed inset-x-0 bottom-0 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
                style={{
                    backgroundColor: 'hsl(var(--event-ink)/0.92)',
                    borderTop: '1px solid hsl(var(--event-on-ink)/0.1)',
                }}
            >
                <div className="mx-auto max-w-lg px-4 py-3">
                    <button
                        onClick={step === 2 ? submit : next}
                        disabled={submitting}
                        className={cn(
                            'inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-black uppercase tracking-wide active:scale-[0.99] disabled:opacity-60',
                        )}
                        style={{
                            backgroundColor: 'hsl(var(--event-accent))',
                            color: 'hsl(var(--event-accent-foreground))',
                        }}
                    >
                        {submitting
                            ? 'Confirming…'
                            : step === 2
                              ? waitlist
                                  ? 'Join waitlist'
                                  : 'Confirm registration'
                              : 'Continue'}
                        {!submitting && step < 2 && <ArrowRight className="h-4 w-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
    error,
    type = 'text',
    inputMode,
    prefix,
    autoFocus,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    error?: string;
    type?: string;
    inputMode?: 'numeric' | 'text';
    prefix?: string;
    autoFocus?: boolean;
}) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-medium" style={onInkMuted}>
                {label}
            </label>
            <div
                className="flex items-center gap-2 rounded-xl px-3"
                style={{
                    backgroundColor: 'hsl(var(--event-ink-soft))',
                    boxShadow: error ? 'inset 0 0 0 1.5px hsl(var(--event-full))' : undefined,
                }}
            >
                {prefix && (
                    <span className="text-sm" style={onInkMuted}>
                        {prefix}
                    </span>
                )}
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    type={type}
                    inputMode={inputMode}
                    autoFocus={autoFocus}
                    className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:opacity-50"
                    style={onInk}
                />
            </div>
            {error && (
                <p className="mt-1 text-xs" style={{ color: 'hsl(var(--event-full))' }}>
                    {error}
                </p>
            )}
        </div>
    );
}
