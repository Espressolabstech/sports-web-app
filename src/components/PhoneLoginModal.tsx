import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface PhoneLoginModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function PhoneLoginModal({
    open,
    onOpenChange,
    onSuccess,
}: PhoneLoginModalProps) {
    const [phone, setPhone] = useState('');
    const [login] = useState(true);

    const handleLogin = () => {
        if (phone.trim()) {
            // login(phone);
            setPhone('');
            onOpenChange(false);
            onSuccess?.();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full max-w-sm rounded-lg">
                <DialogHeader>
                    <DialogTitle className="text-center">
                        Sign in with EasyBook
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <label className="text-sm font-medium text-foreground">
                            Phone Number
                        </label>
                        <Input
                            placeholder="Enter your phone number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === 'Enter' && handleLogin()
                            }
                            className="mt-2"
                            autoFocus
                        />
                    </div>
                    <Button
                        onClick={handleLogin}
                        className="w-full"
                        disabled={!phone.trim()}
                    >
                        Continue
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
