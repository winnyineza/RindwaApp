import { useAuth } from '@/hooks/useAuth';
import { MainAdminWidgets } from './widgets/MainAdminWidgets';
import { SuperAdminWidgets } from './widgets/SuperAdminWidgets';
import { StationAdminWidgets } from './widgets/StationAdminWidgets';
import { StationStaffWidgets } from './widgets/StationStaffWidgets';

export const PersonalizedDashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  switch (user.role) {
    case 'main_admin':
      return <MainAdminWidgets />;
    case 'super_admin':
      return <SuperAdminWidgets />;
    case 'station_admin':
      return <StationAdminWidgets />;
    case 'station_staff':
      return <StationStaffWidgets />;
    default:
      return (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <p className="text-gray-500">Dashboard not available for this role</p>
          </div>
        </div>
      );
  }
};