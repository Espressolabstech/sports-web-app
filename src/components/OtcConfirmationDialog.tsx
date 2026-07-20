import { Shield } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './ui/alert-dialog';

interface OtcConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    venueName: string;
    onConfirm: () => void;
    loading?: boolean;
}

export function OtcConfirmationDialog({
    open,
    onOpenChange,
    venueName,
    onConfirm,
    loading,
}: OtcConfirmationDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Mark your slot as available
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3 text-sm">
                            <p>
                                Opening your slot lets another player book
                                your court. If they do, your full booking
                                amount is automatically returned to your
                                wallet — no action needed from you.
                            </p>
                            <p>
                                Your booking stays confirmed the entire time.
                                If no one takes the slot before the cutoff,
                                you simply attend as planned.
                            </p>
                            <p className="font-medium text-foreground">
                                This uses one of your 2 monthly Open to Cancel
                                allowances at {venueName}.
                            </p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} disabled={loading}>
                        {loading ? 'Confirming...' : 'Confirm'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
