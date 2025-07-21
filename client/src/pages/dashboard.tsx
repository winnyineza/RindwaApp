import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PersonalizedDashboard } from "@/components/dashboard/PersonalizedDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const getTitle = () => {
    switch (user?.role) {
      case 'main_admin':
        return t('systemAnalytics');
      case 'super_admin':
        return t('stationManagement');
      case 'station_admin':
        return t('incidentReporting');
      case 'station_staff':
        return t('myAssignedIncidents');
      default:
        return t('dashboard');
    }
  };

  const getSubtitle = () => {
    const userName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.email ? user.email.split('@')[0] : 'User');
    const orgInfo = user?.organizationName ? ` at ${user.organizationName}` : '';
    const stationInfo = user?.stationName ? ` - ${user.stationName}` : '';
    
    switch (user?.role) {
      case 'main_admin':
        return `${t('welcomeBack')}, ${userName}.\n${t('manageOrganizationsDesc')}`;
      case 'super_admin':
        return `${t('welcomeBack')}, ${userName}${orgInfo}.\n${t('manageStationsDesc')}`;
      case 'station_admin':
        return `${t('welcomeBack')}, ${userName}${orgInfo}${stationInfo}.\n${t('manageIncidentsDesc')}`;
      case 'station_staff':
        return `${t('welcomeBack')}, ${userName}${orgInfo}${stationInfo}.\n${t('viewIncidentsDesc')}`;
      default:
        return `Welcome to Rindwa Admin, ${userName}`;
    }
  };

  return (
    <DashboardLayout title={getTitle()} subtitle={getSubtitle()}>
      <PersonalizedDashboard />
    </DashboardLayout>
  );
}
