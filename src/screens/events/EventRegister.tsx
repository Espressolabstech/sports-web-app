import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Camera, Check, CircleCheck, Download, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedLoader } from '../../components/AnimatedLoader';
import {
    confirmPayment,
    fetchEvent,
    finalizeRegistration,
    getRegistration,
    isPhoneAlreadyRegistered,
    submitRegistration,
    spotsLeft,
    uploadRegistrationPhoto,
    type EventSkill,
} from '../../lib/public-events';
import playpassLogo from '../../assets/logo-white-v2-cropped.png';
import courtCollectiveLogo from '../../assets/court-collective-logo.png';
import './registration-identical.css';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Pro'] as const;
const LEVEL_DESCRIPTIONS: Record<(typeof LEVELS)[number], string> = {
    Beginner: 'New to the game, or still learning.',
    Intermediate: 'Plays regularly, can hold rallies.',
    Advanced: 'Strong all-round game, has played tournaments.',
    Pro: 'Top competitive player.',
};
const CONSENT_VERSION = '2026-10-11';

const STEP_META: Record<string, { title: string; subtitle: string }> = {
    'Your details': {
        title: "LET'S MEET YOU.",
        subtitle: 'A complete profile is your first step towards finding a team.',
    },
    'Your game': {
        title: 'TELL US YOUR GAME.',
        subtitle: 'Tell us your level and experience. Our team will assign your final level.',
    },
    Availability: {
        title: 'SAVE THE DATES.',
        subtitle: 'Let us know when you can play, and if you want to be part of the league beyond the court.',
    },
    Consent: {
        title: 'THE IMPORTANT PART.',
        subtitle: 'Participant Disclaimer & Consent Agreement',
    },
    'Review & pay': {
        title: 'YOUR NEXT MOVE.',
        subtitle: 'Review your player profile, then pay securely via Razorpay.',
    },
    Payment: {
        title: 'YOUR NEXT MOVE.',
        subtitle: 'Confirm your registration, then pay securely to complete your entry.',
    },
};

/** ISO (YYYY-MM-DD) day strings from start to end, inclusive. */
function daySpan(start: Date, end: Date): string[] {
    const days: string[] = [];
    const d = new Date(start);
    d.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);
    while (d.getTime() <= last.getTime()) {
        days.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
    }
    return days;
}

type DetailedForm = {
    email: string;
    instagram: string;
    age: string;
    gender: 'Male' | 'Female' | 'Other' | '';
    city: string;
    sports: ('Padel' | 'Pickleball')[];
    padelLevel: (typeof LEVELS)[number] | '';
    pickleballLevel: (typeof LEVELS)[number] | '';
    jersey: string;
    achievements: string;
    videoLink: string;
    dayAvailability: string[];
    interest: 'Team ownership' | 'Sponsorship' | 'Not now' | '';
    consent: boolean;
    guardianConsent: boolean;
    thirdParty: boolean;
    thirdPartyConsent: boolean;
};

const blankDetailed: DetailedForm = {
    email: '',
    instagram: '',
    age: '',
    gender: '',
    city: '',
    sports: [],
    padelLevel: '',
    pickleballLevel: '',
    jersey: '',
    achievements: '',
    videoLink: '',
    dayAvailability: [],
    interest: '',
    consent: false,
    guardianConsent: false,
    thirdParty: false,
    thirdPartyConsent: false,
};

const SKILL_BLURB: Record<EventSkill, string> = {
    Beginner:
        'New to the game or a handful of sessions in. Still getting used to the underarm serve, the glass rebounds and staying with your partner.',
    Intermediate:
        'Playing weekly for a while. You rally consistently off both walls, serve and return with control, move as a pair and can use the lob and the volley to take the net.',
    Advance:
        'Competitive, match-hardened play. Reliable bandeja and vibora, comfortable off the back glass, and you build points tactically at pace.',
};

const TERMS: [string, string][] = [
    [
        'Payments and Refunds',
        'All payments are non-refundable under any circumstances, except (a) the 100% refund for players not picked at the auction, as stated at the top of this form, and (b) if the organisers cancel the event.',
    ],
    [
        'Media Release and Promotional Use',
        'Photographs and video recordings may be taken throughout the event. By participating, you grant the organisers permission to use this media for marketing, promotional and archival purposes on official digital and social media platforms.',
    ],
    [
        'Privacy and Data Sharing',
        'Your information will be used only for event coordination, communication and the auction. Your name, photo, playing level, achievements and Instagram ID will be shared with team owners and may appear in auction and promotional content. Your contact number and email will not be shared with any other third party.',
    ],
    [
        'Liability and Assumption of Risk',
        'Participation is entirely voluntary. Padel and Pickleball involve physical activity and inherent risk of injury. You confirm that you are medically and physically fit to play and take responsibility for your own fitness. The organisers, venue, team owners, sponsors and partners accept no liability for any injury, accident, illness, loss or damage to personal property during the event.',
    ],
    [
        'Participants Under 18',
        "Players under 18 must have the consent of a parent or guardian, who accepts these terms on the player's behalf and is responsible for the player's participation.",
    ],
    [
        'Third-Party Registrations',
        'If you are registering on behalf of another person (including family members or dependents), you confirm that you have informed them of all event details, terms and risks, and that their participation is subject to these same terms.',
    ],
    [
        'Auction and Decisions',
        "Registration does not guarantee a pick at the auction. The organisers' decisions on the auction, teams and match play are final.",
    ],
    [
        'Accuracy of Information',
        'You confirm that all details provided in this form are accurate.',
    ],
];

