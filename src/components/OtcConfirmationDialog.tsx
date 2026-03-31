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
                        Open to Cancel
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3 text-sm">
                            <p>
                                If someone books this slot, you'll receive a
                                full refund automatically.
                            </p>
                            <p>
                                If no one books it, you'll remain confirmed and
                                charged as normal.
                            </p>
                            <p className="font-medium text-foreground">
                                This uses 1 of your 2 monthly Open to Cancel
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
                        {loading ? 'Activating...' : 'Activate OTC'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
