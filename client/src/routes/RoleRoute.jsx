import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PrivateRoute from './PrivateRoute';

/**
 * Wraps PrivateRoute and additionally checks the user's role.
 * Optionally requires a department flag (e.g. requireFlag="has_trainees").
 */
export default function RoleRoute({ roles, requireFlag, children }) {
  return (
    <PrivateRoute>
      <RoleGuard roles={roles} requireFlag={requireFlag}>
        {children}
      </RoleGuard>
    </PrivateRoute>
  );
}

function RoleGuard({ roles, requireFlag, children }) {
  const { user } = useAuth();

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireFlag && !user[requireFlag]) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
