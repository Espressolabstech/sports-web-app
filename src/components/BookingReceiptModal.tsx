import { useRef } from 'react';
import { format } from 'date-fns';
import { X, Printer, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { formatTime } from '../utils/twMerge';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ReceiptData {
    bookingRef: string;
    venueName: string;
    venueAddress: string;
    sport: string;
    courtName: string;
    bookingDate: string; // 'yyyy-MM-dd'
    startTime: string;   // 'HH:mm'
    endTime: string;
    durationMinutes?: number;
    totalAmount: number;
    discountAmount?: number;
    finalAmount: number;
    paymentMode?: 'RUPEE' | 'POINTS';
    pointsAmount?: number | null;
    paymentMethod?: string;
    paymentStatus?: string;
    bookedAt?: string; // ISO date of booking creation
}

interface Props {
    open: boolean;
    onClose: () => void;
    data: ReceiptData;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const BookingReceiptModal = ({ open, onClose, data }: Props) => {
    const receiptRef = useRef<HTMLDivElement>(null);

    if (!open) return null;

    const formattedDate = format(new Date(data.bookingDate), 'EEEE, d MMMM yyyy');
    const generatedAt = data.bookedAt
        ? format(new Date(data.bookedAt), 'dd MMM yyyy, hh:mm a')
        : format(new Date(), 'dd MMM yyyy, hh:mm a');

    const handlePrint = () => {
        const receiptHtml = receiptRef.current?.innerHTML ?? '';
        const win = window.open('', '_blank', 'width=420,height=700');
        if (!win) return;
        win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt – ${data.bookingRef}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f4f4f5;
      display: flex;
      justify-content: center;
      padding: 24px 16px;
    }
    .receipt {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 380px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    }
    .receipt-header {
      background: #1d4ed8;
      color: #fff;
      text-align: center;
      padding: 28px 20px 20px;
    }
    .receipt-header .icon {
      width: 48px; height: 48px;
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 12px;
      font-size: 24px;
    }
    .receipt-header h1 { font-size: 20px; font-weight: 700; }
    .receipt-header p { font-size: 12px; opacity: 0.75; margin-top: 4px; }
    .ref-band {
      background: #eff6ff;
      border-top: 1px dashed #bfdbfe;
      border-bottom: 1px dashed #bfdbfe;
      text-align: center;
      padding: 14px 20px;
    }
    .ref-band .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
    .ref-band .ref { font-size: 22px; font-weight: 800; color: #1d4ed8; letter-spacing: 0.05em; margin-top: 2px; }
    .body { padding: 20px; }
    .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
    .row .key { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
    .row .val { font-size: 13px; font-weight: 600; color: #111827; text-align: right; max-width: 58%; }
    .divider { border: none; border-top: 1px dashed #e5e7eb; margin: 14px 0; }
    .total-row { display: flex; justify-content: space-between; align-items: center; }
    .total-row .key { font-size: 13px; font-weight: 700; color: #111827; }
    .total-row .val { font-size: 20px; font-weight: 800; color: #1d4ed8; }
    .footer { text-align: center; padding: 14px 20px 20px; border-top: 1px solid #f3f4f6; }
    .footer p { font-size: 10px; color: #9ca3af; line-height: 1.5; }
    .footer .gen { font-size: 10px; color: #6b7280; margin-bottom: 4px; }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt { box-shadow: none; border-radius: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    ${receiptHtml}
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`);
        win.document.close();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="fixed inset-x-0 bottom-0 z-50 max-h-[95dvh] overflow-y-auto rounded-t-2xl bg-background shadow-2xl">
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
                </div>

                {/* Top toolbar */}
                <div className="flex items-center justify-between px-4 pb-2">
                    <h2 className="text-base font-semibold">Booking Receipt</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 hover:bg-muted"
                    >
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Receipt card — this is what gets printed */}
                <div className="px-4 pb-6">
                    <div
                        ref={receiptRef}
                        className="receipt-printable overflow-hidden rounded-2xl border shadow-sm"
                    >
                        {/* Header */}
                        <div className="receipt-header bg-primary text-primary-foreground text-center px-5 pb-5 pt-7">
                            <div className="icon mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/15">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <h1 className="text-lg font-bold">Booking Confirmed</h1>
                            <p className="text-xs opacity-75 mt-1">{data.venueName}</p>
                        </div>

                        {/* Booking ref band */}
                        <div className="ref-band border-y border-dashed border-primary/20 bg-primary/5 py-3.5 text-center">
                            <p className="label text-[10px] uppercase tracking-widest text-muted-foreground">
                                Booking Reference
                            </p>
                            <p className="ref mt-1 text-2xl font-black tracking-wider text-primary">
                                {data.bookingRef}
                            </p>
                        </div>

                        {/* Details */}
                        <div className="body space-y-0 px-5 py-5">
                            {/* Venue */}
                            <div className="row mb-3 flex justify-between text-sm">
                                <span className="key text-[11px] uppercase tracking-wide text-muted-foreground">Venue</span>
                                <span className="val max-w-[60%] text-right font-semibold">
                                    {data.venueName}
                                    <br />
                                    <span className="text-xs font-normal text-muted-foreground">{data.venueAddress}</span>
                                </span>
                            </div>

                            {/* Sport & Court */}
                            <div className="row mb-3 flex justify-between text-sm">
                                <span className="key text-[11px] uppercase tracking-wide text-muted-foreground">Sport &amp; Court</span>
                                <span className="val text-right font-semibold">
                                    {data.sport}
                                    <br />
                                    <span className="text-xs font-normal text-muted-foreground">{data.courtName}</span>
                                </span>
                            </div>

                            {/* Date */}
                            <div className="row mb-3 flex justify-between text-sm">
                                <span className="key text-[11px] uppercase tracking-wide text-muted-foreground">Date</span>
                                <span className="val text-right font-semibold">{formattedDate}</span>
                            </div>

                            {/* Time */}
                            <div className="row mb-3 flex justify-between text-sm">
                                <span className="key text-[11px] uppercase tracking-wide text-muted-foreground">Time</span>
                                <span className="val text-right font-semibold">
                                    {formatTime(data.startTime)} – {formatTime(data.endTime)}
                                    {data.durationMinutes
                                        ? ` (${data.durationMinutes} min)`
                                        : ''}
                                </span>
                            </div>

                            {/* Payment method */}
                            {data.paymentMethod && (
                                <div className="row mb-3 flex justify-between text-sm">
                                    <span className="key text-[11px] uppercase tracking-wide text-muted-foreground">Payment</span>
                                    <span className="val text-right font-semibold capitalize">
                                        {data.paymentMethod.replace(/_/g, ' ')}
                                        {data.paymentStatus
                                            ? ` · ${data.paymentStatus}`
                                            : ''}
                                    </span>
                                </div>
                            )}

                            {/* Divider */}
                            <hr className="my-3 border-dashed border-border" />

                            {/* Pricing */}
                            {data.paymentMode === 'POINTS' ? (
                                <div className="total-row flex items-center justify-between">
                                    <span className="font-bold text-foreground">Points Used</span>
                                    <span className="text-xl font-black text-primary">
                                        {(data.pointsAmount ?? 0).toLocaleString()} pts
                                    </span>
                                </div>
                            ) : (
                                <>
                                    {(data.discountAmount ?? 0) > 0 && (
                                        <>
                                            <div className="mb-2 flex justify-between text-sm">
                                                <span className="text-muted-foreground">Subtotal</span>
                                                <span>₹{data.totalAmount.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="mb-2 flex justify-between text-sm text-green-600 dark:text-green-400">
                                                <span>Discount</span>
                                                <span>−₹{(data.discountAmount ?? 0).toLocaleString('en-IN')}</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="total-row flex items-center justify-between">
                                        <span className="font-bold text-foreground">Total Paid</span>
                                        <span className="text-xl font-black text-primary">
                                            ₹{data.finalAmount.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="footer border-t px-5 pb-5 pt-3.5 text-center">
                            <p className="gen text-[10px] text-muted-foreground">
                                Generated on {generatedAt}
                            </p>
                            <p className="text-[10px] text-muted-foreground/70 mt-1 leading-relaxed">
                                Please present this receipt at the venue.
                                <br />
                                For support, contact the venue directly.
                            </p>
                        </div>
                    </div>

                    {/* Print button */}
                    <Button
                        className="mt-4 w-full gap-2"
                        size="lg"
                        onClick={handlePrint}
                    >
                        <Printer className="h-4 w-4" />
                        Download / Print Receipt
                    </Button>
                </div>
            </div>
        </>
    );
};
