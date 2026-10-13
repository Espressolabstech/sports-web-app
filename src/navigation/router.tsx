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
import EventHosts from '../screens/events/EventHosts';
import EventHostPreview from '../screens/events/EventHostPreview';
import EventSubPage from '../screens/events/EventSubPage';

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
        element: <EventRegister />,
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
    // Free player-auction entry — same landing page, but its own registration
    // flow with no Razorpay/fee step, ending in a player entry card instead
    // of a receipt.
    {
        path: '/court-collective',
        element: (
            <EventLanding
                slugOverride="the-court-collective-2026-2026-10-31"
                registerHref="/court-collective/registration"
            />
        ),
    },
    {
        path: '/court-collective/registration',
        element: <EventRegister slugOverride="the-court-collective-2026-2026-10-31" mode="auction-entry" />,
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
        element: <EventLive />,
    },
    {
        path: path.eventPass,
        element: <EventPass />,
    },
    {
        path: path.eventHosts,
        element: <EventHosts />,
    },
    {
        path: path.eventHostPreview,
        element: <EventHostPreview />,
    },
    {
        path: path.eventRules,
        element: <EventSubPage section="rules" />,
    },
    {
        path: path.eventPlayers,
        element: <EventSubPage section="players" />,
    },
    {
        path: path.eventStandings,
        element: <EventSubPage section="standings" />,
    },
    {
        path: path.eventDetail,
        element: <EventLanding />,
    },
    {
        path: '*',
        element: <Navigate to={path.home} replace />,
    },
]);
