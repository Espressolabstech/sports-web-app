import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { userLogin, verifyOtp, resendOtp } from '../../api/adapters/auth';
import { getMyClubs } from '../../api/adapters/pointsWallet';
import { getVenueDetail } from '../../api/adapters/venues';
import { setToken, setActiveClubSlug } from '../../utils/cookies.helpers';

const RESEND_COOLDOWN = 60;

export default function ClubLogin() {
    const { venueId: slugOrId } = useParams();
    const navigate = useNavigate();

    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [helpOpen, setHelpOpen] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const { data: venueData } = useQuery({
        queryKey: ['venue', slugOrId],
        queryFn: () => getVenueDetail(slugOrId!),
        enabled: !!slugOrId,
    });
    const venue = venueData?.data?.venue;
    const venueName = venue?.name ?? '';
    const initial = venueName[0]?.toUpperCase() ?? '?';
    const accent = `hsl(var(--club-accent))`;

    useEffect(() => {
        if (resendTimer <= 0) return;
        const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
        return () => clearInterval(id);
    }, [resendTimer]);

    const { mutate: sendOtp, isPending: sendingOtp } = useMutation({
        mutationFn: () => userLogin({ phone }),
        onSuccess: () => {
            setStep('otp');
            setOtp('');
            setResendTimer(RESEND_COOLDOWN);
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const { mutate: resend, isPending: resending } = useMutation({
        mutationFn: () => resendOtp({ phone }),
        onSuccess: () => {
            toast.success('OTP resent');
            setResendTimer(RESEND_COOLDOWN);
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const { mutate: verify, isPending: verifying } = useMutation({
        mutationFn: () => verifyOtp({ phone, otp }),
        onSuccess: async (data) => {
            setToken(data.data.token);
            try {
                const res = await getMyClubs();
                const club = res?.data?.clubs?.find(
                    (c) => c.venue.slug === slugOrId || c.venue.id === slugOrId,
                );
                const dest = club?.venue.slug ?? club?.venue.id ?? slugOrId;
                if (dest) setActiveClubSlug(dest);
                navigate(`/club/${dest}`, { replace: true });
            } catch {
                if (slugOrId) setActiveClubSlug(slugOrId);
                navigate(`/club/${slugOrId}`, { replace: true });
            }
        },
        onError: (err: Error) => toast.error(err.message),
    });

    return (
        <div className="club-root min-h-screen flex flex-col items-center justify-between bg-[hsl(var(--club-bg))] text-[hsl(var(--club-ink))] px-6 py-10">
            <div className="w-full max-w-[380px] mx-auto flex flex-col items-center pt-6">
                {/* Brand identity */}
                <div className="mb-10 text-center space-y-4">
                    <div
                        className="mx-auto h-16 w-16 rounded-full grid place-items-center shadow-[0_8px_24px_-8px_hsl(var(--club-accent)/0.4)]"
                        style={{ background: accent }}
                    >
                        <span className="font-serif text-2xl text-white">
                            {initial}
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        <h1 className="font-serif text-3xl tracking-tight">
                            {venueName || <span className="opacity-0">Loading</span>}
                        </h1>
                        <p
                            className="text-[10px] font-medium uppercase tracking-[0.25em]"
                            style={{ color: accent }}
                        >
                            Sports Booking System
                        </p>
                    </div>
                </div>

                {/* Card */}
                <div className="w-full bg-[hsl(var(--club-surface))] rounded-3xl border border-[hsl(var(--club-border))] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.08)] p-7">
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <ShieldCheck className="h-3 w-3" style={{ color: accent }} />
                        <span
                            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                            style={{ color: accent }}
                        >
                            Registered Members Only
                        </span>
                    </div>

                    {step === 'phone' ? (
                        <div className="space-y-6">
                            <div className="text-center space-y-1.5">
                                <h2 className="font-serif text-xl">Member Sign In</h2>
                                <p className="text-sm text-[hsl(var(--club-muted))]">
                                    Enter your mobile number to continue
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-xs font-semibold text-[hsl(var(--club-muted))]">
                                        +91
                                    </div>
                                    <Input
                                        type="tel"
                                        placeholder="98765 43210"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        onKeyDown={(e) =>
                                            e.key === 'Enter' &&
                                            phone.trim() &&
                                            sendOtp()
                                        }
                                        maxLength={10}
                                        autoFocus
                                        className="pl-12 h-12 bg-[hsl(var(--club-bg))] border-[hsl(var(--club-border))] rounded-xl text-base"
                                    />
                                </div>

                                <Button
                                    onClick={() => sendOtp()}
                                    disabled={!phone.trim() || sendingOtp}
                                    className="w-full h-12 rounded-xl text-white font-semibold text-xs uppercase tracking-[0.18em] shadow-[0_10px_24px_-10px_hsl(var(--club-accent)/0.6)] hover:opacity-95"
                                    style={{ background: accent }}
                                >
                                    {sendingOtp ? 'Sending…' : 'Send Access Code'}
                                </Button>
                            </div>

                            <div className="pt-4 border-t border-[hsl(var(--club-border))] text-center">
                                <button
                                    onClick={() => setHelpOpen(true)}
                                    className="text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--club-muted))] hover:text-[hsl(var(--club-ink))] transition-colors"
                                >
                                    Need Assistance?
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <button
                                onClick={() => setStep('phone')}
                                className="flex items-center gap-1.5 text-xs text-[hsl(var(--club-muted))] hover:text-[hsl(var(--club-ink))]"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Change number
                            </button>

                            <div className="text-center space-y-1.5">
                                <h2 className="font-serif text-xl">
                                    Verify your number
                                </h2>
                                <p className="text-sm text-[hsl(var(--club-muted))]">
                                    We sent a code to{' '}
                                    <span className="font-medium text-[hsl(var(--club-ink))]">
                                        +91 {phone}
                                    </span>
                                </p>
                            </div>

                            <Input
                                type="number"
                                placeholder="••••••"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && otp.trim() && verify()
                                }
                                maxLength={6}
                                autoFocus
                                className="text-center tracking-[0.5em] text-lg font-semibold h-12 bg-[hsl(var(--club-bg))] border-[hsl(var(--club-border))] rounded-xl"
                            />

                            <Button
                                onClick={() => verify()}
                                disabled={!otp.trim() || verifying}
                                className="w-full h-12 rounded-xl text-white font-semibold text-xs uppercase tracking-[0.18em]"
                                style={{ background: accent }}
                            >
                                {verifying ? 'Verifying…' : 'Verify & Continue'}
                            </Button>

                            <button
                                disabled={resendTimer > 0 || resending}
                                onClick={() => resend()}
                                className="w-full text-center text-xs text-[hsl(var(--club-muted))] hover:text-[hsl(var(--club-ink))] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {resendTimer > 0 ? (
                                    <>
                                        Resend in{' '}
                                        <span style={{ color: accent }}>
                                            {String(Math.floor(resendTimer / 60)).padStart(2, '0')}:
                                            {String(resendTimer % 60).padStart(2, '0')}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        Didn't receive a code?{' '}
                                        <span className="font-semibold" style={{ color: accent }}>
                                            Resend
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="pt-12 pb-2 flex flex-col items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
                <span className="text-[8px] font-medium uppercase tracking-[0.35em] text-[hsl(var(--club-muted))]">
                    Powered by
                </span>
                <span className="font-serif text-sm font-bold italic tracking-tight text-[hsl(var(--club-ink))]">
                    BookEase
                </span>
            </div>

            {/* Help modal */}
            {helpOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-end sm:place-items-center"
                    onClick={() => setHelpOpen(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full sm:max-w-sm bg-[hsl(var(--club-surface))] rounded-t-2xl sm:rounded-2xl p-6 border border-[hsl(var(--club-border))]"
                    >
                        <h3 className="font-serif text-lg">Need assistance?</h3>
                        <p className="mt-2 text-sm text-[hsl(var(--club-muted))]">
                            Access is limited to registered members of {venueName}.
                            For membership queries or login issues, please contact
                            the front desk.
                        </p>
                        {(venue?.phone || venue?.email) && (
                            <div className="mt-4 space-y-2 text-sm">
                                {venue.phone && (
                                    <div className="flex justify-between">
                                        <span className="text-[hsl(var(--club-muted))]">
                                            Phone
                                        </span>
                                        <span className="font-medium">{venue.phone}</span>
                                    </div>
                                )}
                                {venue.email && (
                                    <div className="flex justify-between">
                                        <span className="text-[hsl(var(--club-muted))]">
                                            Email
                                        </span>
                                        <span className="font-medium">{venue.email}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        <Button
                            onClick={() => setHelpOpen(false)}
                            className="mt-5 w-full h-11 rounded-xl text-white"
                            style={{ background: accent }}
                        >
                            Got it
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
