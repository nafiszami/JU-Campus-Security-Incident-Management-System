/**
 * Role-based permissions hook
 * @param {Object} user - Current user object
 * @returns {Object} Permission flags
 */
export function useRole(user) {
  const isAdmin = user?.role === 'Admin';
  const isSecurityOfficer = user?.role === 'Security Officer';
  const isGateOperator = user?.role === 'Gate Operator';
  const isGuard = user?.role === 'Guard';
  const isStudent = user?.role === 'Student';
  const isProctor = user?.role === 'Proctor';

  const canManageUsers = isAdmin;
  const canManageIncidents = isSecurityOfficer || isAdmin;
  const canManageVisitors = isGateOperator || isSecurityOfficer || isAdmin;
  const canManageRestricted = isSecurityOfficer || isAdmin;
  const canScheduleGuards = isSecurityOfficer || isAdmin;
  const canViewAllReports = isSecurityOfficer || isAdmin || isProctor;
  const canSubmitReports = isStudent || isGuard || isGateOperator || isSecurityOfficer || isAdmin;

  return {
    isAdmin,
    isSecurityOfficer,
    isGateOperator,
    isGuard,
    isStudent,
    isProctor,
    canManageUsers,
    canManageIncidents,
    canManageVisitors,
    canManageRestricted,
    canScheduleGuards,
    canViewAllReports,
    canSubmitReports,
  };
}