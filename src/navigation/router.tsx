import { createBrowserRouter, Navigate } from 'react-router-dom';
import { path } from './commanPaths';
import { AuthWrapper, ProtectedComponentWrapper } from '../utils/wrapper';
import Login from '../screens/Login';
import Landing from '../screens/Landing';
import ForVenues from '../screens/Landing/ForVenues';
import Home from '../screens/home';
import MyBookings from '../screens/MyBookings';
import MyProfile from '../screens/Profile';
import Wallets from '../screens/Wallets';
import Venues from '../screens/home/Venues';
import VenueAbout from '../screens/home/VenueAbout';
import VenuePoints from '../screens/home/VenuePoints';
import Booking from '../screens/home/Booking';
import ConfirmBooking from '../screens/home/ConfirmBooking';
import MultiConfirmBooking from '../screens/home/MultiConfirmBooking';
import BookingSuccess from '../screens/home/BookingSuccess';
import EventsList from '../screens/events';
import EventLanding from '../screens/events/EventLanding';
import EventRegister from '../screens/events/EventRegister';
import EventLive from '../screens/events/EventLive';
import EventPass from '../screens/events/EventPass';
import EventHostPreview from '../screens/events/EventHostPreview';
import EventHosts from '../screens/events/EventHosts';
import EventSubPage from '../screens/events/EventSubPage';
import AuctionLive from '../screens/events/auction/AuctionLive';
import AuctionResults from '../screens/events/auction/AuctionResults';
import ExternalRedirect from '../components/ExternalRedirect';
import { TeamEventRoute } from '../screens/events/team/TeamRoute';
import config from '../config/config';

const COURT_COLLECTIVE_SLUG = 'the-court-collective-2026-2026-10-31';

export const router = createBrowserRouter([
    {
        path: path.login,
        element: <AuthWrapper children={<Login />} />,
    },
    {
        path: path.home,
        element: <Landing />,
    },
    {
        path: path.venues,
        element: <Home />,
    },
    {
        path: path.forVenues,
        element: <ForVenues />,
    },
    {
        path: path.MyBookings,
        element: <ProtectedComponentWrapper children={<MyBookings />} />,
    },
    {
        path: path.profile,
        element: <ProtectedComponentWrapper children={<MyProfile />} />,
    },
    {
        path: path.wallets,
        element: <ProtectedComponentWrapper children={<Wallets />} />,
    },
    {
        path: path.venue,
        element: <Venues />,
    },
    {
        path: path.venueAbout,
        element: <VenueAbout />,
    },
    {
        path: path.venuePoints,
        element: <VenuePoints />,
    },
    {
        path: path.booking,
        element: <Booking />,
    },
    {
        path: path.confirmBooking,
        element: <ConfirmBooking />,
    },
    {
        path: path.multiConfirmBooking,
        element: <MultiConfirmBooking />,
    },
    {
        path: path.bookingSuccess,
        element: <ProtectedComponentWrapper children={<BookingSuccess />} />,
    },
    {
        path: path.events,
        element: <EventsList />,
    },
    {
        path: path.eventRegister,
        element: <TeamEventRoute view="register"><EventRegister /></TeamEventRoute>,
    },
    // Dedicated vanity links for The Court Collective 2026 (one real event,
    // slug hardcoded) — shareable without the generic /events/:slug shape.
    // Landing page first; its own "Register as a player" button is what
    // sends a visitor into the form, same as every other event.
    {
        path: '/the-court-collective',
        element: (
            <EventLanding
                slugOverride="the-court-collective-2026-2026-10-31"
                registerHref="/the-court-collective/registration"
            />
        ),
    },
    {
        path: '/the-court-collective/registration',
        element: <EventRegister slugOverride="the-court-collective-2026-2026-10-31" />,
    },
    // Temporary manual-UPI registration path — disabled now that the real
    // Razorpay flow is live again. Redirects rather than 404s, in case the
    // old link is still shared/bookmarked anywhere.
    {
        path: '/court-collective',
        element: <Navigate to="/the-court-collective" replace />,
    },
    {
        path: '/court-collective/registration',
        element: <Navigate to="/the-court-collective/registration" replace />,
    },
    // Every other generic /events/:slug/* page for this one event is locked
    // — it only ever exists at its vanity URL — except host-preview, which
    // stays reachable at its real-slug path (no vanity alias for it).
    ...(
        ['', '/register', '/live', '/pass', '/hosts', '/rules', '/players', '/standings'] as const
    ).map((suffix) => ({
        path: `/events/the-court-collective-2026-2026-10-31${suffix}`,
        element: (
            <Navigate
                to={suffix === '/register' ? '/the-court-collective/registration' : '/the-court-collective'}
                replace
            />
        ),
    })),
    {
        path: path.eventLive,
        element: <TeamEventRoute view="live"><EventLive /></TeamEventRoute>,
    },
    {
        path: path.eventPass,
        element: <TeamEventRoute view="pass"><EventPass /></TeamEventRoute>,
    },
    {
        path: path.eventHosts,
        element: <EventHosts />,
    },
    // Host view (registered players) — kept here while The Court Collective
    // still uses it; the auction console lives in the organizer app.
    {
        path: path.eventHostPreview,
        element: <EventHostPreview />,
    },
    // Public auction pages: live screen (anyone) and team view (team users).
    { path: '/events/:slug/auction/live', element: <AuctionLive /> },
    { path: '/events/:slug/auction/team', element: <AuctionResults /> },
    // Vanity links for The Court Collective 2026.
    { path: '/auction', element: <Navigate to="/auction/live" replace /> },
    { path: '/auction/live', element: <AuctionLive slugOverride={COURT_COLLECTIVE_SLUG} /> },
    { path: '/auction/team', element: <AuctionResults slugOverride={COURT_COLLECTIVE_SLUG} /> },
    { path: '/auction/results', element: <Navigate to="/auction/team" replace /> },
    {
        path: '/auction/control',
        element: <ExternalRedirect to={`${config.organizerAppUrl}/host/events/${COURT_COLLECTIVE_SLUG}/auction`} />,
    },
    {
        path: path.eventRules,
        element: <TeamEventRoute view="landing"><EventSubPage section="rules" /></TeamEventRoute>,
    },
    {
        path: path.eventPlayers,
        element: <TeamEventRoute view="live"><EventSubPage section="players" /></TeamEventRoute>,
    },
    {
        path: path.eventStandings,
        element: <TeamEventRoute view="live"><EventSubPage section="standings" /></TeamEventRoute>,
    },
    {
        path: path.eventDetail,
        element: <TeamEventRoute view="landing"><EventLanding /></TeamEventRoute>,
    },
    {
        path: '*',
        element: <Navigate to={path.home} replace />,
    },
]);
