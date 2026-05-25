import { createBrowserRouter } from 'react-router-dom';
import { path } from './commanPaths';
import { AuthWrapper, ProtectedComponentWrapper } from '../utils/wrapper';
import Login from '../screens/Login';
import Home from '../screens/home';
import MyBookings from '../screens/MyBookings';
import MyProfile from '../screens/Profile';
import Wallets from '../screens/Wallets';
import Venues from '../screens/home/Venues';
import Booking from '../screens/home/Booking';
import ConfirmBooking from '../screens/home/ConfirmBooking';
import MultiConfirmBooking from '../screens/home/MultiConfirmBooking';
import BookingSuccess from '../screens/home/BookingSuccess';
import ClubLayout from '../screens/Club/ClubLayout';
import ClubLanding from '../screens/Club/ClubLanding';
import ClubCredits from '../screens/Club/ClubCredits';
import ClubLogin from '../screens/Club/ClubLogin';
import ClubProfile from '../screens/Club/ClubProfile';

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
        path: path.clubLogin,
        element: <ClubLogin />,
    },
    {
        // Club booking: same Booking.tsx UI, URL stays inside /club/...
        path: '/club/:facilityId/book',
        element: <ProtectedComponentWrapper children={<Booking />} />,
    },
    {
        path: path.clubHome,
        element: <ClubLayout />,
        children: [
            { index: true, element: <ClubLanding /> },
            { path: 'credits', element: <ClubCredits /> },
            { path: 'bookings', element: <ProtectedComponentWrapper children={<MyBookings />} /> },
            { path: 'profile', element: <ProtectedComponentWrapper children={<ClubProfile />} /> },
        ],
    },
]);
