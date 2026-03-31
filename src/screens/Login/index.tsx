import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, ArrowLeft } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { userLogin, resendOtp, verifyOtp } from '../../api/adapters/auth';
import { setToken } from '../../utils/cookies.helpers';
import { toast } from 'sonner';
import { path } from '../../navigation/commanPaths';

const RESEND_COOLDOWN = 60;

const Login = () => {
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [resendTimer, setResendTimer] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(() => {
            setResendTimer((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);

    const { mutate: login, isPending } = useMutation({
        mutationFn: (data: UserLogin) => userLogin(data),
        onSuccess: () => {
            setStep('otp');
            setOtp('');
            setResendTimer(RESEND_COOLDOWN);
            toast.success('OTP sent successfully!');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const { mutate: verifyOtpMutation, isPending: isOtpPending } = useMutation({
        mutationFn: (data: VerifyOtp) => verifyOtp(data),
        onSuccess: async (data) => {
            setToken(data.data.token);
            toast.success('Login successful!');
            navigate(path.home);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const { mutate: resendOtpMutation, isPending: isResendOtpPending } =
        useMutation({
            mutationFn: (data: ResendOtp) => resendOtp(data),
            onSuccess: () => {
                toast.success('OTP resent successfully!');
                setResendTimer(RESEND_COOLDOWN);
            },
            onError: (error) => {
                toast.error(error.message);
            },
        });

    const handlePhoneSubmit = () => {
        if (!phone.trim()) return;
        login({ phone });
    };

    const handleOtpSubmit = () => {
        if (!otp.trim()) return;
        verifyOtpMutation({ phone, otp });
    };

    const handleResend = () => {
        if (resendTimer > 0 || isResendOtpPending) return;
        resendOtpMutation({ phone });
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Hero */}
            <div className="bg-primary px-6 pt-16 pb-12 text-primary-foreground">
                <div className="mx-auto max-w-sm">
                    <h1 className="text-3xl font-bold tracking-tight">
                        BookEase
                    </h1>
                    <p className="mt-2 text-primary-foreground/80 text-sm">
                        Book courts, manage games, play more.
                    </p>
                </div>
            </div>

            <main className="flex-1 px-6 pt-8">
                <div className="mx-auto max-w-sm space-y-6">
                    {step === 'phone' ? (
                        <>
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">
                                    Welcome,
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Enter your mobile number to login
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="50 123 4567"
                                        value={phone}
                                        onChange={(e) =>
                                            setPhone(e.target.value)
                                        }
                                        onKeyDown={(e) =>
                                            e.key === 'Enter' &&
                                            handlePhoneSubmit()
                                        }
                                        className="pl-10"
                                        autoFocus
                                        type="tel"
                                    />
                                </div>

                                <Button
                                    onClick={handlePhoneSubmit}
                                    className="w-full"
                                    disabled={!phone.trim() || isPending}
                                >
                                    {isPending ? 'Sending...' : 'Send OTP'}
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>

                            <p className="text-xs text-center text-muted-foreground">
                                By continuing, you agree to our Terms of Service
                                and Privacy Policy.
                            </p>
                        </>
                    ) : (
                        <>
                            <div>
                                <button
                                    onClick={() => setStep('phone')}
                                    className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Change number
                                </button>
                                <h2 className="text-xl font-semibold text-foreground">
                                    Verify your number
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    We sent a 6-digit code to{' '}
                                    <span className="font-medium text-foreground">
                                        {phone}
                                    </span>
                                </p>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    placeholder="Enter OTP"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    onKeyDown={(e) =>
                                        e.key === 'Enter' && handleOtpSubmit()
                                    }
                                    className="text-center tracking-[0.5em] text-lg font-semibold"
                                    maxLength={6}
                                    autoFocus
                                    type="number"
                                />

                                <Button
                                    onClick={handleOtpSubmit}
                                    className="w-full"
                                    disabled={!otp.trim() || isOtpPending}
                                >
                                    {isOtpPending
                                        ? 'Verifying...'
                                        : 'Verify & Continue'}
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>

                                <button
                                    className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
                                    onClick={handleResend}
                                    disabled={
                                        resendTimer > 0 || isResendOtpPending
                                    }
                                >
                                    {isResendOtpPending ? (
                                        'Resending...'
                                    ) : resendTimer > 0 ? (
                                        <>
                                            Resend OTP in{' '}
                                            <span className="font-medium text-primary">
                                                {String(
                                                    Math.floor(
                                                        resendTimer / 60,
                                                    ),
                                                ).padStart(2, '0')}
                                                :
                                                {String(
                                                    resendTimer % 60,
                                                ).padStart(2, '0')}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            Didn't receive a code?{' '}
                                            <span className="font-medium text-primary">
                                                Resend
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Login;
