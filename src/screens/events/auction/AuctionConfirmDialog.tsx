export interface AuctionConfirmation {
    title: string;
    description: string;
    action: string;
    destructive?: boolean;
    run: () => Promise<unknown>;
}

export default function AuctionConfirmDialog({
    confirmation,
    busy,
    onClose,
    onConfirm,
}: {
    confirmation: AuctionConfirmation | null;
    busy: boolean;
    onClose: () => void;
    onConfirm: () => void;
}) {
    if (!confirmation) return null;
    return (
        <div className="host-detail-overlay" onClick={onClose}>
            <div className="host-detail-card" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{confirmation.title}</h2>
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 20 }}>{confirmation.description}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="back-btn" onClick={onClose} disabled={busy}>
                        Cancel
                    </button>
                    <button
                        className="continue-btn"
                        style={confirmation.destructive ? { background: 'var(--destructive)', color: '#fff' } : undefined}
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {confirmation.action}
                    </button>
                </div>
            </div>
        </div>
    );
}
