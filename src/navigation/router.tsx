import { createBrowserRouter, Navigate } from 'react-router-dom';
import { path } from './commanPaths';
import { AuthWrapper, ProtectedComponentWrapper } from '../utils/wrapper';
import Login from '../screens/Login';
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
import EventPass from '../screens/events/EventPass';
import EventHosts from '../screens/events/EventHosts';
import EventSubPage from '../screens/events/EventSubPage';

export const router = createBrowserRouter([
    {
        path: path.login,
        element: <AuthWrapper children={<Login />} />,
    },
    {
        path: path.home,
        element: <Home />,
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
    {
        path: path.eventPass,
        element: <EventPass />,
    },
    {
        path: path.eventHosts,
        element: <EventHosts />,
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
