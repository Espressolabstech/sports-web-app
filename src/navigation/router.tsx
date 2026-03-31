import { createBrowserRouter } from 'react-router-dom';
import { path } from './commanPaths';
import { AuthWrapper, ProtectedComponentWrapper } from '../utils/wrapper';
import Login from '../screens/Login';
import Home from '../screens/home';
import MyBookings from '../screens/MyBookings';
import MyProfile from '../screens/Profile';
import Venues from '../screens/home/Venues';
import Booking from '../screens/home/Booking';

export const router = createBrowserRouter([
    {
        path: path.login,
        element: <AuthWrapper children={<Login />} />,
    },
    {
        path: path.home,
        element: <ProtectedComponentWrapper children={<Home />} />,
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
        path: path.venue,
        element: <Venues />,
    },
    {
        path: path.booking,
        element: <Booking />,
    },
]);
