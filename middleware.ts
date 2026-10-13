// Vercel Edge Middleware — this app is a plain client-rendered SPA (no SSR),
// so link-preview crawlers (WhatsApp, iMessage, Slack, Twitter/X, LinkedIn,
// Facebook, Telegram, Discord…) fetch index.html and never run the React app,
// meaning they'd otherwise all see the same generic PlayPass title/no image
// regardless of which page was actually shared. For the handful of paths
// below, a known crawler user-agent gets a tiny static HTML page with proper
// Open Graph/Twitter tags (including the event's own card image) instead of
// the SPA shell; everyone else is unaffected and falls through to the normal
// static/rewrite pipeline untouched.
import { next } from '@vercel/edge';

export const config = {
    matcher: ['/the-court-collective', '/court-collective', '/events/the-court-collective-2026-2026-10-31'],
};

const BOT_USER_AGENT =
    /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|vkShare|SkypeUriPreview|redditbot|Iframely|Embedly|Googlebot|bingbot|Applebot/i;

const TITLE = 'The Court Collective 2026';
const DESCRIPTION =
    "India's first Pickleball & Padel auction league. Register as a player — get picked at the auction, play for your team, get paid.";

export default function middleware(request: Request) {
    const userAgent = request.headers.get('user-agent') || '';
    if (!BOT_USER_AGENT.test(userAgent)) {
        // Not a crawler — fall through to Vercel's normal static/rewrite
        // handling. `fetch(request)` looks like an equivalent "passthrough"
        // but actually re-enters this same middleware on Vercel (the matched
        // path doesn't change), causing an infinite redirect loop — `next()`
        // is the real continuation primitive.
        return next();
    }

    const { origin } = new URL(request.url);
    const imageUrl = `${origin}/og/court-collective-card.png`;

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${TITLE}</title>
<meta name="description" content="${DESCRIPTION}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${TITLE}" />
<meta property="og:description" content="${DESCRIPTION}" />
<meta property="og:image" content="${imageUrl}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${request.url}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${TITLE}" />
<meta name="twitter:description" content="${DESCRIPTION}" />
<meta name="twitter:image" content="${imageUrl}" />
</head>
<body></body>
</html>`;

    return new Response(html, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
    });
}
