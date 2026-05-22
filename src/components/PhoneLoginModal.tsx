import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Phone, User, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
    userLogin,
    resendOtp,
    verifyOtp,
    updateUserName,
} from '../api/adapters/auth';
import { setToken } from '../utils/cookies.helpers';

const RESEND_COOLDOWN = 60;

export interface PhoneLoginModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Called after a successful login (or name setup on first login). */
    onSuccess?: () => void;
}

export function PhoneLoginModal({
    open,
    onOpenChange,
    onSuccess,
}: PhoneLoginModalProps) {
    const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    // Reset state whenever the modal opens
    useEffect(() => {
        if (open) {
            setStep('phone');
            setPhone('');
            setOtp('');
            setFirstName('');
            setLastName('');
            setResendTimer(0);
        }
    }, [open]);

    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(
            () => setResendTimer((prev) => prev - 1),
            1000,
        );
        return () => clearInterval(interval);
    }, [resendTimer]);

    const { mutate: login, isPending: isSendingOtp } = useMutation({
        mutationFn: (data: UserLogin) => userLogin(data),
        onSuccess: () => {
            setStep('otp');
            setOtp('');
            setResendTimer(RESEND_COOLDOWN);
            toast.success('OTP sent!');
        },
        onError: (error) => toast.error(error.message),
    });

    const { mutate: verifyOtpMutation, isPending: isVerifyingOtp } =
        useMutation({
            mutationFn: (data: VerifyOtp) => verifyOtp(data),
            onSuccess: (data) => {
                setToken(data.data.token);
                if (data.data.isNewUser) {
                    setStep('name');
                } else {
                    toast.success('Logged in!');
                    onOpenChange(false);
                    onSuccess?.();
                }
            },
            onError: (error) => toast.error(error.message),
        });

    const { mutate: resendOtpMutation, isPending: isResendingOtp } =
        useMutation({
            mutationFn: (data: ResendOtp) => resendOtp(data),
            onSuccess: () => {
                toast.success('OTP resent!');
                setResendTimer(RESEND_COOLDOWN);
            },
            onError: (error) => toast.error(error.message),
        });

    const { mutate: submitName, isPending: isSubmittingName } = useMutation({
        mutationFn: (data: UpdateUserName) => updateUserName(data),
        onSuccess: () => {
            toast.success('Welcome to BookEase!');
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (error) => toast.error(error.message),
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
        if (resendTimer > 0 || isResendingOtp) return;
        resendOtpMutation({ phone });
    };

    const handleNameSubmit = () => {
        if (!firstName.trim() || !lastName.trim()) return;
        submitName({ firstName: firstName.trim(), lastName: lastName.trim() });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full max-w-sm rounded-xl">
                <DialogHeader>
                    <DialogTitle className="text-center text-lg font-semibold">
                        {step === 'phone' && 'Sign in to BookEase'}
                        {step === 'otp' && 'Verify your number'}
                        {step === 'name' && "What's your name?"}
                    </DialogTitle>
                </DialogHeader>

                {/* ── Phone step ── */}
                {step === 'phone' && (
                    <div className="space-y-4 pt-2">
                        <p className="text-center text-sm text-muted-foreground">
                            Enter your mobile number to continue
                        </p>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="50 123 4567"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && handlePhoneSubmit()
                                }
                                className="pl-10"
                                autoFocus
                                type="tel"
                            />
                        </div>
                        <Button
                            onClick={handlePhoneSubmit}
                            className="w-full"
                            disabled={!phone.trim() || isSendingOtp}
                        >
                            {isSendingOtp && (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            )}
                            {isSendingOtp ? 'Sending...' : 'Send OTP'}
                            {!isSendingOtp && (
                                <ArrowRight className="h-4 w-4 ml-2" />
                            )}
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">
                            By continuing you agree to our Terms &amp; Privacy
                            Policy.
                        </p>
                    </div>
                )}

                {/* ── OTP step ── */}
                {step === 'otp' && (
                    <div className="space-y-4 pt-2">
                        <div>
                            <button
                                onClick={() => setStep('phone')}
                                className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Change number
                            </button>
                            <p className="text-sm text-muted-foreground">
                                We sent a code to{' '}
                                <span className="font-medium text-foreground">
                                    {phone}
                                </span>
                            </p>
                        </div>
                        <Input
                            placeholder="Enter OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === 'Enter' && handleOtpSubmit()
                            }
                            className="text-center tracking-[0.5em] text-lg font-semibold"
                            maxLength={4}
                            autoFocus
                            type="number"
                        />
                        <Button
                            onClick={handleOtpSubmit}
                            className="w-full"
                            disabled={!otp.trim() || isVerifyingOtp}
                        >
                            {isVerifyingOtp && (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            )}
                            {isVerifyingOtp ? 'Verifying...' : 'Verify & Continue'}
                            {!isVerifyingOtp && (
                                <ArrowRight className="h-4 w-4 ml-2" />
                            )}
                        </Button>
                        <button
                            className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleResend}
                            disabled={resendTimer > 0 || isResendingOtp}
                        >
                            {isResendingOtp ? (
                                'Resending...'
                            ) : resendTimer > 0 ? (
                                <>
                                    Resend OTP in{' '}
                                    <span className="font-medium text-primary">
                                        {String(
                                            Math.floor(resendTimer / 60),
                                        ).padStart(2, '0')}
                                        :
                                        {String(resendTimer % 60).padStart(
                                            2,
                                            '0',
                                        )}
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
                )}

                {/* ── Name step (first-time users) ── */}
                {step === 'name' && (
                    <div className="space-y-4 pt-2">
                        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/10">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-center text-sm text-muted-foreground">
                            This is how venues and players will see you.
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-foreground">
                                    First Name
                                </label>
                                <Input
                                    placeholder="e.g. Rahul"
                                    value={firstName}
                                    onChange={(e) =>
                                        setFirstName(e.target.value)
                                    }
                                    autoFocus
                                    maxLength={50}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground">
                                    Last Name
                                </label>
                                <Input
                                    placeholder="e.g. Sharma"
                                    value={lastName}
                                    onChange={(e) =>
                                        setLastName(e.target.value)
                                    }
                                    onKeyDown={(e) =>
                                        e.key === 'Enter' && handleNameSubmit()
                                    }
                                    maxLength={50}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={handleNameSubmit}
                            className="w-full"
                            disabled={
                                !firstName.trim() ||
                                !lastName.trim() ||
                                isSubmittingName
                            }
                        >
                            {isSubmittingName && (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            )}
                            {isSubmittingName ? 'Saving...' : "Let's go!"}
                            {!isSubmittingName && (
                                <ArrowRight className="h-4 w-4 ml-2" />
                            )}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