export default function EventRegister({ slugOverride }: { slugOverride?: string } = {}) {
    const params = useParams();
    const slug = slugOverride ?? params.slug;
    const navigate = useNavigate();

    const { data: event, isLoading } = useQuery({
        queryKey: ['public-event', slug],
        queryFn: () => fetchEvent(slug!),
        enabled: !!slug,
    });

    const [step, setStep] = useState(0);
    const [form, setForm] = useState({ name: '', phone: '' });
    const [friendOpen, setFriendOpen] = useState(false);
    const [friend, setFriend] = useState({ name: '', phone: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [checkingDuplicate, setCheckingDuplicate] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [paid, setPaid] = useState(false);
    const [confirmingPayment, setConfirmingPayment] = useState(false);

    // Detailed registration (event.registrationProfile) only — collects a
    // full player profile + photo + consent. Single-entrant: a friend's
    // own photo/consent can't ride along on one person's submission.
    const detailed = Boolean(event?.registrationProfile);
    const [profile, setProfile] = useState<DetailedForm>(blankDetailed);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState('');
    const multiDay = Boolean(event?.endDate && event.start.toDateString() !== event.endDate.toDateString());
    const eventDays = useMemo(
        () => (event && multiDay ? daySpan(event.start, event.endDate!) : []),
        [event, multiDay],
    );

    useEffect(() => {
        if (!slug || !event) return;
        // Registration is only open while the tournament hasn't started —
        // once it has, there's nothing left to register for.
        if (event.phase !== 'upcoming') {
            navigate(`/events/${slug}/live`, { replace: true });
            return;
        }
        // Detailed-registration events never redirect to the generic pass
        // page — a returning visitor always sees this same form again, and
        // the server-side duplicate-phone check (on "Continue" from step 1)
        // is what actually stops them re-registering, not a local redirect.
        if (!event.registrationProfile && getRegistration(slug)) {
            navigate(`/events/${slug}/pass`, { replace: true });
        }
    }, [slug, event, navigate]);

    const steps = useMemo(
        () => (detailed ? ['Your details', 'Your game', 'Availability', 'Consent', 'Review & pay'] : ['Your details', 'Payment']),
        [detailed],
    );
    const lastStep = steps.length - 1;

    if (isLoading) {
        return (
            <div className="ccreg flex min-h-screen items-center justify-center">
                <AnimatedLoader />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="ccreg flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-base font-semibold">Event not found</p>
                <Link to="/events" className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                    Browse all events
                </Link>
            </div>
        );
    }

    const entrants = friendOpen ? 2 : 1;
    const waitlist = spotsLeft(event) < entrants;
    const totalInr = event.priceInr * entrants;

    const validateDetails = () => {
        const e: Record<string, string> = {};
        const name = form.name.trim();
        const phone = form.phone.trim();
        if (name.length < 2) e.name = 'Enter your full name';
        if (!/^[0-9]{10}$/.test(phone)) e.phone = 'Enter a valid 10-digit mobile number';
        if (detailed) {
            if (!/^\S+@\S+\.\S+$/.test(profile.email.trim())) e.email = 'Enter a valid email address';
            if (profile.city.trim().length < 1) e.city = 'Enter your city';
            const age = Number(profile.age);
            if (!Number.isFinite(age) || age < 1 || age > 100) e.age = 'Enter a valid age';
            if (!profile.gender) e.gender = 'Select one';
        }
        if (!detailed && friendOpen) {
            const friendName = friend.name.trim();
            const friendPhone = friend.phone.trim();
            if (friendName.length < 2) e.friend_name = "Enter your friend's full name";
            if (!/^[0-9]{10}$/.test(friendPhone)) e.friend_phone = 'Enter a valid 10-digit mobile number';
            if (phone && friendPhone && phone === friendPhone) {
                e.friend_phone = "Friend's number must be different from yours";
            }
        }
        return e;
    };

    const validateGame = () => {
        const e: Record<string, string> = {};
        if (profile.sports.length === 0) e.sports = 'Select at least one sport';
        if (profile.sports.includes('Padel') && !profile.padelLevel) e.padelLevel = 'Choose your Padel level';
        if (profile.sports.includes('Pickleball') && !profile.pickleballLevel) e.pickleballLevel = 'Choose your Pickleball level';
        if (!profile.jersey.trim()) e.jersey = 'Choose your jersey size';
        if (profile.videoLink.trim() && !/^https:\/\//.test(profile.videoLink.trim())) {
            e.videoLink = 'Enter a link starting with https://';
        }
        return e;
    };

    const validateAvailability = () => {
        const e: Record<string, string> = {};
        if (multiDay && profile.dayAvailability.length === 0) e.dayAvailability = 'Select at least one day';
        if (!profile.interest) e.interest = 'Choose one';
        return e;
    };

    const validateConsent = () => {
        const e: Record<string, string> = {};
        if (!profile.consent) e.consent = 'Please agree to the terms and conditions.';
        const age = Number(profile.age);
        if (age < 18 && !profile.guardianConsent) e.guardianConsent = 'Parent or guardian consent is required';
        if (profile.thirdParty && !profile.thirdPartyConsent) {
            e.thirdPartyConsent = 'Confirm the player has been informed';
        }
        return e;
    };

    const stepName = steps[step];

    const scroll = () => window.scrollTo({ top: 0, behavior: 'instant' });

    const next = async () => {
        if (stepName === 'Your details') {
            const e = validateDetails();
            if (Object.keys(e).length > 0) {
                setErrors(e);
                return;
            }

            // A number already registered for this event gets stopped here
            // — never let the form quietly succeed and hand back a pass
            // (possibly someone else's) without payment.
            setCheckingDuplicate(true);
            try {
                const phone = form.phone.trim();
                const friendPhone = !detailed && friendOpen ? friend.phone.trim() : null;
                const [mainTaken, friendTaken] = await Promise.all([
                    isPhoneAlreadyRegistered(event.slug, phone),
                    friendPhone ? isPhoneAlreadyRegistered(event.slug, friendPhone) : Promise.resolve(false),
                ]);
                if (mainTaken || friendTaken) {
                    setErrors({
                        ...(mainTaken && { phone: 'This number is already registered for this event' }),
                        ...(friendTaken && { friend_phone: 'This number is already registered for this event' }),
                    });
                    return;
                }
            } finally {
                setCheckingDuplicate(false);
            }

            setErrors({});
        } else if (stepName === 'Your game') {
            const e = validateGame();
            if (Object.keys(e).length > 0) return setErrors(e);
            setErrors({});
        } else if (stepName === 'Availability') {
            const e = validateAvailability();
            if (Object.keys(e).length > 0) return setErrors(e);
            setErrors({});
        } else if (stepName === 'Consent') {
            const e = validateConsent();
            if (Object.keys(e).length > 0) return setErrors(e);
            setErrors({});
        }
        setStep((s) => s + 1);
        scroll();
    };

    const back = () => {
        setStep((s) => s - 1);
        scroll();
    };

    const submit = async () => {
        setSubmitting(true);
        try {
            const details = {
                name: form.name.trim(),
                phone: form.phone.trim(),
                skill: event.skillLevel,
            };
            const friendDetails = !detailed && friendOpen
                ? { name: friend.name.trim(), phone: friend.phone.trim() }
                : undefined;

            let detailedFields: DetailedRegistrationFields | undefined;
            if (detailed) {
                let photoUrl: string | undefined;
                if (photoFile) {
                    setUploadingPhoto(true);
                    try {
                        photoUrl = await uploadRegistrationPhoto(event.slug, photoFile);
                    } finally {
                        setUploadingPhoto(false);
                    }
                }
                detailedFields = {
                    email: profile.email.trim(),
                    photoUrl,
                    consent: profile.consent,
                    consentVersion: CONSENT_VERSION,
                    profile: {
                        instagram: profile.instagram.trim(),
                        age: Number(profile.age),
                        gender: profile.gender,
                        city: profile.city.trim(),
                        sports: profile.sports,
                        padelLevel: profile.sports.includes('Padel') ? profile.padelLevel : '',
                        pickleballLevel: profile.sports.includes('Pickleball') ? profile.pickleballLevel : '',
                        jersey: profile.jersey.trim(),
                        achievements: profile.achievements.trim(),
                        videoLink: profile.videoLink.trim(),
                        dayAvailability: multiDay ? profile.dayAvailability : eventDays,
                        interest: profile.interest,
                        guardianConsent: profile.guardianConsent,
                        thirdParty: profile.thirdParty,
                        thirdPartyConsent: profile.thirdPartyConsent,
                    },
                };
            }

            const { registration, razorpay } = await submitRegistration(event.slug, details, friendDetails, detailedFields);

            // Free entry or waitlist spot — already registered, nothing to pay.
            if (registration) {
                finalizeRegistration(registration);
                if (waitlist) {
                    navigate(`/events/${event.slug}/pass`, { replace: true });
                } else {
                    setPaid(true);
                    scroll();
                }
                return;
            }

            // Paid entry: no registration exists yet — it's only created once
            // this payment is verified, so a cancelled checkout leaves nothing behind.
            const options: RazorpayOptions = {
                key: razorpay!.keyId,
                amount: razorpay!.amount,
                currency: razorpay!.currency,
                order_id: razorpay!.orderId,
                name: event.title,
                description: friendDetails
                    ? `Entry fee (2) · ${event.skillLevel}`
                    : `Entry fee · ${event.skillLevel}`,
                handler: async (response) => {
                    setConfirmingPayment(true);
                    try {
                        const confirmed = await confirmPayment(
                            event.slug,
                            details,
                            {
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature,
                            },
                            friendDetails,
                            detailedFields,
                        );
                        finalizeRegistration(confirmed);
                        if (detailed) {
                            setPaid(true);
                            scroll();
                        } else {
                            navigate(`/events/${event.slug}/pass`, { replace: true });
                        }
                    } catch {
                        toast.error('Payment verification failed', {
                            description: 'Please contact the host with your payment ID.',
                        });
                    } finally {
                        setConfirmingPayment(false);
                    }
                },
                modal: {
                    ondismiss: () => toast.info('Payment cancelled'),
                },
                theme: { color: '#cff136' },
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

    const finalLabel = waitlist
        ? 'Join waitlist'
        : detailed
          ? `Pay via Razorpay · ₹${totalInr.toLocaleString('en-IN')}`
          : 'Confirm registration';

    const dates =
        event.endDate && multiDay
            ? `${format(event.start, 'd MMM').toUpperCase()} — ${format(event.endDate, 'd MMM yyyy').toUpperCase()}`
            : format(event.start, 'd MMM yyyy').toUpperCase();

    const downloadConfirmation = () => {
        const canvas = document.createElement('canvas');
        const width = 1000;
        const height = 620;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const lime = '#cff136';
        const ink = '#11151c';
        const card = '#192129';
        const muted = '#9aa3b0';

        ctx.fillStyle = ink;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = card;
        ctx.fillRect(48, 48, width - 96, height - 96);

        // Check circle
        ctx.strokeStyle = lime;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(width / 2, 150, 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(width / 2 - 14, 150);
        ctx.lineTo(width / 2 - 4, 162);
        ctx.lineTo(width / 2 + 16, 136);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = lime;
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('PAYMENT CONFIRMED', width / 2, 218);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText("YOU'RE IN THE AUCTION.", width / 2, 270);

        ctx.fillStyle = muted;
        ctx.font = '16px sans-serif';
        ctx.fillText(`${form.name.trim()} · ${event.title}`, width / 2, 310);

        ctx.textAlign = 'left';
        const lines = [
            ['Event', dates],
            ['Venue', event.venueName],
            ['Entry fee', `₹${totalInr.toLocaleString('en-IN')}`],
            ['Mobile', `+91 ${form.phone.trim()}`],
        ];
        let y = 380;
        for (const [label, value] of lines) {
            ctx.fillStyle = muted;
            ctx.font = '13px sans-serif';
            ctx.fillText(label.toUpperCase(), 100, y);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(value, 100, y + 26);
            y += 64;
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = muted;
        ctx.font = '13px sans-serif';
        ctx.fillText('Registration does not guarantee a pick at the auction.', width / 2, height - 70);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${event.slug}-registration.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    };

    return (
        <div className="ccreg">
            <header className="site-header-like">
                <Link to={`/events/${event.slug}`} className="wordmark" aria-label="The Court Collective — home">
                    <img src={courtCollectiveLogo} alt="The Court Collective" className="brand-logo" />
                </Link>
                <div className="header-right">
                    <span className="powered-by">
                        <span className="powered-by-label">Powered by</span>
                        <img src={playpassLogo} alt="PlayPass" className="playpass-logo" />
                    </span>
                </div>
            </header>

            <main className="registration-main">
                <Link to={`/events/${event.slug}`} className="back-link">
                    <ArrowLeft /> Back to the event
                </Link>
                <div className="registration-grid">
                    <aside className="flow-side">
                        <h2>
                            YOUR GAME.
                            <br />
                            YOUR NEXT CHAPTER.
                        </h2>
                        <p>
                            {event.title}
                            <br />
                            Player registration
                        </p>
                        <div className="step-nav">
                            {steps.map((s, i) => (
                                <div key={s} className={`step-indicator ${i === step ? 'active' : ''} ${i < step ? 'complete' : ''}`}>
                                    <span className="step-circle">{i < step ? <Check size={12} /> : String(i + 1).padStart(2, '0')}</span>
                                    <span>{s}</span>
                                </div>
                            ))}
                        </div>
                        <div className="side-event">
                            <strong>{dates}</strong>
                            <p>
                                {event.venueName}
                                <br />
                                Auction · 23 October 2026
                            </p>
                            <div className="side-fee">
                                ₹{event.priceInr.toLocaleString('en-IN')}
                                <small>Player registration fee</small>
                            </div>
                        </div>
                    </aside>

                    <div className="form-body" key={step}>
                        {confirmingPayment ? (
                            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
                                <AnimatedLoader />
                                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                    Confirming your payment…
                                </p>
                            </div>
                        ) : paid ? (
                            <>
                                <CircleCheck className="success-icon" />
                                <div className="form-header">
                                    <p className="section-kicker">PAYMENT CONFIRMED</p>
                                    <h1>YOU'RE IN THE AUCTION.</h1>
                                    <p>Thanks, {form.name.trim()}. Your player registration and payment are confirmed.</p>
                                </div>
                                <div className="payment-message">
                                    Event: <strong>{dates}</strong>
                                    <br />
                                    Venue: <strong>{event.venueName}</strong>
                                    <br />
                                    <br />
                                    Registration does not guarantee a pick. The host will be in touch with
                                    updates.
                                </div>
                                <div className="mt-6 flex items-center justify-center gap-3">
                                    <button onClick={downloadConfirmation} className="back-btn">
                                        <Download size={16} /> Download
                                    </button>
                                    <button onClick={() => navigate(`/events/${event.slug}`)} className="continue-btn">
                                        Back to the event <ArrowRight />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {STEP_META[stepName] && (
                                    <div className="form-header">
                                        <p className="section-kicker">
                                            STEP {String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
                                        </p>
                                        <h1>{STEP_META[stepName].title}</h1>
                                        <p>{STEP_META[stepName].subtitle}</p>
                                    </div>
                                )}

                                {waitlist && (
                                    <div className="payment-message" role="status">
                                        This event is full. Complete the form to join the waitlist — no
                                        payment is needed until a spot opens up.
                                    </div>
                                )}

                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (step < lastStep) void next();
                                        else void submit();
                                    }}
                                    noValidate
                                >
                                    {stepName === 'Your details' && (
                                        <div className="field-grid">
                                            <div className="field full">
                                                <p className="field-label" style={{ color: 'var(--primary)' }}>
                                                    {event.skillLevel} level
                                                </p>
                                                <p className="field-help">{SKILL_BLURB[event.skillLevel]}</p>
                                            </div>
                                            <Field label="Full name" error={errors.name}>
                                                <input
                                                    value={form.name}
                                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                    placeholder="Aarav Shah"
                                                    autoFocus
                                                />
                                            </Field>
                                            {detailed && (
                                                <Field label="Email address" error={errors.email}>
                                                    <input
                                                        type="email"
                                                        value={profile.email}
                                                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                                        placeholder="you@example.com"
                                                    />
                                                </Field>
                                            )}
                                            <Field label="WhatsApp number" error={errors.phone} help="Include your country code, e.g. +91.">
                                                <input
                                                    value={form.phone}
                                                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                                    placeholder="9876543210"
                                                    inputMode="numeric"
                                                />
                                            </Field>
                                            {detailed && (
                                                <>
                                                    <Field label="Instagram ID" optional help="We'll use this to tag you in photos and videos we upload.">
                                                        <input
                                                            value={profile.instagram}
                                                            onChange={(e) => setProfile({ ...profile, instagram: e.target.value })}
                                                            placeholder="@yourhandle"
                                                        />
                                                    </Field>
                                                    <Field label="Age" half error={errors.age}>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={100}
                                                            value={profile.age}
                                                            onChange={(e) => {
                                                                let v = e.target.value.replace(/\D/g, '').slice(0, 3);
                                                                if (v !== '' && Number(v) > 100) v = '100';
                                                                setProfile({ ...profile, age: v });
                                                            }}
                                                            placeholder="24"
                                                            inputMode="numeric"
                                                        />
                                                    </Field>
                                                    <Field label="Gender" half error={errors.gender}>
                                                        <select
                                                            value={profile.gender}
                                                            onChange={(e) => setProfile({ ...profile, gender: e.target.value as DetailedForm['gender'] })}
                                                        >
                                                            <option value="">Select gender</option>
                                                            {['Male', 'Female', 'Other'].map((g) => (
                                                                <option key={g} value={g}>
                                                                    {g}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </Field>
                                                    <Field label="Current city" error={errors.city}>
                                                        <input
                                                            value={profile.city}
                                                            onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                                                            placeholder="Mumbai"
                                                        />
                                                    </Field>
                                                    <Field label="Profile photo" optional error={errors.photo}>
                                                        <div className="upload-area">
                                                            <div className="upload-avatar">
                                                                {photoPreview ? (
                                                                    <img src={photoPreview} alt="Your player profile" />
                                                                ) : (
                                                                    <Camera />
                                                                )}
                                                            </div>
                                                            <div className="upload-info">
                                                                <label className="upload-btn">
                                                                    <Camera size={14} /> {photoFile ? 'Change photo' : 'Upload photo'}
                                                                    <input
                                                                        type="file"
                                                                        accept="image/jpeg,image/png,image/webp"
                                                                        className="hidden"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (!file) return;
                                                                            if (
                                                                                !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
                                                                                file.size > 5 * 1024 * 1024
                                                                            ) {
                                                                                setErrors((prev) => ({ ...prev, photo: 'Choose a JPG, PNG or WebP photo under 5 MB.' }));
                                                                                return;
                                                                            }
                                                                            setPhotoFile(file);
                                                                            setPhotoPreview(URL.createObjectURL(file));
                                                                            setErrors((prev) => {
                                                                                const rest = { ...prev };
                                                                                delete rest.photo;
                                                                                return rest;
                                                                            });
                                                                        }}
                                                                    />
                                                                </label>
                                                                <p>JPG, PNG or WebP · Up to 5 MB</p>
                                                            </div>
                                                        </div>
                                                    </Field>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {!detailed && stepName === 'Your details' && (
                                        <>
                                            {!friendOpen ? (
                                                <button type="button" onClick={() => setFriendOpen(true)} className="check-line" style={{ marginTop: 16 }}>
                                                    + Also register a friend
                                                </button>
                                            ) : (
                                                <div className="field-grid" style={{ marginTop: 16 }}>
                                                    <div className="field full" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                        <span className="field-label">Your friend</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setFriendOpen(false);
                                                                setFriend({ name: '', phone: '' });
                                                            }}
                                                            className="field-label"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                    <Field label="Friend's full name" error={errors.friend_name}>
                                                        <input
                                                            value={friend.name}
                                                            onChange={(e) => setFriend({ ...friend, name: e.target.value })}
                                                            placeholder="Riya Mehta"
                                                        />
                                                    </Field>
                                                    <Field label="Friend's mobile number" error={errors.friend_phone}>
                                                        <input
                                                            value={friend.phone}
                                                            onChange={(e) => setFriend({ ...friend, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                                            placeholder="9876543210"
                                                            inputMode="numeric"
                                                        />
                                                    </Field>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {stepName === 'Your game' && (
                                        <div className="field-grid">
                                            <Field label="Which sports do you play?" error={errors.sports} help="Select both if you play both.">
                                                <div className="choice-group">
                                                    {(['Padel', 'Pickleball'] as const).map((sport) => (
                                                        <label key={sport} className={profile.sports.includes(sport) ? 'checked' : ''}>
                                                            <input
                                                                type="checkbox"
                                                                checked={profile.sports.includes(sport)}
                                                                onChange={(e) =>
                                                                    setProfile({
                                                                        ...profile,
                                                                        sports: e.target.checked
                                                                            ? [...profile.sports, sport]
                                                                            : profile.sports.filter((s) => s !== sport),
                                                                        // Clear a sport's level the moment it's
                                                                        // unchecked, so a stale level never
                                                                        // lingers past that sport's own removal.
                                                                        ...(!e.target.checked && sport === 'Padel' && { padelLevel: '' }),
                                                                        ...(!e.target.checked && sport === 'Pickleball' && { pickleballLevel: '' }),
                                                                    })
                                                                }
                                                            />
                                                            {sport}
                                                        </label>
                                                    ))}
                                                </div>
                                            </Field>
                                            {profile.sports.includes('Padel') && (
                                                <Field label="Padel playing level" error={errors.padelLevel} help="Your self-rating. Your final level is assigned by the host.">
                                                    <div className="choice-group level-options">
                                                        {LEVELS.map((level) => (
                                                            <label key={level} className={profile.padelLevel === level ? 'checked' : ''}>
                                                                <input
                                                                    type="radio"
                                                                    name="padelLevel"
                                                                    checked={profile.padelLevel === level}
                                                                    onChange={() => setProfile({ ...profile, padelLevel: level })}
                                                                />
                                                                <span>
                                                                    {level}
                                                                    <small>{LEVEL_DESCRIPTIONS[level]}</small>
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </Field>
                                            )}
                                            {profile.sports.includes('Pickleball') && (
                                                <Field label="Pickleball playing level" error={errors.pickleballLevel} help="Your self-rating. Your final level is assigned by the host.">
                                                    <div className="choice-group level-options">
                                                        {LEVELS.map((level) => (
                                                            <label key={level} className={profile.pickleballLevel === level ? 'checked' : ''}>
                                                                <input
                                                                    type="radio"
                                                                    name="pickleballLevel"
                                                                    checked={profile.pickleballLevel === level}
                                                                    onChange={() => setProfile({ ...profile, pickleballLevel: level })}
                                                                />
                                                                <span>
                                                                    {level}
                                                                    <small>{LEVEL_DESCRIPTIONS[level]}</small>
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </Field>
                                            )}
                                            <Field label="Jersey size" error={errors.jersey} help="Tentative is okay — this can be changed later.">
                                                <select value={profile.jersey} onChange={(e) => setProfile({ ...profile, jersey: e.target.value })}>
                                                    <option value="">Select jersey size</option>
                                                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((size) => (
                                                        <option key={size} value={size}>
                                                            {size}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Field>
                                            <Field label="Tournaments played or achievements" optional>
                                                <textarea
                                                    value={profile.achievements}
                                                    onChange={(e) => setProfile({ ...profile, achievements: e.target.value.slice(0, 2000) })}
                                                    placeholder="Tournaments played, rankings, notable wins…"
                                                />
                                            </Field>
                                            <Field label="Video link of you playing" optional error={errors.videoLink} help="A video or Instagram link starting with https://.">
                                                <input
                                                    value={profile.videoLink}
                                                    onChange={(e) => setProfile({ ...profile, videoLink: e.target.value })}
                                                    placeholder="https://..."
                                                />
                                            </Field>
                                        </div>
                                    )}

                                    {stepName === 'Availability' && (
                                        <div className="field-grid">
                                            <Field
                                                label={multiDay ? 'Which day(s) can you play?' : 'Are you available to play?'}
                                                error={errors.dayAvailability}
                                            >
                                                <div className="choice-group vertical">
                                                    {multiDay ? (
                                                        eventDays.map((day) => {
                                                            const checked = profile.dayAvailability.includes(day);
                                                            return (
                                                                <label key={day} className={checked ? 'checked' : ''}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={(e) =>
                                                                            setProfile({
                                                                                ...profile,
                                                                                dayAvailability: e.target.checked
                                                                                    ? [...profile.dayAvailability, day]
                                                                                    : profile.dayAvailability.filter((d) => d !== day),
                                                                            })
                                                                        }
                                                                    />
                                                                    {format(new Date(day), 'EEEE d MMMM')}
                                                                </label>
                                                            );
                                                        })
                                                    ) : (
                                                        <label className="checked">
                                                            <input type="checkbox" checked readOnly />
                                                            {format(event.start, 'EEEE d MMMM')}
                                                        </label>
                                                    )}
                                                </div>
                                            </Field>
                                            <Field label="Do you wish to own a team in the league OR sponsor the event?" error={errors.interest}>
                                                <div className="choice-group vertical">
                                                    {[
                                                        ['Team ownership', 'Yes, share me details about owning a team'],
                                                        ['Sponsorship', 'Yes, share me details about sponsorship'],
                                                        ['Not now', 'Not now'],
                                                    ].map(([value, label]) => (
                                                        <label key={value} className={profile.interest === value ? 'checked' : ''}>
                                                            <input
                                                                type="radio"
                                                                name="interest"
                                                                checked={profile.interest === value}
                                                                onChange={() => setProfile({ ...profile, interest: value as DetailedForm['interest'] })}
                                                            />
                                                            {label}
                                                        </label>
                                                    ))}
                                                </div>
                                            </Field>
                                        </div>
                                    )}

                                    {stepName === 'Consent' && (
                                        <>
                                            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                                By submitting this registration form, you formally acknowledge and agree
                                                to the following:
                                            </p>
                                            <div className="terms-list">
                                                {TERMS.map(([title, copy], i) => (
                                                    <section className="term-item" key={title}>
                                                        <h3>
                                                            {i + 1}. {title}
                                                        </h3>
                                                        <p>{copy}</p>
                                                    </section>
                                                ))}
                                            </div>
                                            <div className="consent-checks">
                                                <label className="check-line">
                                                    <input
                                                        type="checkbox"
                                                        checked={profile.consent}
                                                        onChange={(e) => setProfile({ ...profile, consent: e.target.checked })}
                                                    />
                                                    <span>
                                                        Yes, I agree to the above terms and conditions <span className="required">*</span>
                                                    </span>
                                                </label>
                                                {errors.consent && <p className="field-error">{errors.consent}</p>}
                                                {Number(profile.age) < 18 && (
                                                    <>
                                                        <label className="check-line">
                                                            <input
                                                                type="checkbox"
                                                                checked={profile.guardianConsent}
                                                                onChange={(e) => setProfile({ ...profile, guardianConsent: e.target.checked })}
                                                            />
                                                            I am the player's parent or guardian, consent to their participation, and accept these terms on their behalf.
                                                        </label>
                                                        {errors.guardianConsent && <p className="field-error">{errors.guardianConsent}</p>}
                                                    </>
                                                )}
                                                {profile.thirdParty && (
                                                    <>
                                                        <label className="check-line">
                                                            <input
                                                                type="checkbox"
                                                                checked={profile.thirdPartyConsent}
                                                                onChange={(e) => setProfile({ ...profile, thirdPartyConsent: e.target.checked })}
                                                            />
                                                            I have informed the player of all event details, terms and risks. Their participation is subject to these same terms.
                                                        </label>
                                                        {errors.thirdPartyConsent && <p className="field-error">{errors.thirdPartyConsent}</p>}
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {stepName === 'Review & pay' && (
                                        <>
                                            <div className="review-head">
                                                {photoPreview && <img src={photoPreview} alt="Your profile" />}
                                                <div>
                                                    <h3>{form.name.trim()}</h3>
                                                    <p>
                                                        {profile.city} · {profile.age} years · {profile.gender}
                                                    </p>
                                                </div>
                                            </div>
                                            <dl className="review-lines">
                                                {[
                                                    ['Email', profile.email],
                                                    ['WhatsApp', form.phone],
                                                    ['Sports', profile.sports.join(' & ')],
                                                    [
                                                        'Playing levels',
                                                        profile.sports
                                                            .map((s) => `${s}: ${s === 'Padel' ? profile.padelLevel : profile.pickleballLevel}`)
                                                            .join(' / '),
                                                    ],
                                                    ['Jersey size', profile.jersey],
                                                    [
                                                        'Availability',
                                                        multiDay
                                                            ? profile.dayAvailability.map((d) => format(new Date(d), 'd MMM')).join(', ') || 'Not selected'
                                                            : format(event.start, 'd MMM'),
                                                    ],
                                                    ['Instagram', profile.instagram || 'Not provided'],
                                                    ['League interest', profile.interest],
                                                    ['Achievements', profile.achievements || 'Not provided'],
                                                    ['Playing video', profile.videoLink || 'Not provided'],
                                                ].map(([title, value]) => (
                                                    <div key={title}>
                                                        <dt>{title}</dt>
                                                        <dd>{value}</dd>
                                                    </div>
                                                ))}
                                            </dl>
                                            <div className="checkout-total">
                                                <div>
                                                    <strong style={{ fontSize: 15, fontFamily: 'var(--font-sans)' }}>Player registration</strong>
                                                    <p className="field-help">{event.title}</p>
                                                </div>
                                                <strong>₹{totalInr.toLocaleString('en-IN')}</strong>
                                            </div>
                                            <p className="payment-note">
                                                <LockKeyhole size={13} className="inline mr-2" />
                                                Pay securely via Razorpay. Your registration is confirmed after
                                                payment.
                                            </p>
                                            {waitlist && (
                                                <p className="payment-note">
                                                    This event is full — no payment is taken for the waitlist. If a
                                                    spot opens we'll message you with a payment link.
                                                </p>
                                            )}
                                        </>
                                    )}

                                    {stepName === 'Payment' && !detailed && (
                                        <>
                                            <div className="checkout-total">
                                                <div>
                                                    <strong style={{ fontSize: 15, fontFamily: 'var(--font-sans)' }}>
                                                        {friendOpen ? 'Total · 2 entries' : 'Entry fee'}
                                                    </strong>
                                                    <p className="field-help">
                                                        {format(event.start, 'EEE d MMM · h:mm a')} · {event.venueName}
                                                    </p>
                                                </div>
                                                <strong>₹{totalInr.toLocaleString('en-IN')}</strong>
                                            </div>
                                            {waitlist ? (
                                                <p className="payment-note">
                                                    No payment is taken for the waitlist. If a spot opens we'll
                                                    message you with a payment link, valid for 2 hours.
                                                </p>
                                            ) : (
                                                <p className="payment-note">
                                                    Your spot is held instantly and confirmed by the venue before
                                                    the draw is published.
                                                </p>
                                            )}
                                        </>
                                    )}

                                    <div className="form-actions">
                                        {step > 0 && (
                                            <button type="button" onClick={back} className="back-btn">
                                                <ArrowLeft size={16} /> Back
                                            </button>
                                        )}
                                        <button type="submit" className="continue-btn next" disabled={submitting || checkingDuplicate}>
                                            {uploadingPhoto
                                                ? 'Uploading photo…'
                                                : submitting
                                                  ? 'Please wait…'
                                                  : checkingDuplicate
                                                    ? 'Checking…'
                                                    : step === lastStep
                                                      ? finalLabel
                                                      : 'Continue'}
                                            {step === lastStep ? <LockKeyhole size={16} /> : <ArrowRight size={16} />}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

function Field({
    label,
    optional,
    error,
    help,
    children,
    half = false,
}: {
    label: string;
    optional?: boolean;
    error?: string;
    help?: string;
    children: React.ReactNode;
    half?: boolean;
}) {
    return (
        <div className={`field ${half ? 'half' : ''}`}>
            <label>
                {label} {optional ? <span className="optional">(optional)</span> : <span className="required">*</span>}
            </label>
            {children}
            {help && <p className="field-help">{help}</p>}
            {error && (
                <p className="field-error" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
