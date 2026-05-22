import { Navigate } from 'react-router-dom';
import { getToken } from './cookies.helpers';
import { path } from '../../src/navigation/commanPaths';

// Wraps the /login route — if already logged in, redirect to Home
export const AuthWrapper = ({ children }: WrapperProps) => {
    return getToken() ? <Navigate to={path.home} replace /> : children;
};

// Wraps pages that truly require a logged-in user (My Bookings, Profile, Wallets)
// Guests are sent to /login, NOT bounced away from the public home page
export const ProtectedComponentWrapper = ({ children }: WrapperProps) => {
    return getToken() ? children : <Navigate to={path.login} replace />;
};
