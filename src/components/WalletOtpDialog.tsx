import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Shield } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
    sendWalletPaymentOtp,
    verifyWalletPaymentOtp,
} from '../api/adapters/bookings';

const RESEND_COOLDOWN = 60;

export interface WalletOtpDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Called with the short-lived verification token once OTP is confirmed. */
    onVerified: (walletOtpToken: string) => void;
}

export function WalletOtpDialog({
    open,
    onOpenChange,
    onVerified,
}: WalletOtpDialogProps) {
    const [otp, setOtp] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    const { mutate: sendOtp, isPending: isSendingOtp } = useMutation({
        mutationFn: () => sendWalletPaymentOtp(),
        onSuccess: () => setResendTimer(RESEND_COOLDOWN),
        onError: (error: any) =>
            toast.error(error?.message ?? 'Failed to send OTP'),
    });

    const { mutate: verify, isPending: isVerifying } = useMutation({
        mutationFn: () => verifyWalletPaymentOtp({ otp }),
        onSuccess: (res) => {
            onVerified(res.data.walletOtpToken);
            onOpenChange(false);
        },
        onError: (error: any) =>
            toast.error(error?.message ?? 'Invalid or expired OTP'),
    });

    // Reset + auto-send whenever the dialog opens
    useEffect(() => {
        if (open) {
            setOtp('');
            sendOtp();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(
            () => setResendTimer((prev) => prev - 1),
            1000,
        );
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleVerify = () => {
        if (!otp.trim() || isVerifying) return;
        verify();
    };

    const handleResend = () => {
        if (resendTimer > 0 || isSendingOtp) return;
        sendOtp();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full max-w-sm rounded-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-center gap-2 text-center text-lg font-semibold">
                        <Shield className="h-5 w-5 text-primary" />
                        Verify to pay with Points
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    <p className="text-center text-sm text-muted-foreground">
                        {isSendingOtp
                            ? 'Sending a code to your registered mobile number…'
                            : 'Enter the code sent to your registered mobile number to authorize this points payment.'}
                    </p>
                    <Input
                        placeholder="Enter OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                        className="text-center tracking-[0.5em] text-lg font-semibold"
                        maxLength={4}
                        autoFocus
                        type="number"
                        disabled={isSendingOtp}
                    />
                    <Button
                        onClick={handleVerify}
                        className="w-full"
                        disabled={!otp.trim() || isVerifying || isSendingOtp}
                    >
                        {isVerifying && (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        )}
                        {isVerifying ? 'Verifying...' : 'Verify & Pay'}
                        {!isVerifying && <ArrowRight className="h-4 w-4 ml-2" />}
                    </Button>
                    <button
                        className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleResend}
                        disabled={resendTimer > 0 || isSendingOtp}
                    >
                        {isSendingOtp ? (
                            'Sending...'
                        ) : resendTimer > 0 ? (
                            <>
                                Resend OTP in{' '}
                                <span className="font-medium text-primary">
                                    {String(resendTimer).padStart(2, '0')}s
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
            </DialogContent>
        </Dialog>
    );
}
