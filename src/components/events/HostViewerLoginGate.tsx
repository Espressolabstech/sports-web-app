import { useState, type ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';
import { hostPreviewLogin } from '../../api/adapters/events';
import { verifyOtp } from '../../api/adapters/auth';

/** Renders the phone+OTP login form until a host-viewer token exists for
 *  this slug, then renders `children`. */
export default function HostViewerLoginGate({
    slug,
    token,
    onLogin,
    title,
    children,
}: {
    slug: string;
    token: string | null;
    onLogin: (token: string) => void;
    title: string;
    children: ReactNode;
}) {
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    if (token) return <>{children}</>;

    const sendOtp = async () => {
        if (!/^\d{10}$/.test(phone)) {
            setError('Enter a valid 10-digit mobile number');
            return;
        }
        setBusy(true);
        setError('');
        try {
            await hostPreviewLogin(slug, phone);
            setOtpSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not send OTP');
        } finally {
            setBusy(false);
        }
    };

    const verify = async () => {
        if (otp.trim().length === 0) {
            setError('Enter the OTP');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const result = await verifyOtp({ phone, otp: otp.trim() });
            onLogin(result.data.token);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid OTP');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="ccreg flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
            <LockKeyhole className="h-6 w-6" style={{ color: 'var(--primary)' }} />
            <div>
                <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                    {title}
                </h1>
                <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    This number must already be added as a host viewer for this event.
                </p>
            </div>
            <div className="w-full max-w-[280px] space-y-3">
                {!otpSent ? (
                    <>
                        <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="Mobile number"
                            inputMode="numeric"
                            className="field-input-plain"
                        />
                        <button onClick={sendOtp} disabled={busy} className="continue-btn w-full justify-center">
                            {busy ? 'Sending…' : 'Send OTP'}
                        </button>
                    </>
                ) : (
                    <>
                        <input
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="Enter OTP"
                            inputMode="numeric"
                            className="field-input-plain"
                        />
                        <button onClick={verify} disabled={busy} className="continue-btn w-full justify-center">
                            {busy ? 'Verifying…' : 'Verify & continue'}
                        </button>
                    </>
                )}
                {error && (
                    <p className="field-error" role="alert">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}
