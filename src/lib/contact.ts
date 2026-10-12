import { submitContactInterest as apiSubmitContactInterest } from '../api/adapters/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_MAX = 254;

export type ContactOutcome = { ok: boolean; message?: string };

/** Sends a "get in touch" lead from the marketing homepage to the server. */
export async function submitContactInterest(options: {
    email: string;
    source: string;
    company?: string;
    honeypot?: string;
}): Promise<ContactOutcome> {
    const email = options.email.trim().toLowerCase();

    if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
        return { ok: false, message: 'Please enter a valid email address.' };
    }

    try {
        await apiSubmitContactInterest({
            email,
            source: options.source,
            company: options.company?.trim() || undefined,
            website: options.honeypot ?? '',
        });
        return { ok: true };
    } catch {
        return {
            ok: false,
            message: "We couldn't send that just now. Please try again in a moment.",
        };
    }
}
