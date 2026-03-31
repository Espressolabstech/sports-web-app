import { Navigate } from 'react-router-dom';
import { getToken } from './cookies.helpers';
import { path } from '../../src/navigation/commanPaths';

export const AuthWrapper = ({ children }: WrapperProps) => {
    return getToken() ? <Navigate to={path.dashboard} replace /> : children;
};

export const ProtectedComponentWrapper = ({ children }: WrapperProps) => {
    return getToken() ? children : <Navigate to={path.login} replace />;
};
